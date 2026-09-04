import 'server-only';
import {
  AttendanceStatus,
  PaymentStatus,
  PaymentType,
  SessionStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { currentPeriod } from '@/lib/payment-mode';
import { syncMonthlyAttendances } from '@/lib/payments';

/**
 * Weekly recurring sessions + cost-sharing quota (viability) helpers.
 *
 * An Activity that offers the Monthly mode and has a recurring weekday set gets
 * its sessions auto-generated for the current month. Generation is lazy and
 * idempotent — called from the sessions pages on load and by the month-end
 * `/api/cron/generate-sessions` job, so a month rolls over even when nobody
 * opens a page. Sessions are always created and visible; whether the minimum
 * member quota is met is surfaced per session (`getSessionQuotas`), never used
 * to block creation — members could not join a session that does not exist.
 */

/** Default title for auto-generated weekly sessions (admin may edit later). */
const RECURRING_TITLE = 'Sesi Rutin Mingguan';

interface RecurringActivity {
  id: string;
  name: string;
  recurringDay: number | null;
  recurringStartTime: string;
  recurringEndTime: string;
  defaultLocation: string;
  maxPlayers: number;
  sessionFee: number;
}

/** All dates in `now`'s month falling on UTC weekday `day` (0=Sun..6=Sat). */
function weeklyDatesInMonth(day: number, now: Date): Date[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dates: Date[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month, d));
    if (date.getUTCDay() === day) dates.push(date);
  }
  return dates;
}

function sessionKey(activityId: string, date: Date): string {
  return `${activityId}:${date.toISOString().slice(0, 10)}`;
}

/**
 * Ensure this month's weekly sessions exist for every active Activity that
 * offers Monthly and has a recurring weekday. Idempotent: a date that already
 * has ANY session for the Activity is skipped (also when the admin created one
 * by hand), and only today-or-later dates are generated — a missed past week
 * is not backfilled.
 */
export async function ensureRecurringSessions(now = new Date()): Promise<void> {
  const activities: RecurringActivity[] = await prisma.activity.findMany({
    where: { isActive: true, allowsMonthly: true, recurringDay: { not: null } },
    select: {
      id: true,
      name: true,
      recurringDay: true,
      recurringStartTime: true,
      recurringEndTime: true,
      defaultLocation: true,
      maxPlayers: true,
      sessionFee: true,
    },
  });
  if (activities.length === 0) return;

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const existing = await prisma.activitySession.findMany({
    where: {
      activityId: { in: activities.map((e) => e.id) },
      date: { gte: monthStart, lt: nextMonthStart },
    },
    select: { activityId: true, date: true },
  });
  const taken = new Set(existing.map((s) => sessionKey(s.activityId, s.date)));

  const creates = activities.flatMap((activity) =>
    weeklyDatesInMonth(activity.recurringDay!, now)
      .filter((date) => date >= todayUtc)
      .filter((date) => !taken.has(sessionKey(activity.id, date)))
      .map((date) => ({
        activityId: activity.id,
        title: RECURRING_TITLE,
        date,
        startTime: activity.recurringStartTime,
        endTime: activity.recurringEndTime,
        location: activity.defaultLocation,
        maxPlayers: activity.maxPlayers,
        fee: activity.sessionFee,
        status: SessionStatus.SCHEDULED,
      })),
  );
  if (creates.length > 0) {
    await prisma.activitySession.createMany({ data: creates });
  }

  // A paid month buys the whole month: members whose dues for this period are
  // already in (PENDING/CONFIRMED) get seats in the freshly generated sessions
  // too. Runs even when nothing was created — idempotent, and it also repairs
  // gaps (e.g. dues paid before the sessions existed).
  const { month, year } = currentPeriod(now);
  for (const activity of activities) {
    await syncMonthlyAttendances({ activityId: activity.id, month, year });
  }
}

/** Per-session cost-sharing quota: who has committed vs the required minimum. */
export interface SessionQuota {
  /** Monthly-equivalent commitment: monthly seats + per-session seats / 2. */
  committed: number;
  /** The Activity's `minMembers`; 0 means no quota applies. */
  needed: number;
  /** `committed >= needed` (always true when no quota applies). */
  isMet: boolean;
}

interface QuotaSession {
  id: string;
  activityId: string;
}

/**
 * `minMembers` is calibrated against MONTHLY dues (rent / monthly fee), so a
 * per-session joiner — who only funds this one session — counts as half a
 * monthly member: it takes two of them to fill one quota slot.
 */
const PER_SESSION_QUOTA_DIVISOR = 2;

/**
 * Resolve the cost-sharing quota for each session. Every seat is
 * payment-backed (monthly dues uploaded, or per-session pre-pay), so seats are
 * read from seat-holding attendances (REGISTERED/PRESENT) and split by payer
 * type: a seat with a live SESSION payment is a per-session joiner (weight ½),
 * everything else is a monthly member (weight 1).
 */
export async function getSessionQuotas(
  sessions: QuotaSession[],
): Promise<Map<string, SessionQuota>> {
  const quotas = new Map<string, SessionQuota>();
  if (sessions.length === 0) return quotas;

  const activityIds = [...new Set(sessions.map((s) => s.activityId))];
  const sessionIds = sessions.map((s) => s.id);
  const [activities, seats, sessionPayments] = await Promise.all([
    prisma.activity.findMany({
      where: { id: { in: activityIds } },
      select: { id: true, minMembers: true },
    }),
    prisma.attendance.findMany({
      where: {
        sessionId: { in: sessionIds },
        status: { in: [AttendanceStatus.REGISTERED, AttendanceStatus.PRESENT] },
      },
      select: { sessionId: true, userId: true },
    }),
    prisma.payment.findMany({
      where: {
        sessionId: { in: sessionIds },
        type: PaymentType.SESSION,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CONFIRMED] },
      },
      select: { sessionId: true, userId: true },
    }),
  ]);

  const activityById = new Map(activities.map((e) => [e.id, e]));
  const perSessionPayers = new Set(
    sessionPayments.map((p) => `${p.sessionId}:${p.userId}`),
  );

  for (const session of sessions) {
    const activity = activityById.get(session.activityId);
    if (!activity) continue;
    const attendees = seats.filter((a) => a.sessionId === session.id);
    const perSessionCount = attendees.filter((a) =>
      perSessionPayers.has(`${a.sessionId}:${a.userId}`),
    ).length;
    const monthlyCount = attendees.length - perSessionCount;
    const committed =
      monthlyCount + Math.floor(perSessionCount / PER_SESSION_QUOTA_DIVISOR);
    const needed = activity.minMembers;
    quotas.set(session.id, { committed, needed, isMet: committed >= needed });
  }
  return quotas;
}

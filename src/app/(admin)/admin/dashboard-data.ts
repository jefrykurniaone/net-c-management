import 'server-only';
import { startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import type { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActivities } from '@/lib/activity';
import { currentPeriod, type BillingPeriod } from '@/lib/billing-period';
import {
    countMonthlyMemberships,
    sumDuesForPeriod,
    type DuesTotalActivity,
} from './dashboard-dues-total';

/**
 * Everything the admin dashboard reads. The "Dues collected" tile's two money
 * figures mean exactly this, and did not before #203: `collected` excludes
 * Confirmed `SESSION` Payments, because a Fee is not a Due; `totalDue` prices
 * only the Memberships `resolvePaymentMode` calls `MONTHLY` for this Period,
 * not every live Membership. Both are the figures the Dues chart already shows.
 */

const UNDER_BOOKED_RATIO = 0.6;

/**
 * The attendance states that are history — a Session that has been and what
 * became of each Seat. `PRESENT` and `ABSENT` (Opted Out) were the two; `NO_SHOW`
 * is the third, and a Seat held that nobody turned up for is as much a fact
 * about a past Session as the other two. The attendance rate below is `PRESENT`
 * over all three.
 */
const HISTORICAL_ATTENDANCE: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'NO_SHOW'];

export interface UnderBookedSession {
    readonly id: string;
    readonly title: string;
    readonly date: Date;
    readonly attendances: number;
    readonly maxPlayers: number;
}

export interface ActivityCardData {
    readonly id: string;
    readonly name: string;
    /** Every active Membership, whatever mode it is on — a roster headcount. */
    readonly members: number;
    /** Of those, the ones that owe Dues this Period — what `confirmed` counts against. */
    readonly duesMembers: number;
    readonly confirmed: number;
    /** Percent, 0-100, rounded. `null` when no historical attendance exists yet. */
    readonly attendanceRate: number | null;
    readonly sessionsPerWeek: number;
    /**
     * Percent, 0-100 — the ceiling is `confirmed`'s own cap, not a second clamp
     * over a denominator that disagrees with it (#273). `0` where no Membership
     * owes Dues this Period: nothing was collected because nothing was owed,
     * and the `confirmed`/`duesMembers` pair beside the bar says so as `0/0`,
     * where a full bar would claim a collection that never happened.
     */
    readonly duesPct: number;
}

export interface DashboardData {
    readonly activeMembers: number;
    readonly newThisMonth: number;
    readonly sessionsThisWeekCount: number;
    readonly activitiesCount: number;
    readonly pendingPayments: number;
    readonly collected: number;
    readonly totalDue: number;
    readonly currentMonth: number;
    readonly underBooked: UnderBookedSession | null;
    readonly activityCards: readonly ActivityCardData[];
}

/** The eleven parallel queries the dashboard reads, before any derived figure is built. */
async function fetchDashboardRows(now: Date, period: BillingPeriod) {
    const { month: currentMonth, year: currentYear } = period;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const [
        activeMembers,
        newThisMonth,
        pendingPayments,
        collectedAgg,
        activities,
        duesActivities,
        confirmedByActivity,
        sessionsThisWeekCount,
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    ] = await Promise.all([
        prisma.user.count({ where: { isActive: true, isProfileComplete: true } }),
        prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        // Dues collected, so Dues Payments alone. A Confirmed SESSION Payment
        // is a Fee for one Seat in one Session and no part of what this figure
        // asks about; summing it showed collection running ahead of the
        // obligation it is drawn against (#203). Same exclusion the
        // per-Activity count below carries, and the same one the Dues chart
        // applies in `collectedForPeriod`.
        prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: 'CONFIRMED',
                type: 'MONTHLY',
                month: currentMonth,
                year: currentYear,
            },
        }),
        getActivities(),
        // Everything the owed figure resolves through, per Activity, read as
        // rows rather than as figures. Which rate prices this Period is
        // `resolveDuesRate`'s to say and no order is assumed of them; which
        // Memberships owe Dues at all is `resolvePaymentMode`'s, which is why
        // the mode columns and the offered pair come back instead of a
        // `_count` that could only answer "how many members".
        prisma.activity.findMany({
            where: { isActive: true },
            select: {
                id: true,
                allowsMonthly: true,
                allowsPerSession: true,
                duesRates: { select: { amount: true, effectiveFrom: true } },
                memberships: {
                    where: { isActive: true },
                    select: {
                        paymentMode: true,
                        effectiveFrom: true,
                        pendingMode: true,
                        pendingEffectiveFrom: true,
                    },
                },
            },
        }),
        // Only MONTHLY dues count toward "dues collected" — a per-session
        // (SESSION) payment is not a monthly due and would otherwise push the
        // count above the member total (OBS-01: "22/21").
        prisma.payment.groupBy({
            by: ['activityId'],
            where: {
                status: 'CONFIRMED',
                type: 'MONTHLY',
                month: currentMonth,
                year: currentYear,
            },
            _count: true,
        }),
        // The tile figure: every non-cancelled Session in the week. Its own
        // query rather than a `.length` of the `findMany` below, because that
        // one is read for a different purpose (per-Activity aggregation) and
        // the tile must not depend on what that purpose happens to fetch (#189).
        prisma.activitySession.count({
            where: {
                date: { gte: weekStart, lte: weekEnd },
                status: { not: 'CANCELLED' },
            },
        }),
        // Feeds `weeklyCounts` below — one entry per Session, grouped by
        // Activity — so this carries no page size. Selects only `activityId`,
        // the one field the grouping reads; a `Map` accumulation does not
        // depend on row order either, so no `orderBy`.
        prisma.activitySession.findMany({
            where: {
                date: { gte: weekStart, lte: weekEnd },
                status: { not: 'CANCELLED' },
            },
            select: { activityId: true },
        }),
        prisma.activitySession.findMany({
            where: {
                date: { gte: startOfToday },
                status: { in: ['SCHEDULED', 'ONGOING'] },
            },
            orderBy: { date: 'asc' },
            take: 20,
            include: {
                _count: {
                    select: {
                        attendances: {
                            where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                        },
                    },
                },
            },
        }),
        prisma.attendance.findMany({
            where: {
                status: { in: HISTORICAL_ATTENDANCE },
                session: { date: { gte: monthStart, lte: now } },
            },
            select: { status: true, session: { select: { activityId: true } } },
        }),
    ]);

    return {
        activeMembers,
        newThisMonth,
        pendingPayments,
        collectedAgg,
        activities,
        duesActivities,
        confirmedByActivity,
        sessionsThisWeekCount,
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    };
}

type DashboardRows = Awaited<ReturnType<typeof fetchDashboardRows>>;

/**
 * Per Activity, how many of its Memberships owe Dues in `period` — the only
 * denominator a Dues figure may be read against.
 *
 * Counted by the same `countMonthlyMemberships` that `sumDuesForPeriod` prices
 * `totalDue` through, off the same rows, so a card and the tile can never
 * disagree about who owes: two derivations of that question would be a worse
 * defect than the headcount denominator this replaces (#273).
 */
function duesMemberCountsByActivity(
    activities: readonly DuesTotalActivity[],
    period: BillingPeriod,
): Map<string, number> {
    return new Map(
        activities.map((a) => [a.id, countMonthlyMemberships(a, period)]),
    );
}

/** The maps, totals and per-Activity figures the page draws, from the rows above. */
function deriveDashboardData(rows: DashboardRows, period: BillingPeriod): DashboardData {
    const {
        activeMembers,
        newThisMonth,
        pendingPayments,
        collectedAgg,
        activities,
        duesActivities,
        confirmedByActivity,
        sessionsThisWeekCount,
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    } = rows;

    // Two questions off the rows the tile already read, and a card asks both.
    // `memberCounts` is the roster headcount every live Membership is in,
    // whatever mode it is on, and is what the card labels "members".
    // `duesMemberCounts` is who owes Dues this Period, and is the only one of
    // the two a Dues figure may be divided by (#273).
    const memberCounts = new Map(
        duesActivities.map((a) => [a.id, a.memberships.length]),
    );
    const duesMemberCounts = duesMemberCountsByActivity(duesActivities, period);
    const confirmedCounts = new Map(
        confirmedByActivity.map((r) => [r.activityId, r._count]),
    );
    const weeklyCounts = new Map<string, number>();
    for (const s of sessionsThisWeek) {
        weeklyCounts.set(s.activityId, (weeklyCounts.get(s.activityId) ?? 0) + 1);
    }
    const attendance = new Map<string, { present: number; total: number }>();
    for (const row of attendanceRows) {
        const id = row.session.activityId;
        const cur = attendance.get(id) ?? { present: 0, total: 0 };
        cur.total += 1;
        if (row.status === 'PRESENT') cur.present += 1;
        attendance.set(id, cur);
    }

    const collected = collectedAgg._sum.amount ?? 0;
    const totalDue = sumDuesForPeriod(duesActivities, period);
    const underBookedRow = underBookedSession.find(
        (s) => s._count.attendances < s.maxPlayers * UNDER_BOOKED_RATIO,
    );
    const underBooked: UnderBookedSession | null = underBookedRow
        ? {
              id: underBookedRow.id,
              title: underBookedRow.title,
              date: underBookedRow.date,
              attendances: underBookedRow._count.attendances,
              maxPlayers: underBookedRow.maxPlayers,
          }
        : null;

    const activityCards: ActivityCardData[] = activities.map((a) => {
        const members = memberCounts.get(a.id) ?? 0;
        const duesMembers = duesMemberCounts.get(a.id) ?? 0;
        // Cap at the Memberships that owe: a lingering confirmed payment from a
        // member who has since left must not read as "more collected than owed".
        const confirmed = Math.min(confirmedCounts.get(a.id) ?? 0, duesMembers);
        const att = attendance.get(a.id);
        const attendanceRate =
            att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
        return {
            id: a.id,
            name: a.name,
            members,
            duesMembers,
            confirmed,
            attendanceRate,
            sessionsPerWeek: weeklyCounts.get(a.id) ?? 0,
            duesPct: duesMembers > 0 ? (confirmed / duesMembers) * 100 : 0,
        };
    });

    return {
        activeMembers,
        newThisMonth,
        sessionsThisWeekCount,
        activitiesCount: activities.length,
        pendingPayments,
        collected,
        totalDue,
        currentMonth: period.month,
        underBooked,
        activityCards,
    };
}

/** The dashboard's whole read: the rows, then the maps and totals built from them. */
export async function loadDashboardData(now: Date): Promise<DashboardData> {
    const period = currentPeriod(now);
    const rows = await fetchDashboardRows(now, period);
    return deriveDashboardData(rows, period);
}

import 'server-only';
import { startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import type { AttendanceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getActivities } from '@/lib/activity';
import { currentPeriod, type BillingPeriod } from '@/lib/billing-period';
import { sumDuesForPeriod } from './dashboard-dues-total';

/**
 * Everything the admin dashboard reads, moved here from the page by ticket
 * #165, which restyled the cards without recomputing a single figure.
 *
 * That move changed nothing. #203 does: the "Dues collected" tile's two money
 * figures did not mean what their labels said, and both are corrected here.
 * `collected` now excludes Confirmed `SESSION` Payments, because a Fee is not a
 * Due; `totalDue` now prices only the Memberships `resolvePaymentMode` calls
 * `MONTHLY` for this Period, instead of every live Membership. So those two are
 * deliberately no longer the figures `main` showed before #203 on the same seed
 * — they are the ones the Dues chart (#170) has always shown. Every other
 * figure below is still the page's own, unchanged.
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
    readonly members: number;
    readonly confirmed: number;
    /** Percent, 0-100, rounded. `null` when no historical attendance exists yet. */
    readonly attendanceRate: number | null;
    readonly sessionsPerWeek: number;
    /** Percent, 0-100, capped at 100. */
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

/** The ten parallel queries the dashboard reads, before any derived figure is built. */
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
        prisma.activitySession.findMany({
            where: {
                date: { gte: weekStart, lte: weekEnd },
                status: { not: 'CANCELLED' },
            },
            orderBy: { date: 'asc' },
            take: 6,
            include: {
                activity: { select: { name: true } },
                _count: {
                    select: {
                        attendances: {
                            where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                        },
                    },
                },
            },
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
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    };
}

type DashboardRows = Awaited<ReturnType<typeof fetchDashboardRows>>;

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
        sessionsThisWeek,
        underBookedSession,
        attendanceRows,
    } = rows;

    // The cards' headcount: every live Membership, whatever mode it is on.
    // A different question from `totalDue` below — the cards count members,
    // the tile prices Dues — answered off the same rows rather than a second
    // query that would read them again.
    const memberCounts = new Map(
        duesActivities.map((a) => [a.id, a.memberships.length]),
    );
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
        // Cap at the member total: a lingering confirmed payment from a member
        // who has since left must not read as "more collected than owed".
        const confirmed = Math.min(confirmedCounts.get(a.id) ?? 0, members);
        const att = attendance.get(a.id);
        const attendanceRate =
            att && att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
        return {
            id: a.id,
            name: a.name,
            members,
            confirmed,
            attendanceRate,
            sessionsPerWeek: weeklyCounts.get(a.id) ?? 0,
            duesPct: members > 0 ? Math.min((confirmed / members) * 100, 100) : 0,
        };
    });

    return {
        activeMembers,
        newThisMonth,
        sessionsThisWeekCount: sessionsThisWeek.length,
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

import 'server-only';
import { prisma } from '@/lib/prisma';
import { getUserActivityIds } from '@/lib/activity';
import { getOutstandingSessionBills } from '@/lib/payments';
import { getDashboardSessionsBoard } from '@/lib/dashboard-sessions';
import { currentPeriod, type BillingPeriod } from '@/lib/payment-mode';

/**
 * Every read the member dashboard makes, in one batch.
 *
 * **Why the reads live here rather than in the page.** The page is a
 * composition of named sections; the batch is a single unit of its own, and
 * the one thing that must never be split up. Production caps the pool at one
 * connection per serverless function (`src/lib/prisma.ts`), so pulling any of
 * these queries down into the section that draws it would turn one batched
 * round trip into several against a pool of one. Keeping the batch whole and
 * whole *here* is what makes the sections safe to extract at all.
 *
 * The sweep (`releaseExpiredHolds`) is deliberately **not** in this module: it
 * is a write, it must run before these reads, and the page keeps that ordering
 * visible at its top rather than hiding it behind a loader named for reads.
 */

/** Who the dashboard is drawn for, and the instants its counts are measured against. */
export interface MemberDashboardWindow {
    readonly userId: string;
    readonly now: Date;
    /** Local midnight — a Session from here on is "upcoming". */
    readonly today: Date;
    /** First instant of the current Billing Period's month. */
    readonly monthStart: Date;
    /** The Billing Period containing {@link now}. */
    readonly period: BillingPeriod;
}

/**
 * The window the dashboard reads against. `currentPeriod` is the only place the
 * month/year of an instant is derived (`src/lib/billing-period.ts`), so the
 * Dues Rate lookup and the header's month label cannot drift apart.
 */
export function memberDashboardWindow(
    userId: string,
    now: Date,
): MemberDashboardWindow {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const period = currentPeriod(now);
    return {
        userId,
        now,
        today,
        monthStart: new Date(period.year, period.month - 1, 1),
        period,
    };
}

export type MemberDashboardData = Awaited<ReturnType<typeof loadMemberDashboard>>;

/**
 * The dashboard's reads. `getUserActivityIds` runs first because every count
 * below is scoped by it; everything else goes in one `Promise.all`, exactly as
 * the page used to run it.
 */
export async function loadMemberDashboard(w: MemberDashboardWindow) {
    const { userId, now, today, monthStart, period } = w;
    const myActivityIds = await getUserActivityIds(userId);

    const [
        memberships,
        upcomingCount,
        monthPayments,
        attendanceCount,
        totalSessions,
        outstandingBills,
        dashboardBoard,
    ] = await Promise.all([
        prisma.membership.findMany({
            where: { userId, isActive: true, activity: { isActive: true } },
            select: {
                paymentMode: true,
                effectiveFrom: true,
                pendingMode: true,
                pendingEffectiveFrom: true,
                activity: {
                    select: {
                        id: true,
                        name: true,
                        icon: true,
                        duesRates: { select: { amount: true, effectiveFrom: true } },
                        allowsMonthly: true,
                        allowsPerSession: true,
                    },
                },
            },
        }),
        prisma.activitySession.count({
            where: {
                activityId: { in: myActivityIds },
                date: { gte: today },
                status: { in: ['SCHEDULED', 'ONGOING'] },
            },
        }),
        prisma.payment.findMany({
            where: {
                userId,
                month: period.month,
                year: period.year,
                type: 'MONTHLY',
                activityId: { in: myActivityIds },
            },
            select: { activityId: true, status: true, amount: true },
        }),
        prisma.attendance.count({
            where: {
                userId,
                status: 'PRESENT',
                session: {
                    activityId: { in: myActivityIds },
                    date: { gte: monthStart, lte: now },
                },
            },
        }),
        // Attendance rate measures sessions that have already happened this
        // month — cap the denominator at `now` so upcoming sessions (which
        // nobody can have attended yet) don't drag the percentage down.
        prisma.activitySession.count({
            where: {
                activityId: { in: myActivityIds },
                date: { gte: monthStart, lte: now },
                status: { not: 'CANCELLED' },
            },
        }),
        getOutstandingSessionBills({ userId }),
        getDashboardSessionsBoard({ userId, activityIds: myActivityIds, now }),
    ]);

    return {
        memberships,
        upcomingCount,
        monthPayments,
        attendanceCount,
        totalSessions,
        outstandingBills,
        dashboardBoard,
    };
}

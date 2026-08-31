import { auth } from '@/lib/auth';
import { COLUMN_MEASURE } from '@/components/layout/measure';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Shapes } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getUserActivityIds } from '@/lib/activity';
import { currentPeriod, resolvePaymentMode } from '@/lib/payment-mode';
import { resolveDuesRate } from '@/lib/dues-rate';
import { findDuesChangeNotices } from '@/lib/dues-notice';
import { getOutstandingSessionBills } from '@/lib/payments';
import { releaseExpiredHolds } from '@/lib/holds';
import { getDashboardSessionsBoard } from '@/lib/dashboard-sessions';
import { DuesBanner } from '@/components/dashboard/dues-banner';
import { ActivitySummaryCard } from '@/components/dashboard/activity-summary-card';
import {
    dashboardActivityCards,
    type DashboardCardContext,
} from '@/components/dashboard/activity-card-view';

export default async function DashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const userId = session.user.id;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, now.getMonth(), 1);

    // Release lapsed reservation holds before deriving dues + session counts.
    await releaseExpiredHolds();
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
                month: currentMonth,
                year: currentYear,
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

    const attendanceRate =
        totalSessions > 0
            ? Math.round((attendanceCount / totalSessions) * 100)
            : 0;
    const myActivities = memberships
        .map((m) => m.activity)
        .sort((a, b) => a.name.localeCompare(b.name));
    const period = currentPeriod(now);
    // No rate covering the Period is a broken invariant (dues-rate.ts) — read
    // like the "no fee set" branch below, never a free Period.
    const duesAmountByActivity = new Map(
        memberships.map((m) => [
            m.activity.id,
            resolveDuesRate(m.activity.duesRates, period) ?? 0,
        ]),
    );
    // What each Activity bills this member by — Monthly, Per-Session, or not
    // yet chosen — resolved once so the header chip (#160) and the Monthly-dues
    // filter below read the same answer.
    const paymentModeByActivity = new Map(
        memberships.map((m) => [
            m.activity.id,
            resolvePaymentMode(
                m,
                {
                    allowsMonthly: m.activity.allowsMonthly,
                    allowsPerSession: m.activity.allowsPerSession,
                },
                currentMonth,
                currentYear,
            ),
        ]),
    );
    // Activities the member owes MONTHLY dues on this period (mode-resolved, fee
    // set). PER_SESSION / unselected memberships are billed elsewhere / not yet.
    const monthlyActivityIds = new Set(
        myActivities
            .filter(
                (a) =>
                    paymentModeByActivity.get(a.id) === 'MONTHLY' &&
                    (duesAmountByActivity.get(a.id) ?? 0) > 0,
            )
            .map((a) => a.id),
    );
    const paymentByActivity = new Map(monthPayments.map((p) => [p.activityId, p]));
    // A CONFIRMED payment is settled; a PENDING one is in review (member already
    // acted) — neither counts as an unpaid due that still needs the member's
    // attention, so both drop out of the banner/count (matches /payments).
    const unpaidMonthly = myActivities.filter((a) => {
        if (!monthlyActivityIds.has(a.id)) return false;
        const status = paymentByActivity.get(a.id)?.status;
        return status !== 'CONFIRMED' && status !== 'PENDING';
    });
    const firstUnpaidActivity = unpaidMonthly[0];
    const firstUnpaid = firstUnpaidActivity
        ? {
              name: firstUnpaidActivity.name,
              duesAmount: duesAmountByActivity.get(firstUnpaidActivity.id) ?? 0,
          }
        : undefined;
    const duesCount = unpaidMonthly.length + outstandingBills.length;
    // A queued Dues change, for the Activities where this member is billed
    // Monthly for the month it starts. Nothing is stored and nothing clears it:
    // the sentence stops the Period it arrives, because the resolver stops
    // calling an arrived change a change (`src/lib/dues-notice.ts`).
    const duesChangeNotices = findDuesChangeNotices(memberships, now);

    const boardsByActivity = new Map(
        dashboardBoard.boards.map((board) => [board.activityId, board]),
    );
    const cardContext: DashboardCardContext = {
        t,
        seatsBySession: dashboardBoard.seatsBySession,
        ownBySession: dashboardBoard.ownBySession,
        holdBySession: dashboardBoard.holdBySession,
        duesCoveredSessionIds: dashboardBoard.duesCoveredSessionIds,
        now,
    };

    return (
        <div className={`${COLUMN_MEASURE} space-y-6`}>
            {/* Page header */}
            <div className='space-y-0.5'>
                <p className='text-xs font-medium text-muted-foreground uppercase tracking-[0.08em]'>
                    {format(now, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                </p>
                <h1 className='text-2xl font-bold text-foreground'>
                    {t.dashboard.welcomeGreeting}{' '}
                    {session.user.name?.split(' ')[0]}
                </h1>
            </div>

            <DuesBanner
                firstUnpaid={firstUnpaid}
                outstandingCount={outstandingBills.length}
                notices={duesChangeNotices}
                monthLabel={t.months[currentMonth]}
                t={t}
            />

            {/* Summary strip. Stacked below `sm` (640px): three equal columns at
                390px have no room for the longer of the two locales' tracked-caps
                labels — `MENDATANG`/`KEHADIRAN` clip mid-word there — so each card
                takes the full row until there is width to share, matching the
                breakpoint `StatCardsSkeleton` already uses while this loads. */}
            <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4'>
                <StatCard
                    label={t.dashboard.attendanceTitle}
                    value={`${attendanceRate}%`}
                    sub={t.dashboard.thisMonth}
                />
                <StatCard
                    label={t.dashboard.upcomingLabel}
                    value={upcomingCount}
                    sub={t.dashboard.sessions}
                />
                <StatCard
                    label={t.dashboard.duesTitle}
                    value={
                        <span className={duesCount > 0 ? 'text-warning' : ''}>
                            {duesCount}
                        </span>
                    }
                    sub={t.dashboard.unpaid}
                />
            </div>

            {/* Per-activity sections */}
            {myActivities.length === 0 ? (
                <EmptyState
                    icon={Shapes}
                    chipLabel={t.common.empty}
                    title={t.activity.noneJoined}
                    action={
                        <Link href='/sessions'>
                            <Button variant='outline' size='sm'>
                                {t.activity.join}
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <div className='space-y-4'>
                    <div className='flex items-baseline justify-between'>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                            {t.dashboard.yourActivities}
                        </p>
                        <Link
                            href='/sessions'
                            className='text-xs font-semibold text-primary hover:underline'>
                            {t.dashboard.viewAllShort}
                        </Link>
                    </div>
                    {myActivities.map((activity) => {
                        const board = boardsByActivity.get(activity.id);
                        const cards = dashboardActivityCards(
                            board?.days ?? [],
                            cardContext,
                        );
                        return (
                            <ActivitySummaryCard
                                key={activity.id}
                                activity={{
                                    id: activity.id,
                                    name: activity.name,
                                    icon: activity.icon ?? null,
                                }}
                                paymentMode={paymentModeByActivity.get(activity.id) ?? null}
                                cards={cards}
                                t={t}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

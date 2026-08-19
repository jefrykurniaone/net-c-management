import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Shapes, AlertTriangle } from 'lucide-react';
import { Mark } from '@/components/ui/mark';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivityInitial } from '@/components/activity/activity-badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getUserActivityIds } from '@/lib/activity';
import { resolvePaymentMode } from '@/lib/payment-mode';
import { getOutstandingSessionBills } from '@/lib/payments';
import { releaseExpiredHolds } from '@/lib/holds';
import { MoneyMark } from '@/components/dashboard/money-mark';

const UPCOMING_PER_ACTIVITY = 3;

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

    const [memberships, upcomingSessions, monthPayments, attendanceCount, totalSessions, outstandingBills] =
        await Promise.all([
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
                            monthlyFee: true,
                            allowsMonthly: true,
                            allowsPerSession: true,
                        },
                    },
                },
            }),
            prisma.activitySession.findMany({
                where: {
                    activityId: { in: myActivityIds },
                    date: { gte: today },
                    status: { in: ['SCHEDULED', 'ONGOING'] },
                },
                orderBy: { date: 'asc' },
                include: {
                    activity: { select: { id: true, name: true } },
                    attendances: {
                        where: {
                            userId,
                            status: { in: ['REGISTERED', 'PRESENT'] },
                        },
                        select: { status: true },
                    },
                    _count: {
                        select: {
                            attendances: {
                                where: {
                                    status: { in: ['REGISTERED', 'PRESENT'] },
                                },
                            },
                        },
                    },
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
        ]);

    const attendanceRate =
        totalSessions > 0
            ? Math.round((attendanceCount / totalSessions) * 100)
            : 0;
    const myActivities = memberships
        .map((m) => m.activity)
        .sort((a, b) => a.name.localeCompare(b.name));
    // Activities the member owes MONTHLY dues on this period (mode-resolved, fee
    // set). PER_SESSION / unselected memberships are billed elsewhere / not yet.
    const monthlyActivityIds = new Set(
        memberships
            .filter(
                (m) =>
                    resolvePaymentMode(
                        m,
                        {
                            allowsMonthly: m.activity.allowsMonthly,
                            allowsPerSession: m.activity.allowsPerSession,
                        },
                        currentMonth,
                        currentYear,
                    ) === 'MONTHLY' && m.activity.monthlyFee > 0,
            )
            .map((m) => m.activity.id),
    );
    const paymentByActivity = new Map(monthPayments.map((p) => [p.activityId, p]));
    const billsByActivity = new Map<string, number>();
    for (const bill of outstandingBills) {
        billsByActivity.set(bill.activity.id, (billsByActivity.get(bill.activity.id) ?? 0) + 1);
    }
    const upcomingCount = upcomingSessions.length;
    // A CONFIRMED payment is settled; a PENDING one is in review (member already
    // acted) — neither counts as an unpaid due that still needs the member's
    // attention, so both drop out of the banner/count (matches /payments).
    const unpaidMonthly = myActivities.filter((a) => {
        if (!monthlyActivityIds.has(a.id)) return false;
        const status = paymentByActivity.get(a.id)?.status;
        return status !== 'CONFIRMED' && status !== 'PENDING';
    });
    const firstUnpaid = unpaidMonthly[0];
    const duesCount = unpaidMonthly.length + outstandingBills.length;

    return (
        <div className='space-y-6'>
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

            {/* Dues alert banner — monthly dues take priority; otherwise surface
                any per-session reservations still awaiting payment. */}
            {firstUnpaid ? (
                <Link
                    href='/payments/upload'
                    className='flex items-center gap-3 rounded-xl border border-warning-soft-border bg-warning-soft px-3.5 py-3 hover:bg-warning-soft/80 transition-colors'>
                    <AlertTriangle className='size-[18px] shrink-0 text-warning-soft-foreground' />
                    <div className='min-w-0 flex-1'>
                        <p className='truncate text-[13px] font-semibold text-warning-soft-foreground'>
                            {firstUnpaid.name} {t.dashboard.duesUnpaidBanner}
                        </p>
                        <p className='truncate text-xs text-warning-soft-foreground/80'>
                            {t.months[currentMonth]} · Rp{' '}
                            {firstUnpaid.monthlyFee.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <span className='shrink-0 rounded-lg bg-warning-solid px-3 py-1.5 text-xs font-semibold text-warning-solid-foreground'>
                        {t.dashboard.payNow}
                    </span>
                </Link>
            ) : outstandingBills.length > 0 ? (
                <Link
                    href='/payments'
                    className='flex items-center gap-3 rounded-xl border border-warning-soft-border bg-warning-soft px-3.5 py-3 hover:bg-warning-soft/80 transition-colors'>
                    <AlertTriangle className='size-[18px] shrink-0 text-warning-soft-foreground' />
                    <div className='min-w-0 flex-1'>
                        <p className='truncate text-[13px] font-semibold text-warning-soft-foreground'>
                            {t.dashboard.reservationsToPay.replace(
                                '{n}',
                                String(outstandingBills.length),
                            )}
                        </p>
                        <p className='truncate text-xs text-warning-soft-foreground/80'>
                            {t.dashboard.reservationsToPaySub}
                        </p>
                    </div>
                    <span className='shrink-0 rounded-lg bg-warning-solid px-3 py-1.5 text-xs font-semibold text-warning-solid-foreground'>
                        {t.dashboard.payNow}
                    </span>
                </Link>
            ) : null}

            {/* Summary strip */}
            <div className='grid grid-cols-3 gap-2.5 sm:gap-4'>
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
                        const sessions = upcomingSessions
                            .filter((s) => s.activityId === activity.id)
                            .slice(0, UPCOMING_PER_ACTIVITY);
                        const payment = paymentByActivity.get(activity.id);
                        const isMonthlyDue = monthlyActivityIds.has(activity.id);
                        const outstanding = billsByActivity.get(activity.id) ?? 0;
                        return (
                            <div
                                key={activity.id}
                                className='bg-card rounded-xl border border-border overflow-hidden'>
                                <div className='flex items-center gap-2.5 p-4 pb-3'>
                                    <ActivityInitial name={activity.name} />
                                    <span className='flex-1 text-[15px] font-semibold text-foreground truncate'>
                                        {activity.name}
                                    </span>
                                    <MoneyMark
                                        isMonthlyDue={isMonthlyDue}
                                        paymentStatus={payment?.status}
                                        outstanding={outstanding}
                                        t={t}
                                    />
                                </div>
                                <div className='px-4 pb-4 space-y-2'>
                                    {sessions.length === 0 ? (
                                        <p className='text-sm text-muted-foreground py-2'>
                                            {t.dashboard.noUpcoming}
                                        </p>
                                    ) : (
                                        sessions.map((s) => {
                                            const isRegistered =
                                                s.attendances.length > 0;
                                            return (
                                                <Link
                                                    key={s.id}
                                                    href={`/sessions/${s.id}`}
                                                    className='flex items-center gap-3 rounded-sm bg-muted/60 p-2.5 pr-3 hover:bg-accent transition-colors'>
                                                    <span className='flex w-10 shrink-0 flex-col items-center'>
                                                        <span className='text-[10px] font-semibold uppercase text-primary'>
                                                            {format(
                                                                new Date(s.date),
                                                                'EEE',
                                                                { locale: dateLocale },
                                                            )}
                                                        </span>
                                                        <span className='text-[17px] font-bold text-foreground leading-tight'>
                                                            {format(
                                                                new Date(s.date),
                                                                'dd',
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span className='min-w-0 flex-1'>
                                                        <span className='block text-sm font-semibold text-foreground truncate'>
                                                            {s.title}
                                                        </span>
                                                        <span className='block text-xs text-muted-foreground truncate'>
                                                            {s.startTime}
                                                            {s.location
                                                                ? ` · ${s.location}`
                                                                : ''}
                                                        </span>
                                                    </span>
                                                    {isRegistered ? (
                                                        <Mark
                                                            kind='ink'
                                                            className='shrink-0'>
                                                            {t.dashboard.going}
                                                        </Mark>
                                                    ) : (
                                                        <Mark
                                                            kind='blank'
                                                            className='shrink-0'>
                                                            {t.dashboard.rsvp}
                                                        </Mark>
                                                    )}
                                                </Link>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { Shapes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ActivityInitial } from '@/components/activity/activity-badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getUserActivityIds } from '@/lib/activity';
import { sessionStatusVariant, paymentStatusVariant } from '@/lib/utils';

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
    const yearStart = new Date(`${currentYear}-01-01`);
    const yearEnd = new Date(`${currentYear}-12-31`);

    const myActivityIds = await getUserActivityIds(userId);

    const [myActivities, upcomingSessions, monthPayments, attendanceCount, totalSessions] =
        await Promise.all([
            prisma.activity.findMany({
                where: { id: { in: myActivityIds }, isActive: true },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, color: true },
            }),
            prisma.activitySession.findMany({
                where: {
                    activityId: { in: myActivityIds },
                    date: { gte: today },
                    status: { in: ['SCHEDULED', 'ONGOING'] },
                },
                orderBy: { date: 'asc' },
                include: {
                    activity: { select: { id: true, name: true, color: true } },
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
                        date: { gte: yearStart, lte: yearEnd },
                    },
                },
            }),
            prisma.activitySession.count({
                where: {
                    activityId: { in: myActivityIds },
                    date: { gte: yearStart, lte: yearEnd },
                    status: { not: 'CANCELLED' },
                },
            }),
        ]);

    const attendanceRate =
        totalSessions > 0
            ? Math.round((attendanceCount / totalSessions) * 100)
            : 0;
    const paymentByActivity = new Map(monthPayments.map((p) => [p.activityId, p]));
    const paidCount = monthPayments.filter(
        (p) => p.status === 'CONFIRMED',
    ).length;

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

            {/* Summary strip */}
            <div className='grid grid-cols-3 gap-2.5 sm:gap-4'>
                <StatCard
                    label={`${t.dashboard.duesTitle} ${t.months[currentMonth]}`}
                    value={
                        <>
                            {paidCount}
                            <span className='text-sm font-normal text-subtle-foreground'>
                                /{myActivities.length}
                            </span>
                        </>
                    }
                />
                <StatCard
                    label={`${t.dashboard.attendanceTitle} ${currentYear}`}
                    value={
                        <>
                            {attendanceCount}
                            <span className='text-sm font-normal text-subtle-foreground'>
                                /{totalSessions} {t.dashboard.sessions}
                            </span>
                        </>
                    }
                />
                <StatCard
                    label={t.dashboard.attendanceRateTitle}
                    value={`${attendanceRate}%`}
                    sub={
                        <div className='w-full bg-muted rounded-full h-1.5'>
                            <div
                                className='bg-primary h-1.5 rounded-full'
                                style={{ width: `${attendanceRate}%` }}
                            />
                        </div>
                    }
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
                <div className='space-y-5'>
                    {myActivities.map((activity) => {
                        const sessions = upcomingSessions
                            .filter((s) => s.activityId === activity.id)
                            .slice(0, UPCOMING_PER_ACTIVITY);
                        const payment = paymentByActivity.get(activity.id);
                        return (
                            <div
                                key={activity.id}
                                className='bg-card rounded-xl border border-border overflow-hidden'
                                style={{ borderTop: `3px solid ${activity.color}` }}>
                                <div className='flex items-center gap-2.5 p-4 pb-3'>
                                    <ActivityInitial
                                        name={activity.name}
                                        color={activity.color}
                                    />
                                    <span className='flex-1 font-heading text-[15px] font-semibold text-foreground truncate'>
                                        {activity.name}
                                    </span>
                                    {payment ? (
                                        <Badge
                                            variant={paymentStatusVariant(
                                                payment.status,
                                            )}>
                                            {t.paymentStatus[payment.status]}
                                        </Badge>
                                    ) : (
                                        <Link href='/payments/upload'>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                className='h-7 text-xs text-warning'>
                                                {t.dashboard.duesNotPaid}
                                            </Button>
                                        </Link>
                                    )}
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
                                                    className='flex items-center gap-3 rounded-[10px] bg-muted/60 p-2.5 pr-3 hover:bg-accent transition-colors'>
                                                    <span className='flex w-10 shrink-0 flex-col items-center'>
                                                        <span className='text-[10px] font-semibold uppercase text-primary'>
                                                            {format(
                                                                new Date(s.date),
                                                                'EEE',
                                                                { locale: dateLocale },
                                                            )}
                                                        </span>
                                                        <span className='font-heading text-[17px] font-bold text-foreground leading-tight'>
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
                                                        <Badge className='text-xs shrink-0'>
                                                            {t.dashboard.registered}
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant={sessionStatusVariant(
                                                                s.status,
                                                            )}
                                                            className='text-xs shrink-0'>
                                                            {t.sessionStatus[s.status]}
                                                        </Badge>
                                                    )}
                                                </Link>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <Link
                        href='/sessions'
                        className='inline-block text-sm text-primary hover:underline'>
                        {t.dashboard.viewAll}
                    </Link>
                </div>
            )}
        </div>
    );
}

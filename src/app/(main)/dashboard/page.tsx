import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { CalendarDays, CheckCircle, TrendingUp, Shapes } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getUserEkskulIds } from '@/lib/ekskul';
import { sessionStatusVariant, paymentStatusVariant } from '@/lib/utils';

const UPCOMING_PER_EKSKUL = 3;

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

    const myEkskulIds = await getUserEkskulIds(userId);

    const [myEkskuls, upcomingSessions, monthPayments, attendanceCount, totalSessions] =
        await Promise.all([
            prisma.ekskul.findMany({
                where: { id: { in: myEkskulIds }, isActive: true },
                orderBy: { name: 'asc' },
                select: { id: true, name: true, color: true },
            }),
            prisma.activitySession.findMany({
                where: {
                    ekskulId: { in: myEkskulIds },
                    date: { gte: today },
                    status: { in: ['SCHEDULED', 'ONGOING'] },
                },
                orderBy: { date: 'asc' },
                include: {
                    ekskul: { select: { id: true, name: true, color: true } },
                    attendances: { where: { userId }, select: { status: true } },
                    _count: { select: { attendances: true } },
                },
            }),
            prisma.payment.findMany({
                where: {
                    userId,
                    month: currentMonth,
                    year: currentYear,
                    ekskulId: { in: myEkskulIds },
                },
                select: { ekskulId: true, status: true, amount: true },
            }),
            prisma.attendance.count({
                where: {
                    userId,
                    status: 'PRESENT',
                    session: {
                        ekskulId: { in: myEkskulIds },
                        date: { gte: yearStart, lte: yearEnd },
                    },
                },
            }),
            prisma.activitySession.count({
                where: {
                    ekskulId: { in: myEkskulIds },
                    date: { gte: yearStart, lte: yearEnd },
                    status: { not: 'CANCELLED' },
                },
            }),
        ]);

    const attendanceRate =
        totalSessions > 0
            ? Math.round((attendanceCount / totalSessions) * 100)
            : 0;
    const paymentByEkskul = new Map(monthPayments.map((p) => [p.ekskulId, p]));
    const paidCount = monthPayments.filter(
        (p) => p.status === 'CONFIRMED',
    ).length;

    return (
        <div className='space-y-6'>
            {/* Page header */}
            <div>
                <h1 className='text-2xl font-bold text-foreground'>
                    {t.dashboard.welcomeGreeting}{' '}
                    {session.user.name?.split(' ')[0]} 👋
                </h1>
                <p className='text-sm text-muted-foreground mt-1'>
                    {format(now, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                </p>
            </div>

            {/* Summary strip */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <StatCard
                    label={`${t.dashboard.duesTitle} ${t.months[currentMonth]}`}
                    icon={Shapes}
                    value={
                        <>
                            {paidCount}
                            <span className='text-sm font-normal text-muted-foreground'>
                                /{myEkskuls.length}
                            </span>
                        </>
                    }
                />
                <StatCard
                    label={`${t.dashboard.attendanceTitle} ${currentYear}`}
                    icon={CheckCircle}
                    value={
                        <>
                            {attendanceCount}
                            <span className='text-sm font-normal text-muted-foreground'>
                                /{totalSessions} {t.dashboard.sessions}
                            </span>
                        </>
                    }
                />
                <StatCard
                    label={t.dashboard.attendanceRateTitle}
                    icon={TrendingUp}
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

            {/* Per-ekskul sections */}
            {myEkskuls.length === 0 ? (
                <EmptyState
                    icon={Shapes}
                    title={t.ekskul.noneJoined}
                    action={
                        <Link href='/profile'>
                            <Button variant='outline' size='sm'>
                                {t.ekskul.join}
                            </Button>
                        </Link>
                    }
                />
            ) : (
                <div className='space-y-5'>
                    {myEkskuls.map((ekskul) => {
                        const sessions = upcomingSessions
                            .filter((s) => s.ekskulId === ekskul.id)
                            .slice(0, UPCOMING_PER_EKSKUL);
                        const payment = paymentByEkskul.get(ekskul.id);
                        return (
                            <div
                                key={ekskul.id}
                                className='bg-card rounded-xl border border-border overflow-hidden'
                                style={{ borderTop: `3px solid ${ekskul.color}` }}>
                                <div className='flex items-center justify-between gap-3 p-4 border-b border-border'>
                                    <EkskulBadge
                                        name={ekskul.name}
                                        color={ekskul.color}
                                    />
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
                                <div className='p-4 space-y-2'>
                                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1'>
                                        <CalendarDays className='w-3.5 h-3.5' />
                                        {t.dashboard.upcomingTitle}
                                    </p>
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
                                                    className='flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:border-primary/40 transition-colors'>
                                                    <div className='min-w-0'>
                                                        <p className='text-sm font-medium text-foreground truncate'>
                                                            {s.title}
                                                        </p>
                                                        <p className='text-xs text-muted-foreground'>
                                                            📅{' '}
                                                            {format(
                                                                new Date(s.date),
                                                                'd MMM yyyy',
                                                                {
                                                                    locale: dateLocale,
                                                                },
                                                            )}{' '}
                                                            · {s.startTime}
                                                        </p>
                                                    </div>
                                                    {isRegistered ? (
                                                        <Badge
                                                            variant='default'
                                                            className='text-xs shrink-0'>
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

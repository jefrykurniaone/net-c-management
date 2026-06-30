import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { CalendarDays, CheckCircle, TrendingUp, Shapes } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {t.dashboard.welcomeGreeting}{' '}
                    {session.user.name?.split(' ')[0]} 👋
                </h1>
                <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    {format(now, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                </p>
            </div>

            {/* Summary strip */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <CardTitle className='text-sm font-medium text-gray-500'>
                            {t.dashboard.duesTitle} {t.months[currentMonth]}
                        </CardTitle>
                        <Shapes className='w-4 h-4 text-gray-400' />
                    </CardHeader>
                    <CardContent>
                        <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                            {paidCount}
                            <span className='text-sm font-normal text-gray-400'>
                                /{myEkskuls.length}
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <CardTitle className='text-sm font-medium text-gray-500'>
                            {t.dashboard.attendanceTitle} {currentYear}
                        </CardTitle>
                        <CheckCircle className='w-4 h-4 text-gray-400' />
                    </CardHeader>
                    <CardContent>
                        <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                            {attendanceCount}
                            <span className='text-sm font-normal text-gray-400'>
                                /{totalSessions} {t.dashboard.sessions}
                            </span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <CardTitle className='text-sm font-medium text-gray-500'>
                            {t.dashboard.attendanceRateTitle}
                        </CardTitle>
                        <TrendingUp className='w-4 h-4 text-gray-400' />
                    </CardHeader>
                    <CardContent>
                        <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                            {attendanceRate}%
                        </p>
                        <div className='mt-2 w-full bg-gray-100 rounded-full h-1.5'>
                            <div
                                className='bg-green-500 h-1.5 rounded-full'
                                style={{ width: `${attendanceRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Per-ekskul sections */}
            {myEkskuls.length === 0 ? (
                <div className='text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800'>
                    <Shapes className='w-10 h-10 text-gray-300 mx-auto mb-3' />
                    <p className='text-gray-500 text-sm mb-3'>
                        {t.ekskul.noneJoined}
                    </p>
                    <Link href='/profile'>
                        <Button variant='outline' size='sm'>
                            {t.ekskul.join}
                        </Button>
                    </Link>
                </div>
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
                                className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden'
                                style={{ borderTop: `3px solid ${ekskul.color}` }}>
                                <div className='flex items-center justify-between gap-3 p-4 border-b border-gray-50 dark:border-gray-800'>
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
                                                className='h-7 text-xs text-red-500 border-red-200'>
                                                {t.dashboard.duesNotPaid}
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                                <div className='p-4 space-y-2'>
                                    <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1'>
                                        <CalendarDays className='w-3.5 h-3.5' />
                                        {t.dashboard.upcomingTitle}
                                    </p>
                                    {sessions.length === 0 ? (
                                        <p className='text-sm text-gray-400 py-2'>
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
                                                    className='flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:border-green-200 transition-colors'>
                                                    <div className='min-w-0'>
                                                        <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                                                            {s.title}
                                                        </p>
                                                        <p className='text-xs text-gray-400'>
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
                                                            variant='outline'
                                                            className='text-xs text-green-600 border-green-200 shrink-0'>
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
                        className='inline-block text-sm text-green-600 hover:underline'>
                        {t.dashboard.viewAll}
                    </Link>
                </div>
            )}
        </div>
    );
}

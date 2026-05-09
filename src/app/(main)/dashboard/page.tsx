import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import {
    CalendarDays,
    CreditCard,
    TrendingUp,
    CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { sessionStatusVariant, paymentStatusVariant } from '@/lib/utils';

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

    const [upcomingSessions, currentPayment, attendanceCount, totalSessions] =
        await Promise.all([
            prisma.badmintonSession.findMany({
                where: {
                    date: { gte: today },
                    status: { in: ['SCHEDULED', 'ONGOING'] },
                },
                orderBy: { date: 'asc' },
                take: 5,
                include: {
                    attendances: {
                        where: { userId },
                        select: { status: true },
                    },
                    _count: { select: { attendances: true } },
                },
            }),
            prisma.payment.findFirst({
                where: { userId, month: currentMonth, year: currentYear },
            }),
            prisma.attendance.count({
                where: {
                    userId,
                    status: 'PRESENT',
                    session: {
                        date: {
                            gte: new Date(`${currentYear}-01-01`),
                            lte: new Date(`${currentYear}-12-31`),
                        },
                    },
                },
            }),
            prisma.badmintonSession.count({
                where: {
                    date: {
                        gte: new Date(`${currentYear}-01-01`),
                        lte: new Date(`${currentYear}-12-31`),
                    },
                    status: { not: 'CANCELLED' },
                },
            }),
        ]);

    const attendanceRate =
        totalSessions > 0
            ? Math.round((attendanceCount / totalSessions) * 100)
            : 0;

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

            {/* Stats cards */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                <Card>
                    <CardHeader className='flex flex-row items-center justify-between pb-2'>
                        <CardTitle className='text-sm font-medium text-gray-500'>
                            {t.dashboard.duesTitle}{' '}
                            {t.months[currentMonth]}
                        </CardTitle>
                        <CreditCard className='w-4 h-4 text-gray-400' />
                    </CardHeader>
                    <CardContent>
                        {currentPayment ? (
                            <div>
                                <Badge
                                    variant={paymentStatusVariant(currentPayment.status)}>
                                    {t.paymentStatus[currentPayment.status]}
                                </Badge>
                                <p className='text-xs text-gray-400 mt-1'>
                                    Rp{' '}
                                    {currentPayment.amount.toLocaleString(
                                        'id-ID',
                                    )}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className='text-lg font-semibold text-red-500'>
                                    {t.dashboard.duesNotPaid}
                                </p>
                                <Link href='/payments/upload'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='mt-2 text-xs h-7'>
                                        {t.dashboard.uploadProof}
                                    </Button>
                                </Link>
                            </div>
                        )}
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

            {/* Upcoming sessions */}
            <div>
                <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                        <CalendarDays className='w-5 h-5 text-green-600' />
                        {t.dashboard.upcomingTitle}
                    </h2>
                    <Link
                        href='/sessions'
                        className='text-sm text-green-600 hover:underline'>
                        {t.dashboard.viewAll}
                    </Link>
                </div>

                {upcomingSessions.length === 0 ? (
                    <div className='text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800'>
                        <CalendarDays className='w-10 h-10 text-gray-300 mx-auto mb-3' />
                        <p className='text-gray-500 text-sm'>
                            {t.dashboard.noUpcoming}
                        </p>
                    </div>
                ) : (
                    <div className='space-y-3'>
                        {upcomingSessions.map((s) => {
                            const isRegistered = s.attendances.length > 0;
                            return (
                                <Link key={s.id} href={`/sessions/${s.id}`}>
                                    <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-green-200 hover:shadow-sm transition-all cursor-pointer'>
                                        <div className='flex items-start justify-between gap-3'>
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-center gap-2 mb-1'>
                                                    <h3 className='font-semibold text-gray-900 dark:text-white text-sm truncate'>
                                                        {s.title}
                                                    </h3>
                                                    <Badge
                                                        variant={sessionStatusVariant(s.status)}
                                                        className='text-xs shrink-0'>
                                                        {t.sessionStatus[s.status]}
                                                    </Badge>
                                                </div>
                                                <p className='text-xs text-gray-400'>
                                                    📅{' '}
                                                    {format(
                                                        new Date(s.date),
                                                        'EEEE, d MMMM yyyy',
                                                        { locale: dateLocale },
                                                    )}
                                                    &nbsp;·&nbsp;
                                                    {s.startTime} – {s.endTime}
                                                </p>
                                                <p className='text-xs text-gray-400 mt-0.5'>
                                                    📍 {s.location}
                                                </p>
                                            </div>
                                            <div className='text-right shrink-0'>
                                                <p className='text-xs text-gray-400'>
                                                    {s._count.attendances}/
                                                    {s.maxPlayers}
                                                </p>
                                                {isRegistered ? (
                                                    <Badge
                                                        variant='outline'
                                                        className='text-xs text-green-600 border-green-200 mt-1'>
                                                        {t.dashboard.registered}
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant='secondary'
                                                        className='text-xs mt-1'>
                                                        {t.sessions.register}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

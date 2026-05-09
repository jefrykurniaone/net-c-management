import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarDays, CreditCard, TrendingUp } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function AdminDashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || session.user.role !== 'ADMIN')
        redirect('/dashboard');

    const t = getDictionary(locale);
    const { communityName } = await getSettings();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
        totalMembers,
        activeMembers,
        upcomingSessions,
        pendingPayments,
        confirmedPaymentsThisMonth,
        totalSessionsThisYear,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: { isActive: true, isProfileComplete: true },
        }),
        prisma.badmintonSession.count({
            where: {
                date: { gte: now },
                status: { in: ['SCHEDULED', 'ONGOING'] },
            },
        }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.payment.count({
            where: {
                status: 'CONFIRMED',
                month: currentMonth,
                year: currentYear,
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

    const stats = [
        {
            label: t.admin.totalMembers,
            value: totalMembers,
            sub: `${activeMembers} ${t.admin.active.toLowerCase()}`,
            icon: Users,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: t.admin.upcomingSessions,
            value: upcomingSessions,
            sub: `${totalSessionsThisYear} ${locale === 'id' ? 'sesi tahun ini' : 'sessions this year'}`,
            icon: CalendarDays,
            color: 'text-green-600 bg-green-50',
        },
        {
            label: t.admin.pendingPayments,
            value: pendingPayments,
            sub: t.admin.needsConfirmation,
            icon: CreditCard,
            color: 'text-yellow-600 bg-yellow-50',
        },
        {
            label: t.admin.confirmedThisMonth,
            value: confirmedPaymentsThisMonth,
            sub: `${currentMonth}/${currentYear}`,
            icon: TrendingUp,
            color: 'text-purple-600 bg-purple-50',
        },
    ];

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                    {t.admin.dashboardTitle}
                </h1>
                <p className='text-sm text-gray-500 mt-1'>
                    {t.admin.dashboardSubtitle} {communityName}
                </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                {stats.map(({ label, value, sub, icon: Icon, color }) => (
                    <Card key={label}>
                        <CardHeader className='flex flex-row items-center justify-between pb-2'>
                            <CardTitle className='text-sm font-medium text-gray-500'>
                                {label}
                            </CardTitle>
                            <div
                                className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                                <Icon className='w-4 h-4' />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                                {value}
                            </p>
                            <p className='text-xs text-gray-400 mt-1'>{sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

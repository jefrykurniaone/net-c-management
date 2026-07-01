import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Users, CalendarDays, CreditCard, TrendingUp } from 'lucide-react';
import { EkskulBadge } from '@/components/ekskul/ekskul-badge';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getEkskuls } from '@/lib/ekskul';
import { isAdminRole } from '@/lib/utils';

export default async function AdminDashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const { communityName } = await getSettings();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
        totalMembers,
        activeMembers,
        upcomingSessions,
        pendingPayments,
        confirmedPaymentsThisMonth,
        totalSessionsThisYear,
        ekskuls,
        membersByEkskul,
        upcomingByEkskul,
        pendingByEkskul,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
            where: { isActive: true, isProfileComplete: true },
        }),
        prisma.activitySession.count({
            where: {
                date: { gte: startOfToday },
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
        prisma.activitySession.count({
            where: {
                date: {
                    gte: new Date(`${currentYear}-01-01`),
                    lte: new Date(`${currentYear}-12-31`),
                },
                status: { not: 'CANCELLED' },
            },
        }),
        getEkskuls(),
        prisma.membership.groupBy({
            by: ['ekskulId'],
            where: { isActive: true },
            _count: true,
        }),
        prisma.activitySession.groupBy({
            by: ['ekskulId'],
            where: {
                date: { gte: startOfToday },
                status: { in: ['SCHEDULED', 'ONGOING'] },
            },
            _count: true,
        }),
        prisma.payment.groupBy({
            by: ['ekskulId'],
            where: { status: 'PENDING' },
            _count: true,
        }),
    ]);

    const countMap = (
        rows: { ekskulId: string; _count: number }[],
    ): Map<string, number> =>
        new Map(rows.map((r) => [r.ekskulId, r._count]));
    const memberCounts = countMap(membersByEkskul);
    const upcomingCounts = countMap(upcomingByEkskul);
    const pendingCounts = countMap(pendingByEkskul);

    const stats = [
        {
            label: t.admin.totalMembers,
            value: totalMembers,
            sub: `${activeMembers} ${t.admin.active.toLowerCase()}`,
            icon: Users,
        },
        {
            label: t.admin.upcomingSessions,
            value: upcomingSessions,
            sub: `${totalSessionsThisYear} ${locale === 'id' ? 'sesi tahun ini' : 'sessions this year'}`,
            icon: CalendarDays,
        },
        {
            label: t.admin.pendingPayments,
            value: pendingPayments,
            sub: t.admin.needsConfirmation,
            icon: CreditCard,
        },
        {
            label: t.admin.confirmedThisMonth,
            value: confirmedPaymentsThisMonth,
            sub: `${currentMonth}/${currentYear}`,
            icon: TrendingUp,
        },
    ];

    return (
        <div className='space-y-6'>
            <div>
                <h1 className='text-2xl font-bold text-foreground'>
                    {t.admin.dashboardTitle}
                </h1>
                <p className='text-sm text-muted-foreground mt-1'>
                    {t.admin.dashboardSubtitle} {communityName}
                </p>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                {stats.map(({ label, value, sub, icon: Icon }) => (
                    <StatCard
                        key={label}
                        label={label}
                        value={value}
                        sub={sub}
                        icon={Icon}
                    />
                ))}
            </div>

            {/* Per-ekskul breakdown */}
            {ekskuls.length > 0 && (
                <div className='space-y-4'>
                    <h2 className='text-lg font-semibold text-foreground'>
                        {t.admin.perEkskulTitle}
                    </h2>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {ekskuls.map((e) => (
                            <Card
                                key={e.id}
                                style={{ borderTop: `3px solid ${e.color}` }}>
                                <CardHeader className='pb-2'>
                                    <EkskulBadge name={e.name} color={e.color} />
                                </CardHeader>
                                <CardContent>
                                    <div className='grid grid-cols-3 gap-2 text-center'>
                                        <div>
                                            <p className='text-xl font-bold text-foreground tabular-nums'>
                                                {memberCounts.get(e.id) ?? 0}
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                {t.admin.colMembers}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xl font-bold text-foreground tabular-nums'>
                                                {upcomingCounts.get(e.id) ?? 0}
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                {t.admin.upcomingShort}
                                            </p>
                                        </div>
                                        <div>
                                            <p className='text-xl font-bold text-foreground tabular-nums'>
                                                {pendingCounts.get(e.id) ?? 0}
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                {t.admin.pendingShort}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

import { auth } from '@/lib/auth';
import { COLUMN_MEASURE } from '@/components/layout/measure';
import { redirect } from 'next/navigation';
import { getLocale, getDateFnsLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { releaseExpiredHolds } from '@/lib/holds';
import { DuesBanner } from '@/components/dashboard/dues-banner';
import { AttendanceSparklineCard } from '@/components/dashboard/attendance-sparkline-card';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { SummaryStatStrip } from '@/components/dashboard/summary-stat-strip';
import { ActivitySummarySection } from '@/components/dashboard/activity-summary-section';
import {
    loadMemberDashboard,
    memberDashboardWindow,
} from '@/components/dashboard/member-dashboard-data';
import { resolveDuesStanding } from '@/components/dashboard/dues-standing';
import {
    memberActivities,
    resolveActivitySections,
} from '@/components/dashboard/activity-sections';
import { attendanceRateOf } from '@/components/dashboard/attendance-rate';

export default async function DashboardPage() {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id) redirect('/auth/signin');

    const t = getDictionary(locale);
    const dashboardWindow = memberDashboardWindow(session.user.id, new Date());

    // Release lapsed reservation holds before deriving dues + session counts.
    await releaseExpiredHolds();
    const data = await loadMemberDashboard(dashboardWindow);

    const activities = memberActivities(data.memberships);
    const dues = resolveDuesStanding({
        memberships: data.memberships,
        activities,
        monthPayments: data.monthPayments,
        outstandingCount: data.outstandingBills.length,
        period: dashboardWindow.period,
        now: dashboardWindow.now,
    });
    const sections = resolveActivitySections({
        activities,
        board: data.dashboardBoard,
        paymentModeByActivity: dues.paymentModeByActivity,
        t,
        now: dashboardWindow.now,
    });

    return (
        <div className={`${COLUMN_MEASURE} space-y-6`}>
            <GreetingHeader
                now={dashboardWindow.now}
                dateLocale={getDateFnsLocale(locale)}
                memberName={session.user.name}
                t={t}
            />

            <DuesBanner
                firstUnpaid={dues.firstUnpaid}
                outstandingCount={data.outstandingBills.length}
                notices={dues.notices}
                monthLabel={t.months[dashboardWindow.period.month]}
                t={t}
            />

            <SummaryStatStrip
                attendanceRate={attendanceRateOf(
                    data.attendanceCount,
                    data.totalSessions,
                )}
                upcomingCount={data.upcomingCount}
                duesCount={dues.duesCount}
                t={t}
            />

            {/* #172: a fourth stat does not fit the three-column split above,
                so this small card runs full width right below it, still the
                dashboard's stats area. */}
            <AttendanceSparklineCard
                userId={dashboardWindow.userId}
                now={dashboardWindow.now}
                t={t}
            />

            <ActivitySummarySection sections={sections} t={t} />
        </div>
    );
}

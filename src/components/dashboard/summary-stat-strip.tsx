import { StatCard } from '@/components/ui/stat-card';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The dashboard's three headline figures: attendance this month, upcoming
 * Sessions, and how much is owed.
 *
 * Stacked below `sm` (640px): three equal columns at 390px have no room for
 * the longer of the two locales' tracked-caps labels — `MENDATANG`/`KEHADIRAN`
 * clip mid-word there — so each card takes the full row until there is width
 * to share, matching the breakpoint `StatCardsSkeleton` already uses while
 * this loads.
 */
export function SummaryStatStrip({
    attendanceRate,
    upcomingCount,
    duesCount,
    t,
}: Readonly<{
    attendanceRate: number;
    upcomingCount: number;
    duesCount: number;
    t: Dictionary;
}>) {
    return (
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
    );
}

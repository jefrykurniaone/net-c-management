import { Card } from '@/components/ui/card';
import { ActivityInitial } from '@/components/activity/activity-badge';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { ActivityCardData } from './dashboard-data';

/**
 * One Activity's card: members, attendance rate, Sessions per week and Dues
 * collected (User Story 4). The tile stays `ActivityInitial` exactly as it
 * rendered before this ticket — #164 owns the Activity icon and its own tile
 * component in this same wave, and adopting it here is not #165's work.
 */
function ActivityCard({
    activity,
    t,
}: Readonly<{ activity: ActivityCardData; t: Dictionary }>) {
    const { name, members, confirmed, attendanceRate, sessionsPerWeek, duesPct } =
        activity;
    return (
        <Card className='gap-3.5 p-5'>
            <div className='flex items-center gap-2.5'>
                <ActivityInitial name={name} />
                <span className='flex-1 type-title text-foreground truncate'>
                    {name}
                </span>
                <span className='type-caption text-subtle-foreground'>
                    {members} {t.admin.membersSuffix}
                </span>
            </div>
            <div className='flex gap-6'>
                <div className='flex flex-col'>
                    <span className='type-figure-lead text-foreground'>
                        {attendanceRate === null ? '—' : `${attendanceRate}%`}
                    </span>
                    <span className='type-label text-subtle-foreground'>
                        {t.admin.attendanceMetric}
                    </span>
                </div>
                <div className='flex flex-col'>
                    <span className='type-figure-lead text-foreground'>
                        {sessionsPerWeek}
                    </span>
                    <span className='type-label text-subtle-foreground'>
                        {t.admin.sessionsPerWeek}
                    </span>
                </div>
            </div>
            <div className='space-y-1.5'>
                <div className='flex justify-between'>
                    <span className='type-caption font-medium text-muted-foreground'>
                        {t.admin.duesCollectedLabel}
                    </span>
                    <span className='type-figure text-foreground'>
                        {confirmed}/{members}
                    </span>
                </div>
                <div className='h-[5px] rounded-full bg-muted overflow-hidden'>
                    <div
                        className='h-full rounded-full bg-primary'
                        style={{ width: `${duesPct}%` }}
                    />
                </div>
            </div>
        </Card>
    );
}

/** The dashboard's Activity cards grid — one card per Activity, or nothing at all. */
export function DashboardActivityCards({
    activities,
    t,
}: Readonly<{ activities: readonly ActivityCardData[]; t: Dictionary }>) {
    if (activities.length === 0) return null;
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} t={t} />
            ))}
        </div>
    );
}

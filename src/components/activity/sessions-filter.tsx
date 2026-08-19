'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ActivityTile } from './activity-badge';

export type SessionTab = 'upcoming' | 'past';
export type SessionView = 'mine' | 'all';

type Activity = { id: string; name: string };

/**
 * Sessions filter: a My/All view toggle, a scrollable row of activity chips
 * (initial tile + name), and an Upcoming/Past tab row. URL-driven —
 * `?view=`, `?activityId=`, `?tab=` — so the server component re-renders with
 * the right query. "My" scopes to joined activities; "All" reveals every active
 * Activity for discovery + join-on-register.
 */
export function SessionsFilter({
    activities,
    selected,
    tab,
    view,
    search,
    labels,
}: Readonly<{
    activities: Activity[];
    selected?: string;
    tab: SessionTab;
    view: SessionView;
    search?: string;
    labels: {
        all: string;
        upcoming: string;
        past: string;
        viewMine: string;
        viewAll: string;
    };
}>) {
    const pathname = usePathname();

    function href(next: { activityId?: string; tab?: SessionTab; view?: SessionView }) {
        const activityId = next.activityId ?? selected ?? '';
        const nextTab = next.tab ?? tab;
        const nextView = next.view ?? view;
        const params = new URLSearchParams();
        if (activityId) params.set('activityId', activityId);
        if (nextTab === 'past') params.set('tab', 'past');
        if (nextView === 'all') params.set('view', 'all');
        if (search) params.set('search', search);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    const chipBase =
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

    return (
        <div className='space-y-3'>
            {/* My / All view toggle — switching resets the activity chip filter */}
            <div className='inline-flex rounded-full bg-muted/60 p-0.5 text-xs font-semibold'>
                {(['mine', 'all'] as const).map((value) => (
                    <Link
                        key={value}
                        href={href({ view: value, activityId: '' })}
                        aria-current={view === value ? 'true' : undefined}
                        className={cn(
                            'rounded-full px-4 py-1.5 transition-colors',
                            view === value
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}>
                        {value === 'mine' ? labels.viewMine : labels.viewAll}
                    </Link>
                ))}
            </div>

            {/* Activity chips */}
            {activities.length > 0 && (
                <div className='flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'>
                    <Link
                        href={href({ activityId: '' })}
                        className={cn(
                            chipBase,
                            selected === undefined
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/60 border border-input text-secondary-foreground hover:bg-muted',
                        )}>
                        {labels.all}
                    </Link>
                    {activities.map((a) => {
                        const active = selected === a.id;
                        return (
                            <Link
                                key={a.id}
                                href={href({ activityId: a.id })}
                                className={cn(
                                    chipBase,
                                    active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted/60 border border-input text-secondary-foreground hover:bg-muted',
                                )}>
                                <ActivityTile name={a.name} />
                                {a.name}
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Upcoming / Past tabs */}
            <div className='flex gap-6 border-b border-border'>
                {(['upcoming', 'past'] as const).map((value) => {
                    const active = tab === value;
                    return (
                        <Link
                            key={value}
                            href={href({ tab: value })}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'pb-2.5 -mb-px border-b-2 text-[13px] font-semibold transition-colors',
                                active
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}>
                            {value === 'upcoming' ? labels.upcoming : labels.past}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

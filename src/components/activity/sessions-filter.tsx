'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ActivityDot } from './activity-badge';

export type SessionTab = 'upcoming' | 'past';

type Activity = { id: string; name: string; color: string };

/**
 * Club Premium sessions filter: a scrollable row of activity chips (colour dot +
 * name) plus an Upcoming/Past tab row. URL-driven — `?activityId=` and `?tab=` —
 * so the server component re-renders with the right query. Replaces the old
 * single dropdown.
 */
export function SessionsFilter({
    activities,
    selected,
    tab,
    labels,
}: Readonly<{
    activities: Activity[];
    selected?: string;
    tab: SessionTab;
    labels: { all: string; upcoming: string; past: string };
}>) {
    const pathname = usePathname();

    function href(next: { activityId?: string; tab?: SessionTab }) {
        const activityId = next.activityId ?? selected ?? '';
        const nextTab = next.tab ?? tab;
        const params = new URLSearchParams();
        if (activityId) params.set('activityId', activityId);
        if (nextTab === 'past') params.set('tab', 'past');
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    const chipBase =
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

    return (
        <div className='space-y-3'>
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
                                <ActivityDot
                                    color={a.color}
                                    className='size-[7px]'
                                />
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
                            {value === 'upcoming'
                                ? labels.upcoming
                                : labels.past}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

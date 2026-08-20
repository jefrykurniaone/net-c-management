'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ActivityTile } from './activity-badge';

/**
 * What the board is scoped to: the reader's own Activities or every one the
 * community runs, and optionally a single Activity. URL-driven — `?view=`,
 * `?activityId=` — so the board re-reads server-side.
 *
 * There is no Upcoming/Past tab and no pager here any more. A board shows a
 * range and every day in it keeps a cell, so moving through time is the week
 * nav's job. Text search went with them for the same reason: a board that hides
 * the days whose Sessions did not match would draw a Blank mark on them, which
 * says an Admin has not posted — a search result quietly lying about the state
 * of the week.
 *
 * Controls are square ruled tiles in tracked caps, and the active one is a
 * filled Court Green tile rather than an underline (DESIGN.md, Navigation).
 */

export type SessionView = 'mine' | 'all';

type Activity = { id: string; name: string };

const CHIP_BASE = [
    'inline-flex min-h-11 shrink-0 items-center gap-cell px-block type-label',
    'whitespace-nowrap transition-colors',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:[outline-offset:-2px]',
].join(' ');

const CHIP_ON = 'bg-primary-solid text-primary-solid-foreground';
const CHIP_OFF = 'bg-tile text-secondary-foreground hover:bg-board hover:text-foreground';

const RULED_GROUP = 'inline-flex divide-x divide-rule rounded-sm border border-rule';

export function SessionsFilter({
    activities,
    selected,
    view,
    week,
    labels,
}: Readonly<{
    activities: readonly Activity[];
    selected?: string;
    view: SessionView;
    /** The week the board is on, carried so a filter change stays on it. */
    week?: string;
    labels: Readonly<{
        all: string;
        viewMine: string;
        viewAll: string;
    }>;
}>) {
    const pathname = usePathname();

    function href(next: { activityId?: string; view?: SessionView }) {
        const activityId = next.activityId ?? selected ?? '';
        const nextView = next.view ?? view;
        const params = new URLSearchParams();
        if (activityId) params.set('activityId', activityId);
        if (nextView === 'all') params.set('view', 'all');
        if (week) params.set('week', week);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    return (
        <div className='flex flex-col gap-cell'>
            {/* Switching view resets the single-Activity filter: an id from the
                narrower list means nothing in the wider one. */}
            <div className={RULED_GROUP}>
                {(['mine', 'all'] as const).map((value) => (
                    <Link
                        key={value}
                        href={href({ view: value, activityId: '' })}
                        aria-current={view === value ? 'true' : undefined}
                        className={cn(
                            CHIP_BASE,
                            view === value ? CHIP_ON : CHIP_OFF,
                        )}>
                        {value === 'mine' ? labels.viewMine : labels.viewAll}
                    </Link>
                ))}
            </div>

            {activities.length > 0 && (
                <div className='flex overflow-x-auto'>
                    <div className={RULED_GROUP}>
                        <Link
                            href={href({ activityId: '' })}
                            aria-current={
                                selected === undefined ? 'true' : undefined
                            }
                            className={cn(
                                CHIP_BASE,
                                selected === undefined ? CHIP_ON : CHIP_OFF,
                            )}>
                            {labels.all}
                        </Link>
                        {activities.map((activity) => {
                            const isOn = selected === activity.id;
                            return (
                                <Link
                                    key={activity.id}
                                    href={href({ activityId: activity.id })}
                                    aria-current={isOn ? 'true' : undefined}
                                    className={cn(
                                        CHIP_BASE,
                                        isOn ? CHIP_ON : CHIP_OFF,
                                    )}>
                                    <ActivityTile name={activity.name} />
                                    {activity.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

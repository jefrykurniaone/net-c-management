'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ActivityTile } from './activity-tile';

/**
 * What the board is scoped to: the reader's own Activities or every one the
 * community runs, and optionally a single Activity. URL-driven — `?view=`,
 * `?activityId=` — so the board re-reads server-side.
 *
 * There is no Upcoming/Past tab and no pager here any more. A board shows a
 * range and every day in it keeps a cell, so moving through time is the week
 * nav's job. Text search went with them for the same reason: a board that hides
 * the days whose Sessions did not match would draw a neutral chip on them, which
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

/**
 * `inline-flex` is not enough on its own: a flex item is blockified to `flex`,
 * and the column's own `align-items: stretch` then pulls the group to the full
 * width of the surface — which put 383px of empty bordered box to the right of
 * the last chip. `w-fit` and `self-start` are what actually hold it to its
 * content.
 */
const RULED_GROUP =
    'inline-flex w-fit self-start divide-x divide-rule rounded-sm border border-rule';

/** Builds the href for one filter state, holding the rest of the board's. */
type HrefFor = (next: { activityId?: string; view?: SessionView }) => string;

/**
 * One cell of a ruled filter group. On or off; never colour alone.
 *
 * Named for what it is rather than "Chip": the status chip in
 * `src/components/ui/chip.tsx` is a labelled, non-interactive state pill, and
 * two components under one name with incompatible props is a collision waiting
 * for the first file that needs both.
 */
function FilterCell({
    href,
    isOn,
    children,
}: Readonly<{ href: string; isOn: boolean; children: React.ReactNode }>) {
    return (
        <Link
            href={href}
            aria-current={isOn ? 'true' : undefined}
            className={cn(CHIP_BASE, isOn ? CHIP_ON : CHIP_OFF)}>
            {children}
        </Link>
    );
}

/**
 * Mine against all. Switching view resets the single-Activity filter: an id
 * from the narrower list means nothing in the wider one.
 */
function ViewSwitch({
    view,
    href,
    labels,
}: Readonly<{
    view: SessionView;
    href: HrefFor;
    labels: Readonly<{ viewMine: string; viewAll: string }>;
}>) {
    return (
        <div className={RULED_GROUP}>
            {(['mine', 'all'] as const).map((value) => (
                <FilterCell
                    key={value}
                    href={href({ view: value, activityId: '' })}
                    isOn={view === value}>
                    {value === 'mine' ? labels.viewMine : labels.viewAll}
                </FilterCell>
            ))}
        </div>
    );
}

/** Every Activity the current view offers, plus the one that clears it. */
function ActivityChips({
    activities,
    selected,
    href,
    allLabel,
}: Readonly<{
    activities: readonly Activity[];
    selected?: string;
    href: HrefFor;
    allLabel: string;
}>) {
    return (
        <div className='flex overflow-x-auto'>
            <div className={RULED_GROUP}>
                <FilterCell href={href({ activityId: '' })} isOn={selected === undefined}>
                    {allLabel}
                </FilterCell>
                {activities.map((activity) => (
                    <FilterCell
                        key={activity.id}
                        href={href({ activityId: activity.id })}
                        isOn={selected === activity.id}>
                        <ActivityTile name={activity.name} size='inline' />
                        {activity.name}
                    </FilterCell>
                ))}
            </div>
        </div>
    );
}

type SessionsFilterProps = Readonly<{
    activities: readonly Activity[];
    selected?: string;
    view: SessionView;
    /** The week the board is on, carried so a filter change stays on it. */
    week?: string;
    labels: Readonly<{ all: string; viewMine: string; viewAll: string }>;
}>;

export function SessionsFilter({
    activities,
    selected,
    view,
    week,
    labels,
}: SessionsFilterProps) {
    const pathname = usePathname();

    const href: HrefFor = (next) => {
        const activityId = next.activityId ?? selected ?? '';
        const nextView = next.view ?? view;
        const params = new URLSearchParams();
        if (activityId) params.set('activityId', activityId);
        if (nextView === 'all') params.set('view', 'all');
        if (week) params.set('week', week);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    };

    return (
        /* Both groups on one row, each sized to its own content, so the surface
           has one header block rather than three strips of differing width. */
        <div className='flex flex-wrap items-center gap-cell'>
            <ViewSwitch view={view} href={href} labels={labels} />
            {activities.length > 0 && (
                <ActivityChips
                    activities={activities}
                    selected={selected}
                    href={href}
                    allLabel={labels.all}
                />
            )}
        </div>
    );
}

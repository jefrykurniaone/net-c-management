'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ActivityTile } from './activity-tile';

/**
 * What the page is scoped to: the reader's own Activities or every one the
 * community runs, and optionally a single Activity. URL-driven — `?view=`,
 * `?activityId=` — so the page re-reads server-side.
 *
 * Selecting a single Activity is also the way past a section's six-card cap, so
 * these chips are the only navigation the surface has. There is deliberately no
 * text search and no pager: the page shows every upcoming Session, so there is
 * nothing to page through and nothing a search could reach that a chip cannot.
 */

export type SessionView = 'mine' | 'all';

type Activity = { id: string; name: string };

const CHIP_BASE = [
    'inline-flex min-h-11 shrink-0 items-center gap-cell rounded-full border',
    'border-border px-block type-label whitespace-nowrap transition-rally',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:outline-offset-2',
].join(' ');

const CHIP_ON = 'bg-accent text-accent-foreground';
const CHIP_OFF =
    'bg-card text-secondary-foreground shadow-lift hover:bg-muted hover:text-foreground';

/** One row of pills, each sized to its own content and wrapping rather than scrolling. */
const CHIP_GROUP = 'flex w-fit flex-wrap items-center gap-cell self-start';

/** Builds the href for one filter state, holding the rest of the page's. */
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
        <div className={CHIP_GROUP}>
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
        <div className={CHIP_GROUP}>
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
    );
}

type SessionsFilterProps = Readonly<{
    activities: readonly Activity[];
    selected?: string;
    view: SessionView;
    labels: Readonly<{ all: string; viewMine: string; viewAll: string }>;
}>;

export function SessionsFilter({
    activities,
    selected,
    view,
    labels,
}: SessionsFilterProps) {
    const pathname = usePathname();

    const href: HrefFor = (next) => {
        const activityId = next.activityId ?? selected ?? '';
        const nextView = next.view ?? view;
        const params = new URLSearchParams();
        if (activityId) params.set('activityId', activityId);
        if (nextView === 'all') params.set('view', 'all');
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

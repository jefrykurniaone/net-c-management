import Link from 'next/link';
import { ActivityTile } from '@/components/activity/activity-tile';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';
import type { SlotCellAction, SlotCellData } from './slot-cell-data';
import { SeatAction } from './seat-action';
import { SlotNote, SlotTitle, SlotWhen } from './slot-lines';
import { TopRight } from './slot-standing';

/**
 * The Slot Cell — one Session on the board, and the single seam for rendering
 * one anywhere in the app. The dashboard, the sessions board and the session
 * detail header compose from this rather than each inventing their own card.
 *
 * **A row of three columns, in fixed positions, always:**
 *
 * 1. **when** — the start time as Figure, in a fixed-width leading column, so
 *    times line up down the whole week. Where the caller has no day band above
 *    the row to carry the date, {@link SlotCellData.day} puts it in this same
 *    column above the time; the board leaves it out because its band owns it.
 * 2. **what** — the Session title as Title, on the first line; then venue and
 *    the Activity's livery as Caption on the second, with one note below that.
 * 3. **standing** — free Seats as `n/max` in Figure **or** a chip, hard right of
 *    the first line, so every chip on the surface sits on one edge.
 *
 * The positions are non-negotiable: a member reads any row in two seconds
 * because everything is always in the same place, and one row that reflows
 * under pressure breaks that promise for every row. So this component takes
 * **data, never nodes** — there is no `children`, no slot props and no ordering
 * prop, because a caller that can pass a node can reorder the row.
 *
 * **The action is a sibling of the link, never a child of it.** A row that is
 * one whole anchor cannot hold a button: a control nested inside a link is
 * invalid, unreachable in the tab order some of the time, and activated
 * differently by different browsers. So the cell is a ground that holds two
 * children — the anchor covering the three columns, and, only where the caller
 * resolved one, an action row beneath it aligned to the Session's own column.
 * The three columns are untouched by it, no chip leaves its shared right edge,
 * and the row-wide tap target that opens the Session survives. A cell with no
 * action renders exactly the arrangement it did before there were any.
 *
 * Livery is one shared tile ({@link ActivityTile}) — never an edge stripe, and
 * never a colour this cell picks. This cell hands it the Activity's name and
 * nothing else, so it draws the initial; the Session surfaces wire the chosen
 * icon through under #159.
 *
 * Every state here comes from the chip resolver — see `slot-standing.tsx` for
 * the standing column's fixed precedence and `slot-lines.tsx` for the note.
 */

export type {
    SlotCellAction,
    SlotCellData,
    SlotCellQuota,
    SlotCellSeats,
} from './slot-cell-data';

/**
 * Three columns: the fixed-width `when` rail, the Session, and the standing
 * hard right. `items-baseline` sets the time on the title's baseline rather
 * than its box, so the two read as one line.
 */
const CELL_CLASS = [
    'grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline',
    'gap-x-cell gap-y-hair p-cell',
].join(' ');

/* An offset ring would be clipped by the lattice's own `overflow-hidden`, so
   the focus ring is drawn 2px *inside* the cell edge instead. The hover tint
   belongs to the ground, not to the anchor: the action row shares the cell, and
   half a cell lighting up reads as two objects. */
const CELL_INTERACTIVE = cn(
    'active:shadow-tile-pressed',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:[outline-offset:-2px]',
);

/** The cell's own ground. One grid child of the lattice, so rules are unchanged. */
const CELL_GROUND = 'flex flex-col bg-tile transition-colors';

/**
 * The action's own row, on the same fixed template as the cell above it so the
 * control starts on the Session column's left edge and the `when` rail stays a
 * column of times and nothing else.
 */
const ACTION_ROW_CLASS = [
    'grid grid-cols-[5.5rem_minmax(0,1fr)] items-center',
    'gap-x-cell px-cell pb-cell',
].join(' ');

function SlotCellBody({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    return (
        <>
            <SlotWhen data={data} />
            <SlotTitle data={data} />
            <span className='justify-self-end'>
                <TopRight data={data} t={t} />
            </span>
            {/* The venue, the livery and any note share the Session's column,
                under its title — never the `when` rail, which stays a column of
                times and nothing else. */}
            <span className='col-start-2 col-end-4 flex flex-col gap-hair'>
                <span className='flex flex-wrap items-center gap-x-cell gap-y-hair'>
                    <span className='type-caption text-secondary-foreground'>
                        {data.location}
                    </span>
                    <span className='flex items-center gap-hair'>
                        <ActivityTile
                            name={data.activityName}
                            size='inline'
                        />
                        <span className='type-caption truncate text-muted-foreground'>
                            {data.activityName}
                        </span>
                    </span>
                </span>
                <SlotNote data={data} t={t} />
            </span>
        </>
    );
}

/** The three columns. An anchor where there is something to open, else a box. */
function SlotCellRow({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    if (data.href === null) {
        return (
            <div className={CELL_CLASS}>
                <SlotCellBody data={data} t={t} />
            </div>
        );
    }
    return (
        <Link href={data.href} className={cn(CELL_CLASS, CELL_INTERACTIVE)}>
            <SlotCellBody data={data} t={t} />
        </Link>
    );
}

function SlotActionRow({
    action,
    title,
}: Readonly<{ action: SlotCellAction; title: string }>) {
    return (
        <div className={ACTION_ROW_CLASS}>
            <span aria-hidden='true' />
            <span className='justify-self-start'>
                <SeatAction action={action} title={title} />
            </span>
        </div>
    );
}

export function SlotCell({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    const action = data.action ?? null;
    return (
        <div
            className={cn(
                CELL_GROUND,
                data.href !== null && 'hover:bg-board',
            )}>
            <SlotCellRow data={data} t={t} />
            {action && <SlotActionRow action={action} title={data.title} />}
        </div>
    );
}

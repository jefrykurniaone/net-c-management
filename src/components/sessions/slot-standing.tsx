import { Chip } from '@/components/ui/chip';
import {
    resolveSessionStanding,
    type SeatFigure,
    type SessionStanding,
} from '@/lib/session-standing';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellData } from './slot-cell-data';

/**
 * The Slot Cell's third column — the standing, hard right of the first line, so
 * every chip on the surface lands on one edge. It holds **exactly one thing**,
 * and *which* one is not decided here: `resolveSessionStanding`
 * (`src/lib/session-standing.ts`) owns the precedence for every member surface,
 * and this component only draws what it returns.
 *
 * That module is where the order and its reasons are written down. The cell
 * passes no `holdExpiresAt`, so it never draws the held-Seat standing — the
 * dashboard and the detail header, its two remaining callers, do not read the
 * column, and a card that wants the deadline says so (the week strip does).
 */

/** Free Seats as `n/max`, in tabular figures under a tracked-caps label. */
function FreeSeats({
    seats,
    t,
}: Readonly<{ seats: SeatFigure; t: Dictionary }>) {
    const spoken = t.sessions.boardSeatsAria
        .replace('{n}', String(seats.free))
        .replace('{max}', String(seats.max));
    return (
        <span className='flex flex-col items-end gap-hair'>
            <span className='type-label text-muted-foreground'>
                {t.sessions.boardSeatsFree}
            </span>
            <span className='type-figure text-foreground'>
                <span aria-hidden='true'>
                    {seats.free}/{seats.max}
                </span>
                <span className='sr-only'>{spoken}</span>
            </span>
        </span>
    );
}

/** One resolved standing, drawn. The variant is the resolver's, never this file's. */
function Standing({
    standing,
    t,
}: Readonly<{ standing: SessionStanding; t: Dictionary }>) {
    if (standing.kind === 'seats') {
        return <FreeSeats seats={standing.seats} t={t} />;
    }
    if (standing.kind === 'full') {
        return <Chip variant={standing.variant} label={t.sessions.full} />;
    }
    if (standing.kind === 'held') {
        return <Chip variant={standing.variant} label={t.sessions.weekSeatHeld} />;
    }
    return (
        <Chip variant={standing.variant} label={t.chips[standing.labelKey]} />
    );
}

/**
 * The top-right slot, which holds exactly one thing. See `session-standing.ts`
 * for the precedence: a cancelled Session overrides the reader's own Seat, their
 * own Seat overrides the Session's point in its life, and the seat figure is
 * what a live Session with Seats left shows.
 */
export function TopRight({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    const standing = resolveSessionStanding({
        status: data.status,
        ownStatus: data.ownStatus,
        seats: data.seats,
    });
    return <Standing standing={standing} t={t} />;
}

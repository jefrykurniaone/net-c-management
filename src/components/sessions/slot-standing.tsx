import type { AttendanceStatus } from '@prisma/client';
import { Chip, StatusChip } from '@/components/ui/chip';
import { attendanceState, sessionState } from '@/lib/status-chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellData, SlotCellSeats } from './slot-cell-data';

/**
 * The Slot Cell's third column — the standing, hard right of the first line, so
 * every chip on the surface lands on one edge. It holds **exactly one thing**,
 * by a precedence that is part of the cell's contract; see {@link TopRight}.
 */

/**
 * The reader's own standing on a Session preempts the seat figure: a held Seat
 * (`REGISTERED`, `PRESENT`), a tentative one (`MAYBE`), and a No-Show
 * (`NO_SHOW`), which outranks the seat figure and the Session's lifecycle chip
 * exactly as a held Seat does, because it is a fact about the reader's own
 * Seat. `ABSENT` — Opted Out — stays out for the reason already given: the
 * member released that Seat, so the free-Seat figure is the fact they now
 * need, and their own withdrawal is said on the Session's own line instead
 * (`OptedOutLine` in `slot-lines.tsx`). No-Show is recorded only by an Admin
 * and never derived (`docs/adr/0001-no-show-attendance-value.md`).
 */
const OWN_STATES_CHIPPED: readonly AttendanceStatus[] = [
    'REGISTERED',
    'PRESENT',
    'MAYBE',
    'NO_SHOW',
];

/** Free Seats as `n/max`, in tabular figures under a tracked-caps label. */
function FreeSeats({
    seats,
    t,
}: Readonly<{ seats: SlotCellSeats; t: Dictionary }>) {
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

/**
 * The top-right slot, which holds exactly one thing. A cancelled Session
 * overrides the reader's own Seat, their own Seat overrides the Session's point
 * in its life, and the seat figure is what a live Session with Seats left shows.
 */
export function TopRight({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    if (data.status === null) {
        return <Chip variant='neutral' label={t.chips.unposted} />;
    }
    if (data.status === 'CANCELLED') {
        return <StatusChip state={sessionState(data.status)} labels={t.chips} />;
    }
    if (data.ownStatus !== null && OWN_STATES_CHIPPED.includes(data.ownStatus)) {
        return (
            <StatusChip state={attendanceState(data.ownStatus)} labels={t.chips} />
        );
    }
    if (data.status !== 'SCHEDULED') {
        return <StatusChip state={sessionState(data.status)} labels={t.chips} />;
    }
    if (data.seats === null) {
        return <Chip variant='neutral' label={t.chips.unposted} />;
    }
    if (data.seats.free <= 0) {
        return <Chip variant='neutral' label={t.sessions.full} />;
    }
    return <FreeSeats seats={data.seats} t={t} />;
}

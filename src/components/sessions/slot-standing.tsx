import type { AttendanceStatus } from '@prisma/client';
import { Mark, StateMark } from '@/components/ui/mark';
import { attendanceState, sessionState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellData, SlotCellSeats } from './slot-cell-data';

/**
 * The Slot Cell's third column — the standing, hard right of the first line, so
 * every mark on the surface lands on one edge. It holds **exactly one thing**,
 * by a precedence that is part of the cell's contract; see {@link TopRight}.
 */

/**
 * The reader's own standing on a Session preempts the seat figure: a held Seat
 * (`REGISTERED`, `PRESENT`), a tentative one (`MAYBE`), and a No-Show
 * (`NO_SHOW`), which outranks the seat figure and the Session's lifecycle mark
 * exactly as a held Seat does, because it is a fact about the reader's own
 * Seat. `ABSENT` — Opted Out — stays out for the reason already given: the
 * member released that Seat, so the free-Seat figure is the fact they now
 * need, and their own withdrawal is said on the Session's own line instead
 * (`OptedOutLine` in `slot-lines.tsx`). No-Show is recorded only by an Admin
 * and never derived (`docs/adr/0001-no-show-attendance-value.md`).
 */
const OWN_STATES_MARKED: readonly AttendanceStatus[] = [
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
        return <Mark kind='blank'>{t.marks.unposted}</Mark>;
    }
    if (data.status === 'CANCELLED') {
        return <StateMark state={sessionState(data.status)} labels={t.marks} />;
    }
    if (data.ownStatus !== null && OWN_STATES_MARKED.includes(data.ownStatus)) {
        return (
            <StateMark state={attendanceState(data.ownStatus)} labels={t.marks} />
        );
    }
    if (data.status !== 'SCHEDULED') {
        return <StateMark state={sessionState(data.status)} labels={t.marks} />;
    }
    if (data.seats === null) {
        return <Mark kind='blank'>{t.marks.unposted}</Mark>;
    }
    if (data.seats.free <= 0) {
        return <Mark kind='blank'>{t.sessions.full}</Mark>;
    }
    return <FreeSeats seats={data.seats} t={t} />;
}

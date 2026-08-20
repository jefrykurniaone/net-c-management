import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { SlotCell, type SlotCellData } from './slot-cell';

/**
 * The session detail page's header. It **composes the Slot Cell** rather than
 * defining a header of its own, so a Session is the same object here as it is on
 * the board: same three columns, same standing precedence, same livery, same
 * marks. A second arrangement for the same thing is how a member comes to think
 * the detail page is showing them something else.
 *
 * Two fields differ from a board row, both deliberately:
 *
 * - `day` is filled, because there is no day band above this row to carry the
 *   date — that is exactly the case the field exists for.
 * - `href` and `action` are `null`. The member is already on this Session, so
 *   there is nothing to open; and the RSVP card below owns the claim, so putting
 *   one in the header too would be two answers to one question.
 */

export interface SessionDetailHeaderData {
    readonly title: string;
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly activityName: string;
    readonly status: SessionStatus;
    /** The reader's own Seat state, including a withdrawal (`ABSENT`). */
    readonly ownStatus: AttendanceStatus | null;
    readonly seats: Readonly<{ free: number; max: number }>;
    readonly quota:
        | Readonly<{ committed: number; needed: number; isMet: boolean }>
        | null;
}

export function SessionDetailHeader({
    session,
    t,
}: Readonly<{ session: SessionDetailHeaderData; t: Dictionary }>) {
    /* `getUTC*`, never a locale formatter: a Session is stored as UTC midnight
       of its WIB calendar day, and a formatter reads the machine's zone. */
    const data: SlotCellData = {
        day: {
            label: t.days[session.date.getUTCDay()],
            dayOfMonth: session.date.getUTCDate(),
        },
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        activityName: session.activityName,
        href: null,
        status: session.status,
        ownStatus: session.ownStatus,
        seats: session.seats,
        quota: session.quota,
        action: null,
    };
    /* On the board the lattice draws the cell's rules; standing alone, the cell
       draws its own, so it is the same rule-bounded object either way. */
    return (
        <div className='overflow-hidden rounded-sm border border-rule'>
            <SlotCell data={data} t={t} />
        </div>
    );
}

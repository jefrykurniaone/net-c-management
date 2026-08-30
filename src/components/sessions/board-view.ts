import type { AttendanceStatus } from '@prisma/client';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { BoardSeats } from '@/lib/sessions-board';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BoardDayView, BoardSlotView } from './sessions-board';
import { slotActionFor } from './slot-action';

/**
 * `BoardDay` carries a day's situation and its numbers; the dictionary carries
 * the words. This is the seam between them — the only place on this surface
 * that turns a weekday index into a name, and the reason no component here
 * calls a date formatter. A locale-aware formatter reads the machine's zone,
 * not WIB, which is how a Tuesday Session comes to advertise itself as Monday.
 */

/**
 * Column order. `BoardDay.weekday` and the dictionary's `days` are both
 * Sunday-first because `Activity.recurringDay` is; the board reads Monday-first
 * because a week of sport does. One indexes, the other orders.
 */
export interface BoardCopyContext {
    readonly t: Dictionary;
    readonly seatsBySession: ReadonlyMap<string, BoardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    /** The Activities the member has joined — see `SlotActionInput.isJoined`. */
    readonly joinedActivityIds: ReadonlySet<string>;
    /**
     * The Sessions on this board whose Seats cost this member nothing more,
     * their Dues for that billing period being live already — see
     * `SlotActionInput.hasLiveDues`.
     */
    readonly duesCoveredSessionIds: ReadonlySet<string>;
    /**
     * The instant the board is read, which the RSVP window is measured against.
     * Defaults to the present; injectable so a caller can pin it.
     */
    readonly now?: Date;
}

/** "18 August" — the day and its month, never a formatter's idea of either. */
export function monthDayLabel(date: Date, t: Dictionary): string {
    return `${date.getUTCDate()} ${t.months[date.getUTCMonth() + 1]}`;
}

/** The far end of the range carries the year, so a distant week says which. */
export function monthDayYearLabel(date: Date, t: Dictionary): string {
    return `${monthDayLabel(date, t)} ${date.getUTCFullYear()}`;
}

/** "Monday 18 August" — the day row's own label, at every width. */
function dayHeading(day: BoardDay, t: Dictionary): string {
    return `${t.days[day.weekday]} ${day.dayOfMonth} ${t.months[day.monthNumber]}`;
}

function postedSlot(
    slot: Extract<BoardSlot, { kind: 'posted' }>,
    day: BoardDay,
    context: BoardCopyContext,
): BoardSlotView {
    const { session } = slot;
    const ownStatus = context.ownBySession.get(session.id) ?? null;
    const seats = context.seatsBySession.get(session.id) ?? null;
    return {
        key: session.id,
        cell: {
            // The board's day band says the date once for every row beneath it.
            day: null,
            title: session.title,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location,
            activityName: slot.activity.name,
            href: `/sessions/${session.id}`,
            status: session.status,
            ownStatus,
            seats,
            quota: slot.quota,
            // Claiming a Seat is the common action, so it is offered where the
            // member already is. What the server will allow is re-checked there
            // under a row lock; this only decides what to put in front of them.
            action: slotActionFor({
                sessionId: session.id,
                status: session.status,
                date: session.date,
                startTime: session.startTime,
                fee: session.fee,
                ownStatus,
                seats,
                isJoined: context.joinedActivityIds.has(slot.activity.id),
                hasLiveDues: context.duesCoveredSessionIds.has(session.id),
                now: context.now,
            }),
        },
    };
}

/**
 * A standing weekly slot with nothing on it. It has no Session, so it has no
 * title of its own and nothing to open — the Activity names it and the neutral
 * chip says an Admin has not posted it. Never a No-Show: that void chip means
 * someone should have turned up and didn't, and missing data is not that.
 */
function unpostedSlot(
    slot: Extract<BoardSlot, { kind: 'unposted' }>,
    day: BoardDay,
): BoardSlotView {
    return {
        key: `${day.dayKey}:${slot.activity.id}`,
        cell: {
            day: null,
            title: slot.activity.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location,
            activityName: slot.activity.name,
            href: null,
            status: null,
            ownStatus: null,
            seats: null,
            quota: null,
            // Nothing to claim: there is no Session here yet to claim it in.
            action: null,
        },
    };
}

function slotView(
    slot: BoardSlot,
    day: BoardDay,
    context: BoardCopyContext,
): BoardSlotView {
    if (slot.kind === 'posted') return postedSlot(slot, day, context);
    return unpostedSlot(slot, day);
}

/** Every day, in order, none dropped — including the ones with nothing on them. */
export function boardDayViews(
    days: readonly BoardDay[],
    context: BoardCopyContext,
): BoardDayView[] {
    return days.map((day) => ({
        key: day.dayKey,
        heading: dayHeading(day, context.t),
        slots: day.slots.map((slot) => slotView(slot, day, context)),
    }));
}

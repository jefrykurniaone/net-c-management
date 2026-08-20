import type { AttendanceStatus } from '@prisma/client';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { BoardSeats } from '@/lib/sessions-board';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BoardDayView, BoardSlotView } from './sessions-board';

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
const COLUMN_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface BoardCopyContext {
    readonly t: Dictionary;
    readonly seatsBySession: ReadonlyMap<string, BoardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
}

/** The seven tracked-caps column heads, in the board's own order. */
export function weekdayHeads(t: Dictionary): string[] {
    return COLUMN_ORDER.map((weekday) => t.days[weekday]);
}

/** "18 August" — the day and its month, never a formatter's idea of either. */
export function monthDayLabel(date: Date, t: Dictionary): string {
    return `${date.getUTCDate()} ${t.months[date.getUTCMonth() + 1]}`;
}

/** The far end of the range carries the year, so a distant week says which. */
export function monthDayYearLabel(date: Date, t: Dictionary): string {
    return `${monthDayLabel(date, t)} ${date.getUTCFullYear()}`;
}

/** "Monday 18 August" — the row's label below the breakpoint, spoken above it. */
function dayHeading(day: BoardDay, t: Dictionary): string {
    return `${t.days[day.weekday]} ${day.dayOfMonth} ${t.months[day.monthNumber]}`;
}

function postedSlot(
    slot: Extract<BoardSlot, { kind: 'posted' }>,
    day: BoardDay,
    context: BoardCopyContext,
): BoardSlotView {
    const { session } = slot;
    return {
        key: session.id,
        cell: {
            dayLabel: context.t.sessions.boardDaysShort[day.weekday],
            dayOfMonth: day.dayOfMonth,
            title: session.title,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: slot.location,
            activityName: slot.activity.name,
            href: `/sessions/${session.id}`,
            status: session.status,
            ownStatus: context.ownBySession.get(session.id) ?? null,
            seats: context.seatsBySession.get(session.id) ?? null,
            quota: slot.quota,
        },
    };
}

/**
 * A standing weekly slot with nothing on it. It has no Session, so it has no
 * title of its own and nothing to open — the Activity names it and the Blank
 * mark says an Admin has not posted it. Never a No-Show: Hollow means someone
 * should have turned up and didn't, and missing data is not that.
 */
function unpostedSlot(
    slot: Extract<BoardSlot, { kind: 'unposted' }>,
    day: BoardDay,
    t: Dictionary,
): BoardSlotView {
    return {
        key: `${day.dayKey}:${slot.activity.id}`,
        cell: {
            dayLabel: t.sessions.boardDaysShort[day.weekday],
            dayOfMonth: day.dayOfMonth,
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
        },
    };
}

function slotView(
    slot: BoardSlot,
    day: BoardDay,
    context: BoardCopyContext,
): BoardSlotView {
    if (slot.kind === 'posted') return postedSlot(slot, day, context);
    return unpostedSlot(slot, day, context.t);
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

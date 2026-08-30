import type { AttendanceStatus } from '@prisma/client';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellData, SlotCellSeats } from '@/components/sessions/slot-cell';

/**
 * A `BoardSlot` plus its `BoardDay`, turned into a `SlotCellData` — the
 * dashboard's own version of `src/components/sessions/board-view.ts`'s
 * `slotView`. The one difference is `day`: the sessions board leaves it
 * `null` because its band already says the date for every row beneath it,
 * but the dashboard has no band, so `day` carries the short weekday and the
 * date instead (see `SlotCellData.day`).
 */

export interface DashboardSlotContext {
    readonly t: Dictionary;
    readonly seatsBySession: ReadonlyMap<string, SlotCellSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
}

function dayFigure(day: BoardDay, t: Dictionary): SlotCellData['day'] {
    return {
        label: t.sessions.boardDaysShort[day.weekday],
        dayOfMonth: day.dayOfMonth,
    };
}

function postedCell(
    slot: Extract<BoardSlot, { kind: 'posted' }>,
    day: BoardDay,
    context: DashboardSlotContext,
): SlotCellData {
    const { session } = slot;
    return {
        day: dayFigure(day, context.t),
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
    };
}

/**
 * A standing weekly slot with nothing posted. No title of its own and
 * nothing to open — the Activity names it and the neutral chip says an Admin
 * has not posted it yet.
 */
function unpostedCell(
    slot: Extract<BoardSlot, { kind: 'unposted' }>,
    day: BoardDay,
    t: Dictionary,
): SlotCellData {
    return {
        day: dayFigure(day, t),
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
    };
}

/** One `BoardSlot` on one `BoardDay`, as the data the Slot Cell draws. */
export function dashboardSlotCell(
    slot: BoardSlot,
    day: BoardDay,
    context: DashboardSlotContext,
): SlotCellData {
    if (slot.kind === 'posted') return postedCell(slot, day, context);
    return unpostedCell(slot, day, context.t);
}

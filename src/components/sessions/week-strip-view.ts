import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { BoardSeats } from '@/lib/sessions-board';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
    resolveSessionStanding,
    type SessionStanding,
} from '@/lib/session-standing';
import { slotActionFor } from './slot-action';
import type { SlotCellAction } from './slot-cell-data';
import { monthDayLabel } from './day-labels';

/**
 * `BoardDay` carries a day's situation and its numbers; the dictionary carries
 * the words. This is the seam between them for the week strip — the only place
 * on this surface that turns a weekday index into a name, and the reason no
 * component here calls a date formatter. A locale-aware formatter reads the
 * machine's zone, not WIB, which is how a Tuesday Session comes to advertise
 * itself as Monday.
 *
 * Nothing here decides a state or a permission. The standing comes from
 * `resolveSessionStanding` and the action from `slotActionFor`, both of them
 * shared with every other member surface (ADR 0003: the cards are each
 * surface's own, the resolvers are not).
 *
 * `BoardDay.weekday` and the dictionary's `days` are both Sunday-first because
 * `Activity.recurringDay` is; the strip reads Monday-first because a week of
 * sport does. One indexes, the other orders — and the ordering is the week
 * range's, not this module's.
 */

/**
 * The one sentence a card may carry under its venue line, never two. Nothing
 * beats an unposted slot's own sentence: it has no Session to have a standing
 * in. The reader's own withdrawal comes next, because it is about them.
 */
export type WeekCardNote = 'unposted' | 'optedOut' | null;

/** Everything one Session card draws. Data only — the card takes no nodes. */
export type WeekCardData = Readonly<{
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    activityName: string;
    /** `Activity.icon` as stored, or null for the initial tile. */
    activityIcon: string | null;
    /** `null` where there is nothing to open — an unposted standing slot. */
    href: string | null;
    /** `null` means unposted, and dims nothing: there is no Session to void. */
    status: SessionStatus | null;
    standing: SessionStanding;
    note: WeekCardNote;
    /** The claim or withdraw control, where the resolver offered one. */
    action: SlotCellAction | null;
    /** "Monday 18 August" — spoken into the card's own accessible name. */
    dayLabel: string;
}>;

export type WeekStripSlotView = Readonly<{ key: string; card: WeekCardData }>;

export type WeekStripDayView = Readonly<{
    key: string;
    /** "Monday" — the column head's visible label. */
    weekdayLabel: string;
    /** The date figure beside it. */
    dayOfMonth: number;
    /** "Monday 18 August" — the head's spoken form and each card's day. */
    heading: string;
    slots: readonly WeekStripSlotView[];
}>;

export interface WeekStripContext {
    readonly t: Dictionary;
    readonly seatsBySession: ReadonlyMap<string, BoardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    /** Payment deadlines on the reader's own held Seats — see `holdBySession`. */
    readonly holdBySession: ReadonlyMap<string, Date>;
    /** The Activities the member has joined — see `SlotActionInput.isJoined`. */
    readonly joinedActivityIds: ReadonlySet<string>;
    /**
     * The Sessions on this strip whose Seats cost this member nothing more,
     * their Dues for that billing period being live already — see
     * `SlotActionInput.hasLiveDues`.
     */
    readonly duesCoveredSessionIds: ReadonlySet<string>;
    /**
     * The instant the strip is read, which the RSVP window is measured against.
     * Defaults to the present; injectable so a caller can pin it.
     */
    readonly now?: Date;
}

/** "Monday 18 August" — the column head's spoken form. */
function dayHeading(day: BoardDay, t: Dictionary): string {
    return `${t.days[day.weekday]} ${monthDayLabel(day.date, t)}`;
}

function postedCard(
    slot: Extract<BoardSlot, { kind: 'posted' }>,
    dayLabel: string,
    context: WeekStripContext,
): WeekCardData {
    const { session } = slot;
    const ownStatus = context.ownBySession.get(session.id) ?? null;
    const seats = context.seatsBySession.get(session.id) ?? null;
    return {
        title: session.title,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        activityName: slot.activity.name,
        activityIcon: slot.activity.icon ?? null,
        href: `/sessions/${session.id}`,
        status: session.status,
        standing: resolveSessionStanding({
            status: session.status,
            ownStatus,
            holdExpiresAt: context.holdBySession.get(session.id) ?? null,
            seats,
        }),
        note: ownStatus === 'ABSENT' ? 'optedOut' : null,
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
        dayLabel,
    };
}

/**
 * A standing weekly slot with nothing on it. It has no Session, so it has no
 * title of its own and nothing to open — the Activity names it and the neutral
 * chip says an Admin has not posted it. Never a No-Show: that void chip means
 * someone should have turned up and didn't, and missing data is not that.
 */
function unpostedCard(
    slot: Extract<BoardSlot, { kind: 'unposted' }>,
    dayLabel: string,
): WeekCardData {
    return {
        title: slot.activity.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        activityName: slot.activity.name,
        activityIcon: slot.activity.icon ?? null,
        href: null,
        status: null,
        standing: resolveSessionStanding({
            status: null,
            ownStatus: null,
            seats: null,
        }),
        note: 'unposted',
        // Nothing to claim: there is no Session here yet to claim it in.
        action: null,
        dayLabel,
    };
}

function slotView(
    slot: BoardSlot,
    day: BoardDay,
    dayLabel: string,
    context: WeekStripContext,
): WeekStripSlotView {
    if (slot.kind === 'posted') {
        return {
            key: slot.session.id,
            card: postedCard(slot, dayLabel, context),
        };
    }
    return {
        key: `${day.dayKey}:${slot.activity.id}`,
        card: unpostedCard(slot, dayLabel),
    };
}

/** Every day, in order, none dropped — including the ones with nothing on them. */
export function weekStripDays(
    days: readonly BoardDay[],
    context: WeekStripContext,
): WeekStripDayView[] {
    return days.map((day) => {
        const heading = dayHeading(day, context.t);
        return {
            key: day.dayKey,
            weekdayLabel: context.t.days[day.weekday],
            dayOfMonth: day.dayOfMonth,
            heading,
            slots: day.slots.map((slot) =>
                slotView(slot, day, heading, context),
            ),
        };
    });
}

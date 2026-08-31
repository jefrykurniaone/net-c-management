import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { DashboardSeats } from '@/lib/dashboard-sessions';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
    resolveSessionStanding,
    type SessionStanding,
} from '@/lib/session-standing';
import { slotActionFor } from '@/components/sessions/slot-action';
import type { SlotCellAction } from '@/components/sessions/slot-cell-data';
import { monthDayLabel } from '@/components/sessions/day-labels';

/**
 * The dashboard's own Activity card body: this Activity's next Sessions,
 * flattened out of its {@link BoardDay} range into one ordered list of cards.
 *
 * **Why a flat list rather than the day-per-row board this ticket retires.**
 * The board drew every day of the range, empty ones included, because that is
 * what a *week* surface owes a reader (DESIGN.md's retired "every day gets a
 * cell" rule, kept for the week strip). The dashboard's Activity card is not a
 * week — it answers "what is next for this Activity", so a day with nothing on
 * it contributes nothing here; only a day with a posted Session or a standing
 * slot becomes a card. An Activity with nothing at all across the whole range
 * yields an empty list, which the card (`activity-summary-card.tsx`) draws as
 * one neutral-chipped sentence rather than a card per empty day.
 *
 * **Same resolvers as every other member Session card (ADR 0003).** Standing
 * comes from `resolveSessionStanding` and the action from `slotActionFor`,
 * exactly as the week strip's own `week-strip-view.ts` resolves them — this
 * file is a sibling of that one, not a caller of it, because ADR 0003 keeps
 * each surface's *view* as much its own as its *drawing*. `isJoined` is always
 * true here: the dashboard only ever renders the Activities in
 * `getUserActivityIds`, so there is no "browsing" case to withhold the claim
 * action for, unlike the sessions board's "all" view.
 */

export type DashboardCardNote = 'unposted' | 'optedOut' | null;

/** Everything one dashboard Session card draws. Data only, like `WeekCardData`. */
export type DashboardCardData = Readonly<{
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    activityName: string;
    activityIcon: string | null;
    href: string | null;
    /** `null` means unposted, and dims nothing: there is no Session to void. */
    status: SessionStatus | null;
    standing: SessionStanding;
    note: DashboardCardNote;
    action: SlotCellAction | null;
    /** "Tue 18 Aug" — this card's own date, since it carries no day band above it. */
    dateLabel: string;
    /** "Monday 18 August" — spoken into the card's own accessible name. */
    dayLabel: string;
}>;

export type DashboardCardView = Readonly<{ key: string; card: DashboardCardData }>;

export interface DashboardCardContext {
    readonly t: Dictionary;
    readonly seatsBySession: ReadonlyMap<string, DashboardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    readonly holdBySession: ReadonlyMap<string, Date>;
    readonly duesCoveredSessionIds: ReadonlySet<string>;
    /** Defaults to the present instant; injectable so a caller can pin it. */
    readonly now?: Date;
}

/** "Tue" — three letters, never a formatter's idea of the reader's own zone. */
function shortWeekdayLabel(day: BoardDay, t: Dictionary): string {
    return t.sessions.boardDaysShort[day.weekday];
}

function dateLabelOf(day: BoardDay, t: Dictionary): string {
    return `${shortWeekdayLabel(day, t)} ${monthDayLabel(day.date, t)}`;
}

function dayHeading(day: BoardDay, t: Dictionary): string {
    return `${t.days[day.weekday]} ${monthDayLabel(day.date, t)}`;
}

function postedCard(
    slot: Extract<BoardSlot, { kind: 'posted' }>,
    day: BoardDay,
    context: DashboardCardContext,
): DashboardCardData {
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
        action: slotActionFor({
            sessionId: session.id,
            status: session.status,
            date: session.date,
            startTime: session.startTime,
            fee: session.fee,
            ownStatus,
            seats,
            // The dashboard only ever draws the member's own joined Activities
            // (`getUserActivityIds`), so claiming here never enrols them in
            // something they were only browsing.
            isJoined: true,
            hasLiveDues: context.duesCoveredSessionIds.has(session.id),
            now: context.now,
        }),
        dateLabel: dateLabelOf(day, context.t),
        dayLabel: dayHeading(day, context.t),
    };
}

/**
 * A standing weekly slot with nothing on it. No Session to open and no title
 * of its own — the Activity names it, and the neutral chip says an Admin has
 * not posted it yet.
 */
function unpostedCard(
    slot: Extract<BoardSlot, { kind: 'unposted' }>,
    day: BoardDay,
    t: Dictionary,
): DashboardCardData {
    return {
        title: slot.activity.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        activityName: slot.activity.name,
        activityIcon: slot.activity.icon ?? null,
        href: null,
        status: null,
        standing: resolveSessionStanding({ status: null, ownStatus: null, seats: null }),
        note: 'unposted',
        action: null,
        dateLabel: dateLabelOf(day, t),
        dayLabel: dayHeading(day, t),
    };
}

function slotView(
    slot: BoardSlot,
    day: BoardDay,
    context: DashboardCardContext,
): DashboardCardView {
    if (slot.kind === 'posted') {
        return { key: slot.session.id, card: postedCard(slot, day, context) };
    }
    return {
        key: `${day.dayKey}:${slot.activity.id}`,
        card: unpostedCard(slot, day, context.t),
    };
}

/**
 * This Activity's next Sessions, in day-then-start-time order — the order
 * `days` already carries. A day with no slots contributes nothing: see this
 * module's header for why the dashboard drops the board's "every day gets a
 * cell" rule rather than carrying it over from the week strip.
 */
export function dashboardActivityCards(
    days: readonly BoardDay[],
    context: DashboardCardContext,
): DashboardCardView[] {
    const views: DashboardCardView[] = [];
    for (const day of days) {
        for (const slot of day.slots) {
            views.push(slotView(slot, day, context));
        }
    }
    return views;
}

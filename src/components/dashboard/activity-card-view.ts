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
 * The flat list, and the shared resolvers this reaches for, are argued in
 * `docs/adr/0014-member-session-card-conventions.md`.
 *
 * `isJoined` is always true here: the dashboard only ever renders the Activities
 * in `getUserActivityIds`, so there is no "browsing" case to withhold the claim
 * action for, unlike the sessions board's "all" view.
 */

export type DashboardCardNote = 'optedOut' | null;

/** Everything one dashboard Session card draws. Data only, like `WeekCardData`. */
export type DashboardCardData = Readonly<{
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    activityName: string;
    activityIcon: string | null;
    href: string;
    status: SessionStatus;
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
    slot: BoardSlot,
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
            views.push({
                key: slot.session.id,
                card: postedCard(slot, day, context),
            });
        }
    }
    return views;
}

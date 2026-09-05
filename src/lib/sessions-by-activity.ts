import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import type { SessionQuota } from './recurring-sessions';

/**
 * What the sessions page shows, decided before anything renders it.
 *
 * The board no longer reads as a week; it reads as one section per Activity,
 * each holding that Activity's own upcoming Sessions as cards. This module
 * turns the board's Activities and Sessions into that ordered shape: one
 * section per Activity, soonest-upcoming-session first, capped at six cards
 * unless the caller has narrowed the page to one Activity.
 *
 * A pure rule module (`docs/adr/0005-pure-rule-modules.md`): no `server-only`,
 * no Prisma value import (only its types, erased at compile time, the way
 * `board-days.ts` and `session-floor.ts` already do), no React, no clock of
 * its own — `today` is a parameter, always the caller's WIB day
 * (`docs/adr/0007-wib-calendar-day-storage.md`), never computed here. It also
 * formats no date into words; that is the caller's job, same as `board-days.ts`.
 */

/** Two full rows on a desktop grid; beyond that a section is what this page
 * exists to stop being. */
const SECTION_CARD_CAP = 6;

/** The Activity fields a section header draws. A Prisma row fits. */
export interface SectionActivity {
    readonly id: string;
    readonly name: string;
    readonly icon?: string | null;
}

export interface SessionCardSeats {
    readonly free: number;
    readonly max: number;
}

/** The `ActivitySession` fields, plus the member's own reading of it, a card draws. */
export interface SessionCard {
    readonly id: string;
    readonly activityId: string;
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly maxPlayers: number;
    readonly fee: number;
    readonly status: SessionStatus;
    readonly seats: SessionCardSeats;
    /** Absent where the reader holds no Seat and no history on this Session. */
    readonly ownStatus?: AttendanceStatus;
    /** A payment deadline still open against a claimed Seat; absent once cleared. */
    readonly holdExpiresAt?: Date;
    /** `null` where the caller read no quota for this Session. */
    readonly quota: SessionQuota | null;
    readonly isDuesCovered: boolean;
}

export interface SessionsByActivityInput {
    /** UTC midnight of the caller's WIB "today". Sessions before it are dropped. */
    readonly today: Date;
    /** The Activities in scope, in no particular order — this module orders them. */
    readonly activities: readonly SectionActivity[];
    /** Every Session for those Activities; sessions before `today` are excluded. */
    readonly sessions: readonly SessionCard[];
    readonly joinedActivityIds: ReadonlySet<string>;
    /** True once the caller has narrowed the page to one Activity — lifts the cap. */
    readonly isSingleActivitySelected: boolean;
}

export interface ActivitySection {
    readonly activity: SectionActivity;
    readonly isJoined: boolean;
    /** At most six, unless {@link SessionsByActivityInput.isSingleActivitySelected}. */
    readonly cards: readonly SessionCard[];
    /** The Activity's true count of upcoming Sessions, never the truncated one. */
    readonly total: number;
    readonly isTruncated: boolean;
}

function pushInto<K, T>(buckets: Map<K, T[]>, key: K, value: T): void {
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [value]);
    else bucket.push(value);
}

/** Only today-forward Sessions count, grouped by the Activity they belong to. */
function groupUpcomingByActivity(
    sessions: readonly SessionCard[],
    today: Date,
): Map<string, SessionCard[]> {
    const byActivity = new Map<string, SessionCard[]>();
    const cutoff = today.getTime();
    for (const card of sessions) {
        if (card.date.getTime() < cutoff) continue;
        pushInto(byActivity, card.activityId, card);
    }
    return byActivity;
}

/**
 * Date, then time, then id — the day builder's own tie-break
 * (`board-days.ts`'s `bySlotOrder`), minus the activity name and id it needs
 * and this never does: every card in one section already shares one Activity.
 */
function byCardOrder(left: SessionCard, right: SessionCard): number {
    const byDate = left.date.getTime() - right.date.getTime();
    if (byDate !== 0) return byDate;
    const byTime = left.startTime.localeCompare(right.startTime);
    if (byTime !== 0) return byTime;
    return left.id.localeCompare(right.id);
}

/** `null` for an Activity with nothing upcoming — sorted last, never by date. */
function soonestOf(cards: readonly SessionCard[]): number | null {
    if (cards.length === 0) return null;
    return Math.min(...cards.map((card) => card.date.getTime()));
}

function buildSection(
    activity: SectionActivity,
    cards: readonly SessionCard[],
    isJoined: boolean,
    isSingleActivitySelected: boolean,
): ActivitySection {
    const sorted = [...cards].sort(byCardOrder);
    const isTruncated = !isSingleActivitySelected && sorted.length > SECTION_CARD_CAP;
    return {
        activity,
        isJoined,
        cards: isSingleActivitySelected ? sorted : sorted.slice(0, SECTION_CARD_CAP),
        total: sorted.length,
        isTruncated,
    };
}

interface SectionRank {
    readonly section: ActivitySection;
    readonly soonest: number | null;
}

/**
 * Soonest date first; where two Activities meet on the same day, joined
 * sorts ahead of not; an Activity with nothing upcoming sorts last, in a
 * stable order among its peers (`Array.prototype.sort` is stable, so two
 * `null` ranks are never reordered relative to each other).
 */
function compareRanks(left: SectionRank, right: SectionRank): number {
    if (left.soonest === null && right.soonest === null) return 0;
    if (left.soonest === null) return 1;
    if (right.soonest === null) return -1;
    if (left.soonest !== right.soonest) return left.soonest - right.soonest;
    if (left.section.isJoined !== right.section.isJoined) {
        return left.section.isJoined ? -1 : 1;
    }
    return left.section.activity.id.localeCompare(right.section.activity.id);
}

/**
 * One section per Activity in scope, ordered soonest-upcoming-session first,
 * each holding that Activity's cards in date order, capped at six unless the
 * caller says a single Activity is selected. See this module's header for
 * what it deliberately leaves to its caller.
 */
export function buildSessionsByActivity(
    input: SessionsByActivityInput,
): ActivitySection[] {
    const byActivity = groupUpcomingByActivity(input.sessions, input.today);
    const ranks: SectionRank[] = input.activities.map((activity) => {
        const cards = byActivity.get(activity.id) ?? [];
        const section = buildSection(
            activity,
            cards,
            input.joinedActivityIds.has(activity.id),
            input.isSingleActivitySelected,
        );
        return { section, soonest: soonestOf(cards) };
    });
    return [...ranks].sort(compareRanks).map((rank) => rank.section);
}

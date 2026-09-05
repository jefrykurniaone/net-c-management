import 'server-only';
import type { SessionStatus } from '@prisma/client';
import type { SessionQuota } from './recurring-sessions';

/**
 * One honest answer to "what does a member see on a given day".
 *
 * That answer is **not** "the Sessions that exist". Sessions are generated on
 * demand (`ensureRecurringSessions`) and never seeded in production
 * (`prisma/seed-prod.ts` creates none; the development seeder does), so a board
 * driven purely
 * by existing `ActivitySession` rows shows nothing on a fresh community — which
 * reads as a bug when it is in fact the default state. The board's planned shape
 * therefore comes from the Sessions that exist, and nothing else — an Activity's
 * `recurringDay` is a fact about when it always meets, not a promise that a
 * Session is posted on it, and this module never turns the one into the other.
 *
 * Every day of the requested range gets an entry, in order, none skipped:
 * skipping empty days turns the board into a short list of cards, the
 * arrangement this world exists to refuse (DESIGN.md, Layout). Each day is
 * **posted** (a Session exists, carried with what a cell needs) or **empty**
 * (nothing posted, whether or not an Activity's recurring weekday falls here).
 * A day an Activity meets on every week used to draw a phantom card from
 * `recurringDay` alone, a rule wider than the one that actually creates
 * Sessions — `ensureRecurringSessions` also wants Monthly billing
 * (`recurring-sessions.ts`) — so an Activity with Monthly billing off got a
 * card no Admin action could ever clear (#334). Members now see a real row or
 * nothing.
 *
 * Three things this deliberately does not do. **It reads nothing** — data in,
 * data out, no Prisma, no React, no Next, so it is unit-testable without a DOM
 * the way `landing-board.ts` is, and the reads stay with the caller, the only
 * place that knows whose Activities these are. **It counts nothing** —
 * committed-versus-needed seats and the Activity's minimum-members viability
 * floor are `getSessionQuotas`' job (`src/lib/recurring-sessions.ts`); its
 * result arrives as {@link BoardDaysInput.quotas} and passes through untouched.
 * **It writes no copy** — day and month names and every chip label live in the
 * dictionary, so a day carries its situation and its numbers and the surface
 * resolves the words.
 *
 * Every field below is read with the `getUTC*` accessors
 * (`docs/adr/0007-wib-calendar-day-storage.md`).
 */

/** The Activity fields a board cell draws, posted or not. A Prisma row fits. */
export interface BoardActivity {
    readonly id: string;
    readonly name: string;
    /**
     * `Activity.icon` as stored — a curated key from `src/lib/activity-icons.ts`
     * or null for the initial. Optional so a caller that draws no livery need
     * not read the column; `ActivityTile` falls back to the initial either way.
     */
    readonly icon?: string | null;
    /** 0 (Sunday) – 6 (Saturday); `null` means no standing weekly slot. */
    readonly recurringDay: number | null;
    readonly recurringStartTime: string;
    readonly recurringEndTime: string;
    readonly defaultLocation: string;
}

/**
 * The `ActivitySession` fields a board cell draws. A Prisma row fits; the status
 * is carried raw so the surface resolves its chip through `resolveStatusChip`.
 */
export interface BoardSession {
    readonly id: string;
    readonly activityId: string;
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly title: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly maxPlayers: number;
    readonly fee: number;
    readonly status: SessionStatus;
}

/** Both range ends are **inclusive**, and both are read as WIB calendar days. */
export interface BoardRange {
    readonly start: Date;
    readonly end: Date;
}

export interface BoardDaysInput {
    readonly range: BoardRange;
    /** The member's Activities, in the order the board should read them. */
    readonly activities: readonly BoardActivity[];
    /**
     * The Sessions that exist in the range. Rows outside it are ignored, as are
     * rows for an Activity absent from {@link activities} — a cell cannot draw a
     * name it was not given, and both lists come from one read.
     */
    readonly sessions: readonly BoardSession[];
    /** `getSessionQuotas`' result, keyed by session id. Passed through as-is. */
    readonly quotas?: ReadonlyMap<string, SessionQuota>;
}

/**
 * One Activity's line on one day. Time and venue are always the Session's own —
 * a slot never exists without one.
 */
interface BoardSlotBase {
    readonly activity: BoardActivity;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
}

export type BoardSlot = BoardSlotBase & {
    readonly kind: 'posted';
    readonly session: BoardSession;
    /** `null` where the caller read no quota for this Session. */
    readonly quota: SessionQuota | null;
};

/**
 * The day's headline situation: `posted` where a Session is, `empty` where
 * none is. A cell reads its own {@link BoardSlot}; this is the day's.
 */
export type BoardDayKind = 'posted' | 'empty';

/**
 * `date` is UTC midnight of this WIB calendar day and `dayKey` its `YYYY-MM-DD`
 * form. `weekday` (0 = Sunday) indexes the dictionary's `days`, `monthNumber`
 * (1 = January) its `months`; `dayOfMonth` is the Slot Cell's Figure Lead.
 */
export interface BoardDay {
    readonly date: Date;
    readonly dayKey: string;
    readonly weekday: number;
    readonly dayOfMonth: number;
    readonly monthNumber: number;
    readonly year: number;
    readonly kind: BoardDayKind;
    /** Posted lines for this day, in reading order. */
    readonly slots: readonly BoardSlot[];
}

function utcDayStart(date: Date): Date {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

/** `Date.UTC` normalises day overflow, so this crosses months and years. */
function nextDay(day: Date): Date {
    return new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1),
    );
}

function dayKeyOf(date: Date): string {
    return utcDayStart(date).toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/**
 * Every day of the range, ascending, both ends included. An end before the start
 * yields none; so does a `NaN` date, which compares false instead of looping.
 */
function eachDay(range: BoardRange): Date[] {
    const end = utcDayStart(range.end).getTime();
    const days: Date[] = [];
    for (
        let day = utcDayStart(range.start);
        day.getTime() <= end;
        day = nextDay(day)
    ) {
        days.push(day);
    }
    return days;
}

/** A Session matched to the Activity whose line it sits on. */
interface PostedSession {
    readonly activity: BoardActivity;
    readonly session: BoardSession;
}

interface DayContext {
    readonly postedByDay: ReadonlyMap<string, PostedSession[]>;
    readonly quotas: ReadonlyMap<string, SessionQuota>;
}

function pushInto<K, T>(buckets: Map<K, T[]>, key: K, value: T): void {
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [value]);
    else bucket.push(value);
}

function groupSessionsByDay(
    sessions: readonly BoardSession[],
    activityById: ReadonlyMap<string, BoardActivity>,
): Map<string, PostedSession[]> {
    const byDay = new Map<string, PostedSession[]>();
    for (const session of sessions) {
        const activity = activityById.get(session.activityId);
        if (activity === undefined) continue;
        pushInto(byDay, dayKeyOf(session.date), { activity, session });
    }
    return byDay;
}

function postedSlots(day: Date, context: DayContext): BoardSlot[] {
    const posted = context.postedByDay.get(dayKeyOf(day)) ?? [];
    return posted.map(({ activity, session }) => ({
        kind: 'posted',
        activity,
        session,
        quota: context.quotas.get(session.id) ?? null,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
    }));
}

/** A day reads by the clock, then by name so two slots never swap on a re-read. */
function bySlotOrder(left: BoardSlot, right: BoardSlot): number {
    const byTime = left.startTime.localeCompare(right.startTime);
    if (byTime !== 0) return byTime;
    const byName = left.activity.name.localeCompare(right.activity.name);
    if (byName !== 0) return byName;
    return left.activity.id.localeCompare(right.activity.id);
}

function dayKind(slots: readonly BoardSlot[]): BoardDayKind {
    return slots.length > 0 ? 'posted' : 'empty';
}

function buildDay(day: Date, context: DayContext): BoardDay {
    const slots = postedSlots(day, context).sort(bySlotOrder);
    return {
        date: day,
        dayKey: dayKeyOf(day),
        weekday: day.getUTCDay(),
        dayOfMonth: day.getUTCDate(),
        monthNumber: day.getUTCMonth() + 1,
        year: day.getUTCFullYear(),
        kind: dayKind(slots),
        slots,
    };
}

/**
 * One entry per day of the range, ascending, none omitted — the board's shape
 * before anything renders. See this module's header for the two situations a
 * day can be in and for what this deliberately leaves to its caller.
 */
export function buildBoardDays(input: BoardDaysInput): BoardDay[] {
    const activityById = new Map(input.activities.map((one) => [one.id, one]));
    const context: DayContext = {
        postedByDay: groupSessionsByDay(input.sessions, activityById),
        quotas: input.quotas ?? new Map(),
    };
    return eachDay(input.range).map((day) => buildDay(day, context));
}

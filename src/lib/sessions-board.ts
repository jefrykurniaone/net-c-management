import 'server-only';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { releaseExpiredHolds } from './holds';
import { getUserActivityIds } from './activity';
import { getSessionQuotas, type SessionQuota } from './recurring-sessions';
import { buildBoardDays, type BoardActivity, type BoardDay } from './board-days';
import { wibDayStart, wibDayStartFromKey } from './wib';

/**
 * The one read behind the sessions board. `buildBoardDays` reads nothing and
 * counts nothing by design, so the database work — and only the database work —
 * lives here, in the one place that knows whose Activities these are.
 *
 * Capacity is untouched by this ticket and read exactly as the surface it
 * replaces read it: **only seat-holding rows count** (`REGISTERED` / `PRESENT`),
 * which is what makes a released Seat free capacity again, and the lazy hold
 * sweep runs first so an expired hold is not still holding a Seat when the
 * figures are taken. The Activity's minimum-members floor comes from
 * `getSessionQuotas`, reused rather than reimplemented.
 *
 * Dates are WIB throughout: a Session is stored as UTC midnight of its WIB
 * calendar day, so every day here is built with `Date.UTC` and read with the
 * `getUTC*` accessors. A locale-aware formatter would shift the day by whatever
 * zone the server runs in, which is how a Tuesday Session comes to advertise
 * itself as Monday.
 */

const DAYS_IN_WEEK = 7;
/** Days back from a Sunday to reach its Monday — the week's first column. */
const SUNDAY_SHIFT = DAYS_IN_WEEK - 1;
/** Anchored and fixed-length, so it cannot backtrack. */
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_KEY_LENGTH = 'YYYY-MM-DD'.length;

/**
 * The statuses that hold a Seat — money-critical, and unchanged by this ticket.
 * Mutable because Prisma's generated filter types take a mutable array.
 */
const SEAT_HOLDING: AttendanceStatus[] = ['REGISTERED', 'PRESENT'];

export type SessionsBoardView = 'mine' | 'all';

export interface BoardSeats {
    readonly free: number;
    readonly max: number;
}

export interface SessionsBoardData {
    readonly days: readonly BoardDay[];
    readonly weekStart: Date;
    readonly weekEnd: Date;
    readonly prevWeekKey: string;
    readonly thisWeekKey: string;
    readonly nextWeekKey: string;
    readonly seatsBySession: ReadonlyMap<string, BoardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    readonly quotas: ReadonlyMap<string, SessionQuota>;
    /** The Activities the board drew, after any single-Activity filter. */
    readonly activities: readonly BoardActivity[];
    /** Everything the filter may offer — the scoped list before filtering. */
    readonly offered: readonly BoardActivity[];
    readonly hasJoinedActivities: boolean;
    /** False only for a community that has never had a Session at all. */
    readonly hasAnySession: boolean;
}

export interface SessionsBoardParams {
    readonly userId: string;
    readonly view: SessionsBoardView;
    readonly activityId?: string;
    /** `YYYY-MM-DD`; any day in the wanted week. Invalid values fall back. */
    readonly weekKey?: string;
    readonly now?: Date;
}

function addDays(day: Date, delta: number): Date {
    return new Date(
        Date.UTC(
            day.getUTCFullYear(),
            day.getUTCMonth(),
            day.getUTCDate() + delta,
        ),
    );
}

function dayKeyOf(day: Date): string {
    return day.toISOString().slice(0, DAY_KEY_LENGTH);
}

/**
 * The Monday of the week containing `day`. The board reads Monday-first even
 * though `Activity.recurringDay` and the dictionary's `days` are Sunday-first —
 * those index a weekday, this orders columns.
 */
function weekStartOf(day: Date): Date {
    const back = (day.getUTCDay() + SUNDAY_SHIFT) % DAYS_IN_WEEK;
    return addDays(day, -back);
}

/** A malformed or absent `week` falls back to the current WIB week. */
export function resolveWeekStart(
    weekKey: string | undefined,
    now: Date,
): Date {
    if (weekKey !== undefined && DAY_KEY_PATTERN.test(weekKey)) {
        const asked = wibDayStartFromKey(weekKey);
        if (!Number.isNaN(asked.getTime())) return weekStartOf(asked);
    }
    return weekStartOf(wibDayStart(now));
}

const BOARD_ACTIVITY_SELECT = {
    id: true,
    name: true,
    recurringDay: true,
    recurringStartTime: true,
    recurringEndTime: true,
    defaultLocation: true,
} satisfies Prisma.ActivitySelect;

const BOARD_SESSION_SELECT = {
    id: true,
    activityId: true,
    date: true,
    title: true,
    startTime: true,
    endTime: true,
    location: true,
    maxPlayers: true,
    fee: true,
    status: true,
    _count: { select: { attendances: { where: { status: { in: SEAT_HOLDING } } } } },
} satisfies Prisma.ActivitySessionSelect;

type BoardSessionRow = Prisma.ActivitySessionGetPayload<{
    select: typeof BOARD_SESSION_SELECT;
}>;

/**
 * The Activities the board draws, and whether the member has joined any. "All"
 * exists for discovery, so it widens the board rather than emptying it.
 */
async function readActivities(params: SessionsBoardParams): Promise<{
    activities: BoardActivity[];
    offered: BoardActivity[];
    hasJoined: boolean;
}> {
    const [all, joinedIds] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: BOARD_ACTIVITY_SELECT,
        }),
        getUserActivityIds(params.userId),
    ]);
    const joined = new Set(joinedIds);
    const offered =
        params.view === 'all' ? all : all.filter((one) => joined.has(one.id));
    const activities = offered.some((one) => one.id === params.activityId)
        ? offered.filter((one) => one.id === params.activityId)
        : offered;
    return { activities, offered, hasJoined: joined.size > 0 };
}

function seatsOf(sessions: readonly BoardSessionRow[]): Map<string, BoardSeats> {
    const seats = new Map<string, BoardSeats>();
    for (const row of sessions) {
        const taken = row._count.attendances;
        seats.set(row.id, {
            free: Math.max(row.maxPlayers - taken, 0),
            max: row.maxPlayers,
        });
    }
    return seats;
}

async function readOwnSeats(
    userId: string,
    sessionIds: readonly string[],
): Promise<Map<string, AttendanceStatus>> {
    if (sessionIds.length === 0) return new Map();
    const rows = await prisma.attendance.findMany({
        where: { userId, sessionId: { in: [...sessionIds] } },
        select: { sessionId: true, status: true },
    });
    return new Map(rows.map((row) => [row.sessionId, row.status]));
}

/**
 * Every day of one week, whatever is or is not on them. The hold sweep runs
 * before the figures are read, never after.
 */
export async function getSessionsBoard(
    params: SessionsBoardParams,
): Promise<SessionsBoardData> {
    const now = params.now ?? new Date();
    const weekStart = resolveWeekStart(params.weekKey, now);
    const weekEnd = addDays(weekStart, SUNDAY_SHIFT);

    await releaseExpiredHolds();

    const { activities, offered, hasJoined } = await readActivities(params);

    /* The count is deliberately community-wide and unfiltered: the question it
       answers is "has an Admin ever posted a Session", which is what earns the
       board its own designed state. Scoping it to the filter would tell a
       member who narrowed to one quiet Activity that the community is new. */
    const [sessions, anySession] = await Promise.all([
        prisma.activitySession.findMany({
            where: {
                activityId: { in: activities.map((one) => one.id) },
                date: { gte: weekStart, lte: weekEnd },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            select: BOARD_SESSION_SELECT,
        }),
        prisma.activitySession.count(),
    ]);

    const [quotas, ownBySession] = await Promise.all([
        getSessionQuotas(sessions),
        readOwnSeats(
            params.userId,
            sessions.map((row) => row.id),
        ),
    ]);

    return {
        days: buildBoardDays({
            range: { start: weekStart, end: weekEnd },
            activities,
            sessions,
            quotas,
        }),
        weekStart,
        weekEnd,
        prevWeekKey: dayKeyOf(addDays(weekStart, -DAYS_IN_WEEK)),
        thisWeekKey: dayKeyOf(weekStartOf(wibDayStart(now))),
        nextWeekKey: dayKeyOf(addDays(weekStart, DAYS_IN_WEEK)),
        seatsBySession: seatsOf(sessions),
        ownBySession,
        quotas,
        activities,
        offered,
        hasJoinedActivities: hasJoined,
        hasAnySession: anySession > 0,
    };
}

import 'server-only';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { releaseExpiredHolds } from './holds';
import { getUserActivityIds } from './activity';
import { getSessionQuotas, type SessionQuota } from './recurring-sessions';
import { buildBoardDays, type BoardActivity, type BoardDay } from './board-days';
import { mondayOf } from './chart-weeks';
import { wibDayStart, wibDayStartFromKey } from './wib';
import { readFreeClaimPeriods, freeClaimKey } from './payments';
import { currentPeriod } from './payment-mode';

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
    /**
     * `Attendance.holdExpiresAt` for the reader's own rows that carry one — a
     * Seat claimed against money nobody has confirmed yet. Absent from the map
     * once the money is behind the Seat, which is what makes the strip's
     * Reserved chip and its deadline disappear on their own.
     */
    readonly holdBySession: ReadonlyMap<string, Date>;
    readonly quotas: ReadonlyMap<string, SessionQuota>;
    /** The Activities the board drew, after any single-Activity filter. */
    readonly activities: readonly BoardActivity[];
    /** Everything the filter may offer — the scoped list before filtering. */
    readonly offered: readonly BoardActivity[];
    /**
     * The Activities the member has actually joined. "All" draws Activities they
     * have not, and a one-tap claim on one of those would join them and open a
     * bill from a row that shows neither — so the offer is withheld there.
     */
    readonly joinedActivityIds: ReadonlySet<string>;
    /**
     * The Sessions on this board whose Seats this member claims without a bill,
     * their Dues for that Session's billing period being live already. It
     * decides whether a row offers "Claim a Seat" or "Claim & pay" — see
     * `readFreeClaimPeriods`.
     */
    readonly duesCoveredSessionIds: ReadonlySet<string>;
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
 * A malformed or absent `week` falls back to the current WIB week. The board
 * reads Monday-first even though `Activity.recurringDay` and the dictionary's
 * `days` are Sunday-first — those index a weekday, this orders columns.
 */
export function resolveWeekStart(
    weekKey: string | undefined,
    now: Date,
): Date {
    if (weekKey !== undefined && DAY_KEY_PATTERN.test(weekKey)) {
        const asked = wibDayStartFromKey(weekKey);
        if (!Number.isNaN(asked.getTime())) return mondayOf(asked);
    }
    return mondayOf(wibDayStart(now));
}

const BOARD_ACTIVITY_SELECT = {
    id: true,
    name: true,
    // The Activity's chosen livery (#145), drawn by `ActivityTile` (#164). Null
    // for an Activity that has none, which the tile answers with the initial.
    icon: true,
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
    joinedIds: ReadonlySet<string>;
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
    return {
        activities,
        offered,
        hasJoined: joined.size > 0,
        joinedIds: joined,
    };
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

/**
 * The week's Sessions whose Seats raise no bill for this member, resolved from
 * the Activity-and-period answer to the Session ids a row can look itself up
 * by. The view seam stays free of period arithmetic — and of any import from
 * the server-only payments module.
 */
function duesCoveredOf(
    sessions: readonly BoardSessionRow[],
    freeClaimKeys: ReadonlySet<string>,
): ReadonlySet<string> {
    const covered = new Set<string>();
    for (const row of sessions) {
        const { month, year } = currentPeriod(row.date);
        if (freeClaimKeys.has(freeClaimKey(row.activityId, month, year))) {
            covered.add(row.id);
        }
    }
    return covered;
}

interface OwnSeats {
    readonly statuses: Map<string, AttendanceStatus>;
    readonly holds: Map<string, Date>;
}

/**
 * The reader's own rows on this week's Sessions: what each one is, and the
 * payment deadline on the ones still held against unverified money. The hold
 * sweep has already run by the time this is called, so a deadline in the map is
 * one that has not lapsed.
 */
async function readOwnSeats(
    userId: string,
    sessionIds: readonly string[],
): Promise<OwnSeats> {
    if (sessionIds.length === 0) {
        return { statuses: new Map(), holds: new Map() };
    }
    const rows = await prisma.attendance.findMany({
        where: { userId, sessionId: { in: [...sessionIds] } },
        select: { sessionId: true, status: true, holdExpiresAt: true },
    });
    const holds = new Map<string, Date>();
    for (const row of rows) {
        if (row.holdExpiresAt !== null) holds.set(row.sessionId, row.holdExpiresAt);
    }
    return {
        statuses: new Map(rows.map((row) => [row.sessionId, row.status])),
        holds,
    };
}

/**
 * Every day of one week, whatever is or is not on them. The hold sweep runs
 * before the figures are read, never after.
 */
/**
 * The week's Sessions, and whether the community has *ever* had one.
 *
 * The count is deliberately community-wide and unfiltered: the question it
 * answers is "has an Admin ever posted a Session", which is what earns the
 * board its own designed state. Scoping it to the filter would tell a member
 * who narrowed to one quiet Activity that the community is new.
 */
async function readWeekSessions(
    activities: readonly BoardActivity[],
    weekStart: Date,
    weekEnd: Date,
): Promise<{ sessions: BoardSessionRow[]; hasAnySession: boolean }> {
    const [sessions, anySession] = await Promise.all([
        prisma.activitySession.findMany({
            where: {
                activityId: { in: activities.map((one) => one.id) },
                // Up to the *end* of the last day, not its midnight. A Session
                // is meant to be stored at UTC midnight of its WIB day, but a
                // row carrying any time of day would otherwise fall out of the
                // week — and a Session missing from the board does not read as
                // missing, it reads as an Admin who never posted it.
                date: { gte: weekStart, lt: addDays(weekEnd, 1) },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            select: BOARD_SESSION_SELECT,
        }),
        prisma.activitySession.count(),
    ]);
    return { sessions, hasAnySession: anySession > 0 };
}

/** The three weeks the nav can reach from the one on screen. */
function weekKeys(
    weekStart: Date,
    now: Date,
): { prevWeekKey: string; thisWeekKey: string; nextWeekKey: string } {
    return {
        prevWeekKey: dayKeyOf(addDays(weekStart, -DAYS_IN_WEEK)),
        thisWeekKey: dayKeyOf(mondayOf(wibDayStart(now))),
        nextWeekKey: dayKeyOf(addDays(weekStart, DAYS_IN_WEEK)),
    };
}

/**
 * Every read the board needs for one week, in the order their dependencies
 * allow: the Activities decide which Sessions to ask for, and the Sessions
 * decide which quotas and own-Seat rows to ask for.
 */
async function readBoard(
    params: SessionsBoardParams,
    weekStart: Date,
    weekEnd: Date,
) {
    const { activities, offered, hasJoined, joinedIds } =
        await readActivities(params);
    const { sessions, hasAnySession } = await readWeekSessions(
        activities,
        weekStart,
        weekEnd,
    );
    const [quotas, ownSeats, freeClaimKeys] = await Promise.all([
        getSessionQuotas(sessions),
        readOwnSeats(
            params.userId,
            sessions.map((row) => row.id),
        ),
        readFreeClaimPeriods({
            userId: params.userId,
            // A week can straddle a month end, so the period is taken from each
            // Session's own date rather than from the week's.
            periods: sessions.map((row) => ({
                activityId: row.activityId,
                ...currentPeriod(row.date),
            })),
        }),
    ]);
    return {
        activities,
        offered,
        hasJoined,
        joinedIds,
        sessions,
        hasAnySession,
        quotas,
        ownBySession: ownSeats.statuses,
        holdBySession: ownSeats.holds,
        duesCoveredSessionIds: duesCoveredOf(sessions, freeClaimKeys),
    };
}

export async function getSessionsBoard(
    params: SessionsBoardParams,
): Promise<SessionsBoardData> {
    const now = params.now ?? new Date();
    const weekStart = resolveWeekStart(params.weekKey, now);
    const weekEnd = addDays(weekStart, SUNDAY_SHIFT);

    await releaseExpiredHolds();
    const read = await readBoard(params, weekStart, weekEnd);

    return {
        days: buildBoardDays({
            range: { start: weekStart, end: weekEnd },
            activities: read.activities,
            sessions: read.sessions,
            quotas: read.quotas,
        }),
        weekStart,
        weekEnd,
        ...weekKeys(weekStart, now),
        seatsBySession: seatsOf(read.sessions),
        ownBySession: read.ownBySession,
        holdBySession: read.holdBySession,
        quotas: read.quotas,
        activities: read.activities,
        offered: read.offered,
        joinedActivityIds: read.joinedIds,
        duesCoveredSessionIds: read.duesCoveredSessionIds,
        hasJoinedActivities: read.hasJoined,
        hasAnySession: read.hasAnySession,
    };
}

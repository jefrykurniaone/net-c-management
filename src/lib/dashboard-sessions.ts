import 'server-only';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { buildBoardDays, type BoardActivity, type BoardDay } from './board-days';
import { wibDayStart } from './wib';
import { readFreeClaimPeriods, freeClaimKey } from './payments';
import { currentPeriod } from './payment-mode';

/**
 * The dashboard's own small board: for each Activity a member has joined, the
 * next {@link DASHBOARD_RANGE_DAYS} days — today included — with every day
 * getting an entry, exactly as `buildBoardDays` promises. A day with nothing
 * posted and nothing planned is as real an answer as a day with a Session on
 * it, so empty days are not filtered out here either; the caller (#160's own
 * `activity-card-view.ts`) decides how to draw them — a day with no slots at
 * all contributes no card, rather than an empty-day cell the way the retired
 * board drew one.
 *
 * This mirrors `src/lib/sessions-board.ts`'s read, scoped down for the
 * dashboard: no week navigation, no "mine"/"all" toggle — the dashboard only
 * ever shows the member's own Activities, so `isJoined` is always true there
 * and needs no set of its own — and one small board per Activity rather than
 * one shared lattice, because the dashboard keeps its existing per-Activity
 * grouping (payment mode, identity) and only rebuilds how each Activity's
 * Sessions render inside it.
 *
 * `holdBySession` and `duesCoveredSessionIds` are read the same way
 * `sessions-board.ts` reads them, so the dashboard's own compact cards can
 * resolve the held-Seat standing and the claim/withdraw action through the
 * very same `resolveSessionStanding` / `slotActionFor` seams the week strip
 * uses (ADR 0003: the resolvers are shared, the drawing is not). The two reads
 * are not extracted into one shared helper: the row types the two callers
 * start from differ (`DashboardSessionRow` here, `BoardSessionRow` there) and
 * neither file owns the other.
 *
 * Dates are WIB throughout, for the reason `sessions-board.ts` gives: a
 * Session is stored as UTC midnight of its WIB calendar day, so the range is
 * built from `wibDayStart` rather than the server's own midnight.
 */

/** Today through the sixth day after it — a week, starting from today. */
const DASHBOARD_RANGE_DAYS = 7;
const RANGE_END_OFFSET = DASHBOARD_RANGE_DAYS - 1;

/** Only seat-holding rows count — the same rule `sessions-board.ts` reads by. */
const SEAT_HOLDING: AttendanceStatus[] = ['REGISTERED', 'PRESENT'];

export interface DashboardSeats {
    readonly free: number;
    readonly max: number;
}

/** One Activity's own board: its days, none skipped, over the shared range. */
export interface DashboardActivityBoard {
    readonly activityId: string;
    readonly activityName: string;
    readonly days: readonly BoardDay[];
}

export interface DashboardSessionsBoard {
    readonly boards: readonly DashboardActivityBoard[];
    readonly seatsBySession: ReadonlyMap<string, DashboardSeats>;
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    /**
     * `Attendance.holdExpiresAt` for the reader's own rows that carry one — a
     * Seat claimed against money nobody has confirmed yet. Absent once the
     * money is behind the Seat.
     */
    readonly holdBySession: ReadonlyMap<string, Date>;
    /**
     * The Sessions on this board whose Seats this member claims without a
     * bill, their Dues for that Session's billing period being live already.
     */
    readonly duesCoveredSessionIds: ReadonlySet<string>;
}

export interface DashboardSessionsParams {
    readonly userId: string;
    /** The member's joined, active Activities — same scope as "Your activities". */
    readonly activityIds: readonly string[];
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

const DASHBOARD_ACTIVITY_SELECT = {
    id: true,
    name: true,
    // The Activity's chosen livery (#145), drawn by `ActivityTile` (#164).
    icon: true,
    recurringDay: true,
    recurringStartTime: true,
    recurringEndTime: true,
    defaultLocation: true,
} satisfies Prisma.ActivitySelect;

const DASHBOARD_SESSION_SELECT = {
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

type DashboardSessionRow = Prisma.ActivitySessionGetPayload<{
    select: typeof DASHBOARD_SESSION_SELECT;
}>;

function seatsOf(
    sessions: readonly DashboardSessionRow[],
): Map<string, DashboardSeats> {
    const seats = new Map<string, DashboardSeats>();
    for (const row of sessions) {
        const taken = row._count.attendances;
        seats.set(row.id, {
            free: Math.max(row.maxPlayers - taken, 0),
            max: row.maxPlayers,
        });
    }
    return seats;
}

interface OwnSeats {
    readonly statuses: ReadonlyMap<string, AttendanceStatus>;
    readonly holds: ReadonlyMap<string, Date>;
}

/**
 * The reader's own rows on these Sessions: what each one is, and the payment
 * deadline on the ones still held against unverified money. Mirrors
 * `sessions-board.ts`'s `readOwnSeats`.
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
 * The Sessions on this board whose Seats raise no bill for this member,
 * resolved from the Activity-and-period answer to the Session ids a card can
 * look itself up by. Mirrors `sessions-board.ts`'s `duesCoveredOf`.
 */
function duesCoveredOf(
    sessions: readonly DashboardSessionRow[],
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

/** `buildBoardDays` called once per Activity, so each keeps its own range. */
function boardsOf(
    activities: readonly BoardActivity[],
    sessions: readonly DashboardSessionRow[],
    range: { start: Date; end: Date },
): DashboardActivityBoard[] {
    return activities.map((activity) => ({
        activityId: activity.id,
        activityName: activity.name,
        days: buildBoardDays({
            range,
            activities: [activity],
            sessions: sessions.filter((s) => s.activityId === activity.id),
        }),
    }));
}

const EMPTY_BOARD: DashboardSessionsBoard = {
    boards: [],
    seatsBySession: new Map(),
    ownBySession: new Map(),
    holdBySession: new Map(),
    duesCoveredSessionIds: new Set(),
};

interface DashboardRange {
    readonly start: Date;
    readonly end: Date;
}

/** The Activities and Sessions in range, in the one order their read allows. */
async function readActivitiesAndSessions(
    activityIds: readonly string[],
    range: DashboardRange,
): Promise<{ activities: BoardActivity[]; sessions: DashboardSessionRow[] }> {
    const activities = await prisma.activity.findMany({
        where: { id: { in: [...activityIds] }, isActive: true },
        orderBy: { name: 'asc' },
        select: DASHBOARD_ACTIVITY_SELECT,
    });
    const sessions = await prisma.activitySession.findMany({
        where: {
            activityId: { in: activities.map((a) => a.id) },
            // Up to the end of the last day — see the same bound in
            // `sessions-board.ts`: a row stored with a time of day would
            // otherwise drop out of the range and read as never posted.
            date: { gte: range.start, lt: addDays(range.end, 1) },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        select: DASHBOARD_SESSION_SELECT,
    });
    return { activities, sessions };
}

/**
 * One small board per Activity, covering today through the sixth day after
 * it. An empty `activityIds` list (no joined Activities) skips every read.
 */
export async function getDashboardSessionsBoard(
    params: DashboardSessionsParams,
): Promise<DashboardSessionsBoard> {
    if (params.activityIds.length === 0) {
        return EMPTY_BOARD;
    }

    const start = wibDayStart(params.now ?? new Date());
    const end = addDays(start, RANGE_END_OFFSET);
    const { activities, sessions } = await readActivitiesAndSessions(
        params.activityIds,
        { start, end },
    );

    const [ownSeats, freeClaimKeys] = await Promise.all([
        readOwnSeats(
            params.userId,
            sessions.map((s) => s.id),
        ),
        readFreeClaimPeriods({
            userId: params.userId,
            // The range can straddle a month end, so the period is taken
            // from each Session's own date rather than from the range's.
            periods: sessions.map((row) => ({
                activityId: row.activityId,
                ...currentPeriod(row.date),
            })),
        }),
    ]);

    return {
        boards: boardsOf(activities, sessions, { start, end }),
        seatsBySession: seatsOf(sessions),
        ownBySession: ownSeats.statuses,
        holdBySession: ownSeats.holds,
        duesCoveredSessionIds: duesCoveredOf(sessions, freeClaimKeys),
    };
}

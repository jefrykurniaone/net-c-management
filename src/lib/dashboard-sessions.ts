import 'server-only';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { getSessionQuotas, type SessionQuota } from './recurring-sessions';
import { buildBoardDays, type BoardActivity, type BoardDay } from './board-days';
import { wibDayStart } from './wib';

/**
 * The dashboard's own small board: for each Activity a member has joined, the
 * next {@link DASHBOARD_RANGE_DAYS} days — today included — with every day
 * getting an entry, exactly as `buildBoardDays` promises. A day with nothing
 * posted and nothing planned is as real an answer as a day with a Session on
 * it, so empty days are not filtered out here either; the caller decides how
 * to draw them (`src/components/dashboard/activity-day-cells.tsx`).
 *
 * This mirrors `src/lib/sessions-board.ts`'s read, scoped down for the
 * dashboard: no week navigation, no "mine"/"all" toggle — the dashboard only
 * ever shows the member's own Activities — and one small board per Activity
 * rather than one shared lattice, because the dashboard keeps its existing
 * per-Activity grouping (dues, Activity identity) and only rebuilds how each
 * Activity's Sessions render inside it.
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
    readonly quotas: ReadonlyMap<string, SessionQuota>;
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

async function readOwnAttendance(
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

/** `buildBoardDays` called once per Activity, so each keeps its own range. */
function boardsOf(
    activities: readonly BoardActivity[],
    sessions: readonly DashboardSessionRow[],
    quotas: ReadonlyMap<string, SessionQuota>,
    range: { start: Date; end: Date },
): DashboardActivityBoard[] {
    return activities.map((activity) => ({
        activityId: activity.id,
        activityName: activity.name,
        days: buildBoardDays({
            range,
            activities: [activity],
            sessions: sessions.filter((s) => s.activityId === activity.id),
            quotas,
        }),
    }));
}

/**
 * One small board per Activity, covering today through the sixth day after
 * it. An empty `activityIds` list (no joined Activities) skips every read.
 */
export async function getDashboardSessionsBoard(
    params: DashboardSessionsParams,
): Promise<DashboardSessionsBoard> {
    if (params.activityIds.length === 0) {
        return {
            boards: [],
            seatsBySession: new Map(),
            ownBySession: new Map(),
            quotas: new Map(),
        };
    }

    const start = wibDayStart(params.now ?? new Date());
    const end = addDays(start, RANGE_END_OFFSET);

    const activities = await prisma.activity.findMany({
        where: { id: { in: [...params.activityIds] }, isActive: true },
        orderBy: { name: 'asc' },
        select: DASHBOARD_ACTIVITY_SELECT,
    });
    const sessions = await prisma.activitySession.findMany({
        where: {
            activityId: { in: activities.map((a) => a.id) },
            // Up to the end of the last day — see the same bound in
            // `sessions-board.ts`: a row stored with a time of day would
            // otherwise drop out of the range and read as never posted.
            date: { gte: start, lt: addDays(end, 1) },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        select: DASHBOARD_SESSION_SELECT,
    });
    const [quotas, ownBySession] = await Promise.all([
        getSessionQuotas(sessions),
        readOwnAttendance(
            params.userId,
            sessions.map((s) => s.id),
        ),
    ]);

    return {
        boards: boardsOf(activities, sessions, quotas, { start, end }),
        seatsBySession: seatsOf(sessions),
        ownBySession,
        quotas,
    };
}

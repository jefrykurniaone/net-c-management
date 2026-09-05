import 'server-only';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { releaseExpiredHolds } from './holds';
import { getUserActivityIds } from './activity';
import { getSessionQuotas, type SessionQuota } from './recurring-sessions';
import type { SectionActivity, SessionCard } from './sessions-by-activity';
import { wibDayStart } from './wib';
import { readFreeClaimPeriods, freeClaimKey } from './payments';
import { currentPeriod } from './payment-mode';

/**
 * The one read behind the sessions board. `buildSessionsByActivity` reads
 * nothing and counts nothing by design, so the database work — and only the
 * database work — lives here, in the one place that knows whose Activities these
 * are. The board resolves no range of its own: the page shows every Session from
 * today forward, so there is no window to steer and no week to compute.
 *
 * Capacity is untouched by this ticket and read exactly as the surface it
 * replaces read it: **only seat-holding rows count** (`REGISTERED` / `PRESENT`),
 * which is what makes a released Seat free capacity again, and the lazy hold
 * sweep runs first so an expired hold is not still holding a Seat when the
 * figures are taken. The Activity's minimum-members floor comes from
 * `getSessionQuotas`, reused rather than reimplemented.
 *
 * Every day here is read with the `getUTC*` accessors
 * (`docs/adr/0007-wib-calendar-day-storage.md`).
 */

/**
 * The statuses that hold a Seat — money-critical, and unchanged by this ticket.
 * Mutable because Prisma's generated filter types take a mutable array.
 */
const SEAT_HOLDING: AttendanceStatus[] = ['REGISTERED', 'PRESENT'];

export type SessionsBoardView = 'mine' | 'all';

export interface SessionsBoardData {
    /** UTC midnight of the reader's WIB today — the page's floor, and the
     *  cutoff `buildSessionsByActivity` groups against. */
    readonly today: Date;
    readonly sessions: readonly SessionCard[];
    /**
     * Each Session's own title, keyed by id, one entry per row in
     * {@link sessions}. It rides beside the cards rather than on them because
     * `SessionCard` is the ordering module's shape and carries no copy — and a
     * card still speaks its title into its accessible name
     * (`docs/adr/0018-session-cards-outside-a-week.md`).
     */
    readonly titleBySession: ReadonlyMap<string, string>;
    /** The Activities the board drew, after any single-Activity filter. */
    readonly activities: readonly SectionActivity[];
    /** Everything the filter may offer — the scoped list before filtering. */
    readonly offered: readonly SectionActivity[];
    /**
     * The Activities the member has actually joined. "All" draws Activities they
     * have not, and a one-tap claim on one of those would join them and open a
     * bill from a card that shows neither — so the offer is withheld there.
     */
    readonly joinedActivityIds: ReadonlySet<string>;
    /** True once the page is narrowed to one Activity, which lifts the card cap. */
    readonly isSingleActivitySelected: boolean;
    readonly hasJoinedActivities: boolean;
    /** False only for a community that has never had a Session at all. */
    readonly hasAnySession: boolean;
}

export interface SessionsBoardParams {
    readonly userId: string;
    readonly view: SessionsBoardView;
    readonly activityId?: string;
    readonly now?: Date;
}

const BOARD_ACTIVITY_SELECT = {
    id: true,
    name: true,
    // The Activity's chosen livery (#145), drawn by `ActivityTile` (#164). Null
    // for an Activity that has none, which the tile answers with the initial.
    icon: true,
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

interface ReadActivities {
    readonly activities: SectionActivity[];
    readonly offered: SectionActivity[];
    readonly hasJoined: boolean;
    readonly joinedIds: ReadonlySet<string>;
    readonly isSingleActivitySelected: boolean;
}

/**
 * The Activities the board draws, and whether the member has joined any. "All"
 * exists for discovery, so it widens the board rather than emptying it.
 */
async function readActivities(
    params: SessionsBoardParams,
): Promise<ReadActivities> {
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
    const isSingleActivitySelected = offered.some(
        (one) => one.id === params.activityId,
    );
    return {
        activities: isSingleActivitySelected
            ? offered.filter((one) => one.id === params.activityId)
            : offered,
        offered,
        hasJoined: joined.size > 0,
        joinedIds: joined,
        isSingleActivitySelected,
    };
}

/**
 * The Sessions whose Seats raise no bill for this member, resolved from the
 * Activity-and-period answer to the Session ids a card can look itself up by.
 * The view seam stays free of period arithmetic — and of any import from the
 * server-only payments module.
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
 * The reader's own rows on the Sessions on screen: what each one is, and the
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
        if (row.holdExpiresAt !== null) {
            holds.set(row.sessionId, row.holdExpiresAt);
        }
    }
    return {
        statuses: new Map(rows.map((row) => [row.sessionId, row.status])),
        holds,
    };
}

/**
 * Every Session from today forward, and whether the community has *ever* had
 * one.
 *
 * The count is deliberately community-wide and unfiltered: the question it
 * answers is "has an Admin ever posted a Session", which is what earns the
 * board its own designed state. Scoping it to the filter would tell a member
 * who narrowed to one quiet Activity that the community is new.
 */
async function readUpcomingSessions(
    activities: readonly SectionActivity[],
    today: Date,
): Promise<{ sessions: BoardSessionRow[]; hasAnySession: boolean }> {
    const [sessions, anySession] = await Promise.all([
        prisma.activitySession.findMany({
            where: {
                activityId: { in: activities.map((one) => one.id) },
                date: { gte: today },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
            select: BOARD_SESSION_SELECT,
        }),
        prisma.activitySession.count(),
    ]);
    return { sessions, hasAnySession: anySession > 0 };
}

interface CardFacts {
    readonly ownBySession: ReadonlyMap<string, AttendanceStatus>;
    readonly holdBySession: ReadonlyMap<string, Date>;
    readonly quotas: ReadonlyMap<string, SessionQuota>;
    readonly duesCoveredSessionIds: ReadonlySet<string>;
}

/**
 * A read row plus the reader's own standing in it. Free Seats are capacity
 * minus the seat-holding rows the select already counted, floored at zero so an
 * over-filled Session never reads as negative capacity.
 */
function cardsOf(
    rows: readonly BoardSessionRow[],
    facts: CardFacts,
): SessionCard[] {
    return rows.map((row) => ({
        id: row.id,
        activityId: row.activityId,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        location: row.location,
        maxPlayers: row.maxPlayers,
        fee: row.fee,
        status: row.status,
        seats: {
            free: Math.max(row.maxPlayers - row._count.attendances, 0),
            max: row.maxPlayers,
        },
        ownStatus: facts.ownBySession.get(row.id),
        holdExpiresAt: facts.holdBySession.get(row.id),
        quota: facts.quotas.get(row.id) ?? null,
        isDuesCovered: facts.duesCoveredSessionIds.has(row.id),
    }));
}

/**
 * Every read the board needs, in the order their dependencies allow: the
 * Activities decide which Sessions to ask for, and the Sessions decide which
 * quotas and own-Seat rows to ask for.
 */
async function readBoard(params: SessionsBoardParams, today: Date) {
    const scope = await readActivities(params);
    const { sessions, hasAnySession } = await readUpcomingSessions(
        scope.activities,
        today,
    );
    const [quotas, ownSeats, freeClaimKeys] = await Promise.all([
        getSessionQuotas(sessions),
        readOwnSeats(
            params.userId,
            sessions.map((row) => row.id),
        ),
        readFreeClaimPeriods({
            userId: params.userId,
            // The page spans month ends, so the period is taken from each
            // Session's own date rather than from the range's.
            periods: sessions.map((row) => ({
                activityId: row.activityId,
                ...currentPeriod(row.date),
            })),
        }),
    ]);
    return {
        scope,
        hasAnySession,
        cards: cardsOf(sessions, {
            ownBySession: ownSeats.statuses,
            holdBySession: ownSeats.holds,
            quotas,
            duesCoveredSessionIds: duesCoveredOf(sessions, freeClaimKeys),
        }),
        titleBySession: new Map(sessions.map((row) => [row.id, row.title])),
    };
}

/**
 * Every upcoming Session the reader is in scope for, unordered and ungrouped —
 * `buildSessionsByActivity` decides the sections. The hold sweep runs before the
 * figures are read, never after.
 */
export async function getSessionsBoard(
    params: SessionsBoardParams,
): Promise<SessionsBoardData> {
    const today = wibDayStart(params.now ?? new Date());

    await releaseExpiredHolds();
    const read = await readBoard(params, today);

    return {
        today,
        sessions: read.cards,
        titleBySession: read.titleBySession,
        activities: read.scope.activities,
        offered: read.scope.offered,
        joinedActivityIds: read.scope.joinedIds,
        isSingleActivitySelected: read.scope.isSingleActivitySelected,
        hasJoinedActivities: read.scope.hasJoined,
        hasAnySession: read.hasAnySession,
    };
}

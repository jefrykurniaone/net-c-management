import 'server-only';
import type { Prisma, SessionStatus } from '@prisma/client';
import { releaseExpiredHolds } from '@/lib/holds';
import { prisma } from '@/lib/prisma';
import { getSessionQuotas, type SessionQuota } from '@/lib/recurring-sessions';
import { resolveSessionFloor, type SessionFloor } from '@/lib/session-floor';
import {
    canReopenSession,
    isSessionClosed,
    SEAT_HOLDING_STATUSES,
} from '@/lib/session-lock';

/**
 * Everything the Sessions register reads, in one place.
 *
 * Capacity counts **only seat-holding rows** (`REGISTERED` / `PRESENT`), the
 * same set the board and the locking rules count, and the lazy hold sweep runs
 * before any figure is taken — an expired hold is not a held Seat, and a row
 * that said otherwise would send an Admin cancelling a Session that is fuller
 * than it looks.
 *
 * The cost-sharing floor is `getSessionQuotas`', reused rather than
 * recomputed: the weighting that makes a per-Session joiner half a monthly
 * member lives there, and a second implementation of it here is a second answer
 * to a question the community's money depends on.
 *
 * Whether a Session can be reopened is decided **here**, by the same helper the
 * route refuses with, and travels to the row as a boolean. A client that
 * compared the Session's date against its own clock would be reading the
 * browser's day, and the rule is the WIB day — the two disagree for seven hours
 * of every one of them.
 */

/** One Session as the register draws it. */
export type SessionRegisterRow = Readonly<{
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    status: SessionStatus;
    activityName: string;
    /** `Activity.icon` as stored; null renders the initial — see `ActivityBadge`. */
    activityIcon: string | null;
    /** Seats held right now, after the sweep. */
    heldSeats: number;
    maxPlayers: number;
    /** Null where the Activity sets no minimum — see `resolveSessionFloor`. */
    floor: SessionFloor | null;
    /** Completed or Cancelled: nothing here is the Admin's to change but notes. */
    isClosed: boolean;
    /** Cancelled, and its WIB day has not passed: the one way back to Scheduled. */
    canReopen: boolean;
}>;

/** What the query string said about this page, already sanitised. */
export type SessionQuery = Readonly<{
    search: string;
    activityId: string;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number | undefined;
    take: number | undefined;
}>;

/** The column a register with no `sortBy` in its query reads down. */
export const DEFAULT_SORT_COL = 'date';

/** The columns the register offers a sort control on, and nothing else. */
const VALID_SORT_COLS = ['date', 'title', 'status', 'location'];

const SESSION_SELECT = {
    id: true,
    title: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    maxPlayers: true,
    status: true,
    activityId: true,
    activity: { select: { name: true, icon: true } },
    _count: {
        select: {
            attendances: { where: { status: { in: SEAT_HOLDING_STATUSES } } },
        },
    },
} satisfies Prisma.ActivitySessionSelect;

type SessionRecord = Prisma.ActivitySessionGetPayload<{
    select: typeof SESSION_SELECT;
}>;

function buildOrderBy(
    query: SessionQuery,
): Prisma.ActivitySessionOrderByWithRelationInput {
    const col = VALID_SORT_COLS.includes(query.sortBy)
        ? query.sortBy
        : DEFAULT_SORT_COL;
    return { [col]: query.sortDir };
}

function buildWhere(query: SessionQuery): Prisma.ActivitySessionWhereInput {
    const activity = query.activityId
        ? { activityId: query.activityId }
        : {};
    const search = query.search
        ? {
              OR: [
                  {
                      title: {
                          contains: query.search,
                          mode: 'insensitive' as const,
                      },
                  },
                  {
                      location: {
                          contains: query.search,
                          mode: 'insensitive' as const,
                      },
                  },
              ],
          }
        : {};
    return { ...activity, ...search };
}

function toRow(
    record: SessionRecord,
    quotas: ReadonlyMap<string, SessionQuota>,
    now: Date,
): SessionRegisterRow {
    return {
        id: record.id,
        title: record.title,
        date: record.date,
        startTime: record.startTime,
        endTime: record.endTime,
        location: record.location,
        status: record.status,
        activityName: record.activity.name,
        activityIcon: record.activity.icon,
        heldSeats: record._count.attendances,
        maxPlayers: record.maxPlayers,
        floor: resolveSessionFloor(quotas.get(record.id)),
        isClosed: isSessionClosed(record.status),
        canReopen: canReopenSession(record.status, record.date, now),
    };
}

/** The page's whole read: the rows it draws and the count it pages against. */
export async function loadSessions(
    query: SessionQuery,
): Promise<{ rows: SessionRegisterRow[]; total: number }> {
    await releaseExpiredHolds();
    const where = buildWhere(query);
    const [sessions, total] = await Promise.all([
        prisma.activitySession.findMany({
            where,
            orderBy: buildOrderBy(query),
            skip: query.skip,
            take: query.take,
            select: SESSION_SELECT,
        }),
        prisma.activitySession.count({ where }),
    ]);

    const quotas = await getSessionQuotas(
        sessions.map((row) => ({ id: row.id, activityId: row.activityId })),
    );
    // One instant for the whole page, so two rows on the same day cannot answer
    // the reopening question differently because the clock turned mid-map.
    const now = new Date();
    return { rows: sessions.map((row) => toRow(row, quotas, now)), total };
}

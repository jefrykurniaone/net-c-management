import type { AttendanceStatus } from '@prisma/client';

/**
 * The body `GET /api/sessions/[id]` returns — built key by key, never handed
 * over.
 *
 * The route used to serialise the Prisma result straight to the response, so
 * every Attendance column reached every admitted member. `holdExpiresAt` is
 * the one that matters: it is another member's payment standing — who has
 * claimed a Seat without paying for it, and when their hold lapses. No surface
 * shows that about anyone but the reader, and a member's payment standing is
 * not something this product shares sideways.
 *
 * The narrowing lives here, in a pure function, rather than only in the
 * query's `select`, because a `select` widened back to an `include` by a later
 * edit widens the response with it and says nothing. Nothing below spreads a
 * row, so a re-widened query changes nothing a caller can see, and
 * `session-detail-response.test.ts` enumerates the keys an entry may carry.
 */

/** The attendee identity the players card renders. Narrowed at the query since
 *  before this file existed, and kept exactly as it was. */
export interface SessionDetailResponseUser {
    readonly id: string;
    readonly name: string | null;
    readonly image: string | null;
}

/** One Attendance row as the query reads it. A row carrying more columns than
 *  these serialises to the same entry — `note`, `userId`, `createdAt` and
 *  `updatedAt` are rendered by no surface and never ship. */
export interface SessionDetailAttendanceRow {
    readonly id: string;
    readonly status: AttendanceStatus;
    readonly holdExpiresAt: Date | null;
    readonly user: SessionDetailResponseUser;
}

/**
 * One Attendance row as the response carries it. `holdExpiresAt` is optional
 * because it is the reader's own hold or nothing at all: on every other
 * member's entry the key is absent rather than null. Null is a real answer —
 * "this Seat is not on hold" — and the response has no business giving that
 * answer about somebody else.
 */
export interface SessionDetailAttendance {
    readonly id: string;
    readonly status: AttendanceStatus;
    readonly user: SessionDetailResponseUser;
    readonly holdExpiresAt?: Date | null;
}

/** The whole body: the Session as queried, with its Attendance rows narrowed. */
export type SessionDetailResponse<T> = Omit<T, 'attendances'> & {
    readonly attendances: readonly SessionDetailAttendance[];
};

/** One entry, with the hold expiry only where the reader is the attendee. */
function toAttendance(
    row: SessionDetailAttendanceRow,
    viewerId: string,
): SessionDetailAttendance {
    const entry: SessionDetailAttendance = {
        id: row.id,
        status: row.status,
        user: {
            id: row.user.id,
            name: row.user.name,
            image: row.user.image,
        },
    };
    if (row.user.id !== viewerId) {
        return entry;
    }
    return { ...entry, holdExpiresAt: row.holdExpiresAt };
}

/**
 * The Session detail body for one reader. `viewerId` is the requesting
 * member's own `User.id`; the only row whose hold expiry survives is the one
 * whose `user.id` equals it. Row order is the query's own and is preserved —
 * the players card reads it as the join order.
 *
 * Everything outside the Attendance relation passes through: this ticket
 * narrows what the attendee rows say, not what the Session row says.
 */
export function toSessionDetailResponse<
    T extends { readonly attendances: readonly SessionDetailAttendanceRow[] },
>(activitySession: T, viewerId: string): SessionDetailResponse<T> {
    const { attendances, ...session } = activitySession;
    return {
        ...session,
        attendances: attendances.map((row) => toAttendance(row, viewerId)),
    };
}

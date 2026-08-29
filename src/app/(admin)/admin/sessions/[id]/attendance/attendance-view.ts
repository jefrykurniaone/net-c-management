import type {
    AttendanceStatus,
    PaymentMode,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';

/**
 * The shape one attendance register crosses the server/client boundary in.
 *
 * Kept apart from the read (`attendance-rows.ts`) on purpose: that module is
 * `server-only` and reaches Prisma, and the client component needs these types
 * and the notice id. A single value imported from a server module drags the
 * database driver into the browser bundle, which is a build error, not a
 * warning — so the shared surface lives here, free of both.
 */

/**
 * Whether money stands behind this Seat, as the register renders it. A Session
 * with no fee has no money column at all — see `hasFee` — so "nothing to charge"
 * is not one of these: a column reading "No fee" forty times says nothing.
 */
export type MoneyStanding =
    /** A Payment stands against it, at whatever standing an Admin left it. */
    | Readonly<{ kind: 'sent'; status: PaymentStatus }>
    /** Nothing has been sent. Nobody has placed it — a Blank, not a failure. */
    | Readonly<{ kind: 'none' }>;

/** One Participant's row, as it crosses to the client component. */
export type AttendanceRegisterRow = Readonly<{
    /** The `Attendance` id — the register keys its rows on it. */
    id: string;
    userId: string;
    name: string | null;
    /** The visible value only — null where an Owner's email is withheld. */
    email: string | null;
    /** True where this row's Owner email was withheld from the viewer, set by
     * `attendance-rows.ts`'s row mapping; never re-decided here. */
    isContactWithheld: boolean;
    /** What is stored right now. The Admin's uncommitted edit lives elsewhere. */
    status: AttendanceStatus;
    mode: PaymentMode | null;
    money: MoneyStanding;
}>;

/** The Session's own facts, for the heading and the untaken rule. */
export type AttendanceSessionFacts = Readonly<{
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    status: SessionStatus;
    activityName: string;
}>;

export type AttendanceRegisterData = Readonly<{
    session: AttendanceSessionFacts;
    rows: readonly AttendanceRegisterRow[];
    /** Whether this Session charges a Fee at all — the money column's condition. */
    hasFee: boolean;
}>;

/** Ties the untaken sentence to the save form that it qualifies. */
export const UNTAKEN_NOTICE_ID = 'attendance-untaken';

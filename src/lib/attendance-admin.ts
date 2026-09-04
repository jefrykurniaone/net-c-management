import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import { WIB_OFFSET_MS } from './wib';

/**
 * The pure rules behind the attendance register: what an Admin may set, what a
 * bulk save is allowed to contain, which rows a save actually writes, and when a
 * Session's attendance counts as untaken.
 *
 * A pure rule module (`docs/adr/0005-pure-rule-modules.md`): the register's
 * client component and the bulk route both read it. `AttendanceStatus` is
 * imported as a type and its values written as literals in a mutable array
 * (`docs/adr/0009-prisma-enums-as-types.md`).
 */

/**
 * What an Admin may set by hand, and — by construction, not by coincidence — the
 * set of rows an attendance register lists. `MAYBE` is out of both for the same
 * reason: it is the member's own tentative RSVP, it holds no Seat, and it is
 * never an Admin's judgement about them. `NO_SHOW` is in, because an Admin
 * recording one deliberately is the only way a No-Show is ever written
 * (docs/adr/0001-no-show-attendance-value.md).
 *
 * The single-row route `src/app/api/sessions/[id]/attendance/manual/route.ts`
 * holds an equivalent literal of its own; this ticket was not allowed to edit
 * that file, so the two are stated separately and the follow-up is a one-line
 * import swap there.
 */
export const ADMIN_SETTABLE_STATUSES: AdminSettableStatus[] = [
    'REGISTERED',
    'PRESENT',
    'ABSENT',
    'NO_SHOW',
];

/** A status an Admin may set. `MAYBE` is the member's own, never an Admin's. */
export type AdminSettableStatus = Exclude<AttendanceStatus, 'MAYBE'>;

/** One row of a bulk save: whose Seat, and what the Admin recorded against it. */
export type BulkAttendanceRow = Readonly<{
    userId: string;
    status: AdminSettableStatus;
}>;

/**
 * Why a payload was refused. Machine strings: the register shows its own
 * translated failure sentence, and these name the fault for a developer.
 */
export type BulkPayloadError =
    | 'ROWS_MISSING'
    | 'ROWS_EMPTY'
    | 'ROWS_TOO_MANY'
    | 'ROW_INVALID'
    | 'DUPLICATE_USER'
    | 'USER_NOT_ON_SESSION';

export type BulkParseResult =
    | Readonly<{ ok: true; rows: BulkAttendanceRow[] }>
    | Readonly<{ ok: false; error: BulkPayloadError }>;

/**
 * A ceiling on one save, so a malformed or hostile payload cannot open a
 * transaction of unbounded size. Attendance is unique per member per Session, so
 * a real list is bounded by the community's membership; this is well past it.
 */
export const MAX_BULK_ATTENDANCE_ROWS = 500;

function isAdminSettableStatus(value: unknown): value is AdminSettableStatus {
    return (
        typeof value === 'string' &&
        ADMIN_SETTABLE_STATUSES.some((allowed) => allowed === value)
    );
}

/** One row, or `null` where it is not a `{ userId, status }` an Admin may set. */
function parseRow(value: unknown): BulkAttendanceRow | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const { userId, status } = value as Record<string, unknown>;
    if (typeof userId !== 'string' || userId.length === 0) {
        return null;
    }
    if (!isAdminSettableStatus(status)) {
        return null;
    }
    return { userId, status };
}

/**
 * The whole payload, validated before anything is written.
 *
 * Every row must name a member who already holds or held a Seat on this Session,
 * must carry a status an Admin may set, and must appear once. One bad row fails
 * the whole payload — a save is all of the list or none of it, which is the
 * point of doing it in one transaction.
 */
export function parseBulkAttendance(
    body: unknown,
    seatedUserIds: ReadonlySet<string>,
): BulkParseResult {
    const rows = (body as { rows?: unknown } | null)?.rows;
    if (!Array.isArray(rows)) {
        return { ok: false, error: 'ROWS_MISSING' };
    }
    if (rows.length === 0) {
        return { ok: false, error: 'ROWS_EMPTY' };
    }
    if (rows.length > MAX_BULK_ATTENDANCE_ROWS) {
        return { ok: false, error: 'ROWS_TOO_MANY' };
    }
    const parsed: BulkAttendanceRow[] = [];
    const seen = new Set<string>();
    for (const raw of rows) {
        const row = parseRow(raw);
        if (row === null) {
            return { ok: false, error: 'ROW_INVALID' };
        }
        if (seen.has(row.userId)) {
            return { ok: false, error: 'DUPLICATE_USER' };
        }
        if (!seatedUserIds.has(row.userId)) {
            return { ok: false, error: 'USER_NOT_ON_SESSION' };
        }
        seen.add(row.userId);
        parsed.push(row);
    }
    return { ok: true, rows: parsed };
}

/**
 * The rows a save actually writes: the ones whose recorded value differs from
 * what is stored. A row the Admin never touched is never written, so opening the
 * register and saving leaves the Session's statuses *and* its timestamps exactly
 * as they were — the spec's "never derived" rule applied to the save.
 */
export function rowsNeedingWrite(
    rows: readonly BulkAttendanceRow[],
    stored: ReadonlyMap<string, AttendanceStatus>,
): BulkAttendanceRow[] {
    return rows.filter((row) => stored.get(row.userId) !== row.status);
}

/** One row of the register, as far as these rules are concerned. */
export type RecordedRow = Readonly<{
    userId: string;
    status: AttendanceStatus;
}>;

/** The Admin's uncommitted edits, keyed by the member whose row they change. */
export type AttendanceEdits = Readonly<Record<string, AdminSettableStatus>>;

/** What a row reads as on screen: the Admin's edit, else what is stored. */
export function draftStatusOf(
    row: RecordedRow,
    edits: AttendanceEdits,
): AttendanceStatus {
    return edits[row.userId] ?? row.status;
}

/** The rows the Admin changed, in register order — the whole of what Save sends. */
export function changedRows(
    rows: readonly RecordedRow[],
    edits: AttendanceEdits,
): BulkAttendanceRow[] {
    const changed: BulkAttendanceRow[] = [];
    for (const row of rows) {
        const edit = edits[row.userId];
        if (edit !== undefined && edit !== row.status) {
            changed.push({ userId: row.userId, status: edit });
        }
    }
    return changed;
}

/**
 * Edits the server has caught up with, dropped. Called when fresh rows arrive
 * after a save: an edit that now matches what is stored has landed and stops
 * being an edit, and one that does not is kept, so a save in flight never blinks
 * back to the value the Admin just replaced.
 *
 * Returns the same object when nothing was dropped, so it is safe to feed
 * straight back into state.
 */
export function pruneAppliedEdits(
    rows: readonly RecordedRow[],
    edits: AttendanceEdits,
): AttendanceEdits {
    const kept: Record<string, AdminSettableStatus> = {};
    for (const row of rows) {
        const edit = edits[row.userId];
        if (edit !== undefined && edit !== row.status) {
            kept[row.userId] = edit;
        }
    }
    const isUnchanged =
        Object.keys(kept).length === Object.keys(edits).length;
    return isUnchanged ? edits : kept;
}

/**
 * "Mark everyone Present" as a **prefill**: every row reading Registered right
 * now moves to Present, and nothing is written until Save. A row already
 * recorded as Opted Out or No-Show is left alone — the shortcut is for the
 * common case, not a way to overwrite a decision somebody already made.
 */
export function prefillPresent(
    rows: readonly RecordedRow[],
    edits: AttendanceEdits,
): AttendanceEdits {
    const next: Record<string, AdminSettableStatus> = { ...edits };
    for (const row of rows) {
        if (draftStatusOf(row, edits) === 'REGISTERED') {
            next[row.userId] = 'PRESENT';
        }
    }
    return next;
}

/** Minutes in an hour, for reading `endTime` off its `HH:MM` face. */
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
/** `HH:MM` has exactly two parts; anything else is not a time we can read. */
const TIME_PART_COUNT = 2;

/**
 * The instant a Session ends. `date` is stored as UTC midnight of its WIB
 * calendar day and `endTime` is a WIB wall-clock face, so the end is that
 * midnight plus the face, pulled back into real time by the WIB offset.
 *
 * An unreadable `endTime` falls back to the start of the day, which can only
 * make a Session look ended sooner — never later, and never a No-Show, because
 * nothing here writes one.
 */
export function sessionEndInstant(
    session: Readonly<{ date: Date; endTime: string }>,
): Date {
    const parts = session.endTime.split(':');
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const isReadable =
        parts.length === TIME_PART_COUNT &&
        Number.isFinite(hours) &&
        Number.isFinite(minutes);
    const wibMinutes = isReadable ? hours * MINUTES_PER_HOUR + minutes : 0;
    return new Date(
        session.date.getTime() + wibMinutes * MS_PER_MINUTE - WIB_OFFSET_MS,
    );
}

/** The Session facts the untaken rule reads. */
export type UntakenInput = Readonly<{
    status: SessionStatus;
    date: Date;
    endTime: string;
    rows: readonly RecordedRow[];
}>;

/**
 * Whether this Session's attendance has not been taken — an Admin's omission,
 * stated plainly, and **never** turned into a No-Show for anybody.
 *
 * True when the Session is not Cancelled, is over (its status is `COMPLETED`, or
 * its `date` + `endTime` in WIB is already past), and every listed row is still
 * `REGISTERED`. A Session nobody claimed a Seat on has nothing to take, so an
 * empty list is not an omission.
 */
export function isAttendanceUntaken(
    session: UntakenInput,
    now: Date,
): boolean {
    if (session.status === 'CANCELLED' || session.rows.length === 0) {
        return false;
    }
    const hasEnded =
        session.status === 'COMPLETED' ||
        sessionEndInstant(session).getTime() <= now.getTime();
    if (!hasEnded) {
        return false;
    }
    return session.rows.every((row) => row.status === 'REGISTERED');
}

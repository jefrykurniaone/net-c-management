import type {
    AttendanceStatus,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';
import { wibDayStart } from '@/lib/wib';

/**
 * When a Session stops being the Admin's to edit or to destroy, and why.
 *
 * A Session's fee is frozen once money is behind it, and a Completed or
 * Cancelled Session is history rather than a plan. Both rules are enforced in
 * `PATCH /api/sessions/[id]` and merely *reflected* in the edit form — a
 * read-only control is a courtesy, the refusal is the rule — so the rules
 * themselves live here, free of Prisma, `server-only` and React, and are read by
 * the route and the form alike.
 *
 * **The one exception to Closed** is a reopening: a **Cancelled** Session whose
 * WIB calendar day has not passed may be sent back to `SCHEDULED`, and nothing
 * else may change in the same request. A Completed Session is never reopened, a
 * Cancelled Session whose day has passed stays cancelled, and a body that also
 * renames or reprices the Session is not a reopening — it is the edit the Closed
 * rule refuses. The day is the **WIB** day (`wibDayStart`), never the server's
 * own: a Session is stored at UTC midnight of its WIB calendar day, so a server
 * running in UTC would call a Session past from 07:00 WIB, mid-morning of the
 * day it happens on. `now` is a parameter for the same reason the counts are —
 * these rules read no clock and no database of their own.
 *
 * **Destroying a Session** is the same facts read for a different write, and has
 * its own resolver, `resolveDeleteRefusal`: money behind it refuses, Completed
 * refuses, and a Cancelled Session with nothing behind it may go.
 *
 * `AttendanceStatus`, `PaymentStatus` and `SessionStatus` are imported as
 * **types** and the values written as string literals checked against them:
 * importing the generated enums as values would drag the Prisma client into the
 * browser bundle for the sake of a handful of strings. Each set is an explicitly
 * typed **mutable** array, which is what a Prisma `in` filter takes — never a
 * `readonly` one and never a `const` assertion.
 */

/**
 * The statuses that hold a Seat, and the same set capacity is counted against.
 * An `ABSENT` (Opted Out) or `NO_SHOW` row holds no Seat. Counted only after
 * `releaseExpiredHolds()`, so a lapsed hold neither locks a fee nor floors
 * capacity.
 */
export const SEAT_HOLDING_STATUSES: AttendanceStatus[] = [
    'REGISTERED',
    'PRESENT',
];

/**
 * Money behind a Session: a Payment awaiting a decision, or one already
 * Confirmed. A `REJECTED` proof is money that was never accepted, which is the
 * same filter `getSessionQuotas` uses for live per-Session payers.
 */
export const LIVE_PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'CONFIRMED'];

/** Closed: the Session has happened or has been called off. */
const CLOSED_STATUSES: SessionStatus[] = ['COMPLETED', 'CANCELLED'];

export function isSessionClosed(status: SessionStatus): boolean {
    return CLOSED_STATUSES.includes(status);
}

/** What the stored row says about whether it is still editable. */
export type SessionLockFacts = Readonly<{
    /** Seats held right now, after the hold sweep. */
    heldSeats: number;
    hasLivePayment: boolean;
    /** `status` as **stored**, before this request. */
    isClosed: boolean;
}>;

/** The two counts every caller reads, turned into the facts the rules take. */
export function toSessionLockFacts(
    counts: Readonly<{ attendances: number; payments: number }>,
    status: SessionStatus,
): SessionLockFacts {
    return {
        heldSeats: counts.attendances,
        hasLivePayment: counts.payments > 0,
        isClosed: isSessionClosed(status),
    };
}

/** Held Seats, or Payments, or both — either one freezes the fee. */
export function isMoneyBehind(facts: SessionLockFacts): boolean {
    return facts.heldSeats > 0 || facts.hasLivePayment;
}

/** The stored Session, as far as these rules are concerned. */
export type StoredSession = Readonly<{
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    maxPlayers: number;
    fee: number;
    notes: string | null;
    status: SessionStatus;
}>;

/** The body after zod: every field optional, `date` a `yyyy-MM-dd` face. */
export type SessionPatch = Readonly<{
    title?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    maxPlayers?: number;
    fee?: number;
    notes?: string;
    status?: SessionStatus;
}>;

/**
 * Why a write was refused. Stable codes, beside the translated sentence.
 *
 * `SESSION_CLOSED` is raised by both writes and names the same fact either way —
 * this Session is Closed — though the sentence a caller reads differs, because
 * the write being refused differs.
 */
export type SessionLockReason =
    | 'SESSION_CLOSED'
    | 'SESSION_PAST'
    | 'SESSION_HAS_MONEY'
    | 'FEE_LOCKED'
    | 'CAPACITY_BELOW_HELD';

/** A refusal carries the figure its sentence names. */
export type SessionRefusal = Readonly<{
    reason: SessionLockReason;
    heldSeats: number;
}>;

function isTextChanged(sent: string | undefined, stored: string): boolean {
    return sent !== undefined && sent !== stored;
}

function isNumberChanged(sent: number | undefined, stored: number): boolean {
    return sent !== undefined && sent !== stored;
}

/**
 * A `yyyy-MM-dd` face against the stored instant. A Session is stored at UTC
 * midnight of its WIB calendar day and `new Date('yyyy-MM-dd')` parses as UTC
 * midnight, so the two compare exactly, in whatever zone the server runs in.
 */
function isDateChanged(sent: string | undefined, stored: Date): boolean {
    if (sent === undefined) {
        return false;
    }
    return new Date(sent).getTime() !== stored.getTime();
}

type FieldCheck = (stored: StoredSession, patch: SessionPatch) => boolean;

/**
 * Every locked field but `status`. A field the form sent **unchanged** is not an
 * edit: the edit form posts its whole payload, so a notes-only save on a
 * Completed Session carries every other field at its stored value and has to
 * succeed.
 */
const FIELD_CHECKS_BUT_STATUS: readonly FieldCheck[] = [
    (stored, patch) => isTextChanged(patch.title, stored.title),
    (stored, patch) => isDateChanged(patch.date, stored.date),
    (stored, patch) => isTextChanged(patch.startTime, stored.startTime),
    (stored, patch) => isTextChanged(patch.endTime, stored.endTime),
    (stored, patch) => isTextChanged(patch.location, stored.location),
    (stored, patch) => isNumberChanged(patch.maxPlayers, stored.maxPlayers),
    (stored, patch) => isNumberChanged(patch.fee, stored.fee),
];

const isStatusChanged: FieldCheck = (stored, patch) =>
    patch.status !== undefined && patch.status !== stored.status;

/** Every field a Closed Session locks — which is all of them but `notes`. */
const LOCKED_FIELD_CHECKS: readonly FieldCheck[] = [
    ...FIELD_CHECKS_BUT_STATUS,
    isStatusChanged,
];

/**
 * Whether this body changes anything but the notes. `status` is in the set: the
 * rule is "every field read-only except notes", so the only standing a Closed
 * Session can be sent is the reopening judged below.
 */
export function hasLockedFieldEdit(
    stored: StoredSession,
    patch: SessionPatch,
): boolean {
    return LOCKED_FIELD_CHECKS.some((check) => check(stored, patch));
}

/** Whether the Session's own WIB calendar day is already behind `now`. */
function isDayPast(date: Date, now: Date): boolean {
    return date.getTime() < wibDayStart(now).getTime();
}

/**
 * Whether the body changes anything a reopening may not. `notes` is counted here
 * and nowhere else: reopening is a **status-only** write, so a body that also
 * writes a note is an edit to a Closed Session rather than a reopening. A stored
 * `null` and a sent empty string are the same absent note, not a change.
 */
function hasEditBesidesStatus(
    stored: StoredSession,
    patch: SessionPatch,
): boolean {
    if (isTextChanged(patch.notes, stored.notes ?? '')) {
        return true;
    }
    return FIELD_CHECKS_BUT_STATUS.some((check) => check(stored, patch));
}

/** What the reopening rule makes of a body: allowed, too late, or not one. */
type ReopenVerdict = 'REOPEN' | 'PAST' | 'NOT_REOPEN';

function judgeReopen(
    stored: StoredSession,
    patch: SessionPatch,
    now: Date,
): ReopenVerdict {
    const isReopenBody =
        stored.status === 'CANCELLED' &&
        patch.status === 'SCHEDULED' &&
        !hasEditBesidesStatus(stored, patch);
    if (!isReopenBody) {
        return 'NOT_REOPEN';
    }
    return isDayPast(stored.date, now) ? 'PAST' : 'REOPEN';
}

/**
 * Whether a stored Session may be reopened right now — the same fact as the
 * `REOPEN` verdict, read straight off the row, for the surfaces that decide
 * whether to *offer* the move. The refusal is the rule; this only keeps a
 * control from being drawn for a write the route is going to refuse.
 */
export function canReopenSession(
    status: SessionStatus,
    date: Date,
    now: Date,
): boolean {
    return status === 'CANCELLED' && !isDayPast(date, now);
}

/**
 * The one answer both the route and the form read, in the order the rules are
 * checked: Closed first — bar a reopening — then the frozen fee, then capacity
 * against the Seats already held. `null` is a write that may proceed.
 *
 * Capacity **equal** to the held Seats is allowed — it fits everyone who holds
 * one and only refuses new claims.
 *
 * A reopening falls through to the money rules rather than returning early. It
 * changes neither fee nor capacity, so the only way it can be caught there is a
 * stored row that already seats fewer than it holds — which is the state the
 * route's row lock exists to prevent.
 */
export function resolveSessionRefusal(
    stored: StoredSession,
    patch: SessionPatch,
    facts: SessionLockFacts,
    now: Date,
): SessionRefusal | null {
    const { heldSeats } = facts;
    if (facts.isClosed && hasLockedFieldEdit(stored, patch)) {
        const verdict = judgeReopen(stored, patch, now);
        if (verdict === 'PAST') {
            return { reason: 'SESSION_PAST', heldSeats };
        }
        if (verdict === 'NOT_REOPEN') {
            return { reason: 'SESSION_CLOSED', heldSeats };
        }
    }
    if (!isMoneyBehind(facts)) {
        return null;
    }
    if (isNumberChanged(patch.fee, stored.fee)) {
        return { reason: 'FEE_LOCKED', heldSeats };
    }
    if (patch.maxPlayers !== undefined && patch.maxPlayers < heldSeats) {
        return { reason: 'CAPACITY_BELOW_HELD', heldSeats };
    }
    return null;
}

/**
 * Whether a Session may be destroyed, and why not.
 *
 * Money behind it is the first refusal, and the one that was answering with a
 * 500: a Session a live Payment names cannot be deleted at all, because
 * `Payment.session` is `onDelete: Restrict` (`prisma/schema.prisma:280`), so
 * Prisma throws where the route should be saying no. A held Seat counts as money
 * here for the same reason it freezes the fee. The fix the sentence names is to
 * **cancel** the Session instead, which keeps both the record and the Seats.
 *
 * A **Completed** Session is what happened, and stays. A **Cancelled** one with
 * nothing behind it may go: it is a plan that was called off rather than a
 * record of anything.
 */
export function resolveDeleteRefusal(
    stored: StoredSession,
    facts: SessionLockFacts,
): SessionRefusal | null {
    const { heldSeats } = facts;
    if (isMoneyBehind(facts)) {
        return { reason: 'SESSION_HAS_MONEY', heldSeats };
    }
    if (stored.status === 'COMPLETED') {
        return { reason: 'SESSION_CLOSED', heldSeats };
    }
    return null;
}

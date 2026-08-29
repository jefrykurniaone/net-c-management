import type {
    AttendanceStatus,
    PaymentStatus,
    SessionStatus,
} from '@prisma/client';

/**
 * When a Session stops being the Admin's to edit, and why.
 *
 * A Session's fee is frozen once money is behind it, and a Completed or
 * Cancelled Session is history rather than a plan. Both rules are enforced in
 * `PATCH /api/sessions/[id]` and merely *reflected* in the edit form — a
 * read-only control is a courtesy, the refusal is the rule — so the rules
 * themselves live here, free of Prisma, `server-only` and React, and are read by
 * the route and the form alike.
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

/** Why a write was refused. Stable codes, beside the translated sentence. */
export type SessionLockReason =
    | 'SESSION_CLOSED'
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
 * Every field a Closed Session locks — which is all of them but `notes`. A field
 * the form sent **unchanged** is not an edit: the edit form posts its whole
 * payload, so a notes-only save on a Completed Session carries every other field
 * at its stored value and has to succeed.
 */
const LOCKED_FIELD_CHECKS: readonly FieldCheck[] = [
    (stored, patch) => isTextChanged(patch.title, stored.title),
    (stored, patch) => isDateChanged(patch.date, stored.date),
    (stored, patch) => isTextChanged(patch.startTime, stored.startTime),
    (stored, patch) => isTextChanged(patch.endTime, stored.endTime),
    (stored, patch) => isTextChanged(patch.location, stored.location),
    (stored, patch) => isNumberChanged(patch.maxPlayers, stored.maxPlayers),
    (stored, patch) => isNumberChanged(patch.fee, stored.fee),
    (stored, patch) =>
        patch.status !== undefined && patch.status !== stored.status,
];

/**
 * Whether this body changes anything but the notes. `status` is in the set: the
 * rule is "every field read-only except notes", so a Closed Session cannot be
 * reopened through this route either.
 */
export function hasLockedFieldEdit(
    stored: StoredSession,
    patch: SessionPatch,
): boolean {
    return LOCKED_FIELD_CHECKS.some((check) => check(stored, patch));
}

/**
 * The one answer both the route and the form read, in the order the rules are
 * checked: Closed first, then the frozen fee, then capacity against the Seats
 * already held. `null` is a write that may proceed.
 *
 * Capacity **equal** to the held Seats is allowed — it fits everyone who holds
 * one and only refuses new claims.
 */
export function resolveSessionRefusal(
    stored: StoredSession,
    patch: SessionPatch,
    facts: SessionLockFacts,
): SessionRefusal | null {
    const { heldSeats } = facts;
    if (facts.isClosed && hasLockedFieldEdit(stored, patch)) {
        return { reason: 'SESSION_CLOSED', heldSeats };
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

import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import {
    attendanceState,
    resolveStatusChip,
    sessionState,
    type ChipLabelKey,
    type ChipVariant,
    type DomainState,
} from './status-chip';

/**
 * **The one thing a Session card says about where the reader stands.** A card
 * footer holds exactly one of these, and this is the only place that decides
 * which — the Rally member surfaces each draw their own card (ADR 0003), so the
 * drawing is deliberately not shared and the *deciding* deliberately is.
 *
 * The precedence, top to bottom:
 *
 * 1. **nothing posted** — a standing weekly slot with no Session on it. It has
 *    no lifecycle to be at a point in, so it precedes everything.
 * 2. **cancelled** — the Session is off. Whatever the reader's own Seat says,
 *    the thing they would turn up to is not happening.
 * 3. **their Seat is held on money nobody has verified** — a `REGISTERED` row
 *    carrying a live `holdExpiresAt`. It outranks a plain Registered chip
 *    because the two are not the same promise: one is a Seat, the other is a
 *    Seat with a deadline on it, and the deadline is the fact that can cost them
 *    the Seat.
 * 4. **their own Seat state** — Registered, Present, Maybe, No-Show. `ABSENT`
 *    (Opted Out) is deliberately absent: the member released that Seat, so the
 *    free-Seat figure is the fact they now need, and their own withdrawal is
 *    said on the card's own line instead.
 * 5. **the Session's point in its life** — Ongoing, Completed.
 * 6. **full** — a live Session with no Seat left. Not an action; a state.
 * 7. **the free-Seat figure** — what a live Session with Seats left shows.
 *
 * Colour is never picked by a call site. A state that a closed Prisma enum can
 * express resolves through {@link resolveStatusChip} and takes its label from
 * `t.chips`; the two standings no enum can express — full, and a Seat on hold —
 * carry the variant this module fixes for them and take their label from the
 * surface's own dictionary block, exactly as the retired Slot Cell's `full`
 * chip already did.
 *
 * Pure by design: no Prisma, no React, no dictionary. That is what makes every
 * branch of the precedence testable in the Node environment the suite runs in.
 */

/** Free Seats and capacity. `free` means free, never taken (`CONTEXT.md`). */
export type SeatFigure = Readonly<{ free: number; max: number }>;

const PROVISIONAL: ChipVariant = 'provisional';
const NEUTRAL: ChipVariant = 'neutral';

export type SessionStanding =
    /** A chip whose label is a `t.chips` key, because a stored enum named it. */
    | Readonly<{ kind: 'chip'; variant: ChipVariant; labelKey: ChipLabelKey }>
    /** A Seat claimed against money nobody has verified yet, and its deadline. */
    | Readonly<{ kind: 'held'; variant: ChipVariant; holdExpiresAt: Date }>
    /** No Seat left. Labelled from the surface's block, not from `t.chips`. */
    | Readonly<{ kind: 'full'; variant: ChipVariant }>
    | Readonly<{ kind: 'seats'; seats: SeatFigure }>;

/**
 * The statuses that hold a Seat, mirroring `SEAT_HOLDING` in
 * `src/components/sessions/slot-action.ts` and `SEAT_HELD_STATUSES` in
 * `src/lib/payments.ts`. Only a held Seat can be on a payment hold.
 */
const SEAT_HOLDING: readonly AttendanceStatus[] = ['REGISTERED', 'PRESENT'];

/**
 * The reader's own states that preempt the seat figure and the Session's
 * lifecycle. `NO_SHOW` is in because it is a fact about their own Seat, and it
 * is recorded only when an Admin says so — never derived from a Session that
 * ended with rows still `REGISTERED` (`docs/adr/0001-no-show-attendance-value.md`).
 */
const OWN_STATES_CHIPPED: readonly AttendanceStatus[] = [
    'REGISTERED',
    'PRESENT',
    'MAYBE',
    'NO_SHOW',
];

export interface SessionStandingInput {
    /** `null` means unposted: a standing weekly slot with no Session on it. */
    readonly status: SessionStatus | null;
    /** The reader's own Seat state in this Session, where they have one. */
    readonly ownStatus: AttendanceStatus | null;
    /**
     * `Attendance.holdExpiresAt` for the reader's own row: set while the Seat is
     * claimed against money nobody has confirmed, null once it is funded. A
     * caller with no hold to report passes `null` and gets the plain Seat chip.
     */
    readonly holdExpiresAt?: Date | null;
    readonly seats: SeatFigure | null;
}

const UNPOSTED: SessionStanding = {
    kind: 'chip',
    variant: NEUTRAL,
    labelKey: 'unposted',
};

const FULL: SessionStanding = { kind: 'full', variant: NEUTRAL };

function chipFor(state: DomainState): SessionStanding {
    const { variant, labelKey } = resolveStatusChip(state);
    return { kind: 'chip', variant, labelKey };
}

/**
 * The deadline on the reader's own Seat, where they hold one against money
 * nobody has verified. `null` covers all three ways there is no deadline: no
 * row, a row holding no Seat, and a Seat the money is already behind.
 */
function liveHoldOf(input: SessionStandingInput): Date | null {
    const own = input.ownStatus;
    if (own === null || !SEAT_HOLDING.includes(own)) return null;
    return input.holdExpiresAt ?? null;
}

/** The one standing a Session card shows. See this module's header for the order. */
export function resolveSessionStanding(
    input: SessionStandingInput,
): SessionStanding {
    if (input.status === null) return UNPOSTED;
    if (input.status === 'CANCELLED') return chipFor(sessionState(input.status));
    const hold = liveHoldOf(input);
    if (hold !== null) {
        return { kind: 'held', variant: PROVISIONAL, holdExpiresAt: hold };
    }
    const own = input.ownStatus;
    if (own !== null && OWN_STATES_CHIPPED.includes(own)) {
        return chipFor(attendanceState(own));
    }
    if (input.status !== 'SCHEDULED') return chipFor(sessionState(input.status));
    if (input.seats === null) return UNPOSTED;
    if (input.seats.free <= 0) return FULL;
    return { kind: 'seats', seats: input.seats };
}

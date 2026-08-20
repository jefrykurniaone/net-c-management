import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import { isRsvpClosed } from '@/lib/rsvp';
import type { SlotCellAction, SlotCellSeats } from './slot-cell-data';

/**
 * Which action, if any, a member may take on one Session from the row it is
 * drawn in. Resolved **once, server-side**, and handed to the Slot Cell as data:
 * a row cannot work this out for itself because the answer needs the RSVP window
 * and the seat-holding rule, and neither is a rendering concern.
 *
 * This decides what to *offer*, never what is *allowed* — the server re-checks
 * everything under a row lock (`reserveSeat`, `releaseSessionSeat`), so a stale
 * board can only ever cost the member one rejected tap, never a wrong write.
 * The offer is deliberately narrow for that reason: a Session that is not
 * `SCHEDULED`, or whose RSVP window has closed, gets no control at all rather
 * than one that always fails.
 */

/**
 * The statuses that hold a Seat, mirroring `SEAT_HELD_STATUSES` in
 * `src/lib/payments.ts`. A `MAYBE` row holds none, so a member on one is
 * offered the claim; an `ABSENT` row holds none either, so they may claim again.
 */
const SEAT_HOLDING: readonly AttendanceStatus[] = ['REGISTERED', 'PRESENT'];

export interface SlotActionInput {
    readonly sessionId: string;
    readonly status: SessionStatus;
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly startTime: string;
    readonly fee: number;
    readonly ownStatus: AttendanceStatus | null;
    readonly seats: SlotCellSeats | null;
    /**
     * Whether the member has joined this Session's Activity. Reserving joins it,
     * so a claim offered on an Activity they are only browsing would enrol them
     * and open a bill in one tap, from a row carrying neither the price nor the
     * word "join". They keep the row's link to the Session, where both are said.
     */
    readonly isJoined: boolean;
    /**
     * Whether this member's Dues already cover this Session's billing period,
     * so claiming raises no bill even though the Session carries a Fee. Read
     * from `readFreeClaimPeriods`, which mirrors the `isFreeRegisterAllowed`
     * rule the reserve route itself applies.
     */
    readonly hasLiveDues: boolean;
    /** Defaults to the present instant; injectable so a caller can pin it. */
    readonly now?: Date;
}

export function slotActionFor(input: SlotActionInput): SlotCellAction | null {
    if (input.status !== 'SCHEDULED') return null;
    if (isRsvpClosed(input.date, input.startTime, input.now)) return null;

    // "Claim & pay" is a statement about this member's money, not about the
    // Session's price list. A Fee nobody will charge them is not a Fee they pay.
    const isPaid = input.fee > 0 && !input.hasLiveDues;
    const { sessionId } = input;
    const holdsSeat =
        input.ownStatus !== null && SEAT_HOLDING.includes(input.ownStatus);
    // A member holding a Seat may always release it, joined or not.
    if (holdsSeat) return { kind: 'withdraw', sessionId, isPaid };
    if (!input.isJoined) return null;

    // No Seat to claim is not an action — the standing column already says full.
    if (input.seats === null || input.seats.free <= 0) return null;
    return { kind: 'claim', sessionId, isPaid };
}

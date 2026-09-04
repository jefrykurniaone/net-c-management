import type { AttendanceStatus, SessionStatus } from '@prisma/client';

/**
 * The Slot Cell's contract, in one file so the surfaces that draw a Session card
 * read the same shape without importing one another. Every field is data — a
 * card takes **no nodes**, so nothing here is a React type and nothing here can
 * reorder a row. ADR 0003 retired the shared `slot-cell.tsx` this once served.
 */

export type SlotCellSeats = Readonly<{
    /** Free Seats — capacity minus the seat-holding rows. */
    free: number;
    max: number;
}>;

/** `getSessionQuotas`' result for one Session. `needed <= 0` means no quota. */
export type SlotCellQuota = Readonly<{
    committed: number;
    needed: number;
    isMet: boolean;
}>;

/**
 * The one action the reader may take on this Session from wherever the row is
 * drawn: claim the Seat, or release the one they hold. Which of the two applies
 * is resolved once, server-side, by `slotActionFor` — the cell never decides,
 * because deciding needs the RSVP window and the seat-holding rule and a row
 * has neither.
 *
 * It carries an id and two facts, not a callback: a cell that took a handler
 * would let one caller claim and another cancel from the same-looking control.
 */
export type SlotCellAction = Readonly<{
    kind: 'claim' | 'withdraw';
    sessionId: string;
    /** True where this Session charges a Fee, so the label can say so up front. */
    isPaid: boolean;
}>;

export type SlotCellData = Readonly<{
    /**
     * The date, for a caller with no day band above the row to carry it — the
     * dashboard, a detail header. `null` on the sessions board, whose band says
     * the date once for every row under it.
     */
    day: Readonly<{ label: string; dayOfMonth: number }> | null;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    activityName: string;
    /** `null` where there is nothing to open — an unposted standing slot. */
    href: string | null;
    /** `null` means unposted: a standing weekly slot with no Session on it. */
    status: SessionStatus | null;
    /** The reader's own Seat state in this Session, where they have one. */
    ownStatus: AttendanceStatus | null;
    seats: SlotCellSeats | null;
    quota: SlotCellQuota | null;
    /**
     * The claim/withdraw control, where the caller resolved one. Optional and
     * defaulting to none, so a surface that offers no action keeps passing the
     * shape it always passed.
     */
    action?: SlotCellAction | null;
}>;

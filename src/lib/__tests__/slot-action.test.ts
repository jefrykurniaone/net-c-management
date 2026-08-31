import { describe, it, expect } from 'vitest';
import {
    slotActionFor,
    type SlotActionInput,
} from '@/components/sessions/slot-action';

/**
 * Which action a member is *offered* on one Session from the card they are
 * reading — claim the Seat, release the one they hold, or nothing.
 *
 * **The offer is not the permission.** Every path here decides only what to put
 * in front of the member; `reserveSeat` and `releaseSessionSeat` re-check
 * capacity, the window and the money under a row lock, so a stale card costs a
 * refused tap and never a wrong write. These tests assert the offer, and they
 * assert nothing about what the server will allow.
 *
 * Exercised over the combinations the week strip renders (#159), which is the
 * surface that reaches this resolver most: an open Session, a full one, a
 * cancelled one, one whose RSVP window has shut, a Seat already held, an
 * Activity the member has only been browsing, and a Session a live month of
 * Dues already pays for.
 */

const SESSION_ID = 'session-1';

/** Well clear of the RSVP cut-off, so the window is not what any case turns on. */
const NOW = new Date('2026-08-31T00:00:00.000Z');
const SESSION_DAY = new Date('2026-09-03T00:00:00.000Z');

/** A live, paid, half-empty Session on an Activity the member has joined. */
const OPEN: SlotActionInput = {
    sessionId: SESSION_ID,
    status: 'SCHEDULED',
    date: SESSION_DAY,
    startTime: '19:00',
    fee: 50_000,
    ownStatus: null,
    seats: { free: 3, max: 12 },
    isJoined: true,
    hasLiveDues: false,
    now: NOW,
};

function actionFor(patch: Partial<SlotActionInput>) {
    return slotActionFor({ ...OPEN, ...patch });
}

describe('slotActionFor — what the card offers', () => {
    it('offers the claim on an open Session with Seats left', () => {
        expect(actionFor({})).toEqual({
            kind: 'claim',
            sessionId: SESSION_ID,
            isPaid: true,
        });
    });

    it('offers the withdrawal to a member already holding the Seat', () => {
        expect(actionFor({ ownStatus: 'REGISTERED' })).toEqual({
            kind: 'withdraw',
            sessionId: SESSION_ID,
            isPaid: true,
        });
    });

    it('offers the withdrawal to a member marked Present', () => {
        expect(actionFor({ ownStatus: 'PRESENT' })?.kind).toBe('withdraw');
    });

    /** A `MAYBE` row holds no Seat, and neither does an `ABSENT` one. */
    it.each(['MAYBE', 'ABSENT'] as const)(
        'offers the claim again on a %s row, which holds no Seat',
        (ownStatus) => {
            expect(actionFor({ ownStatus })?.kind).toBe('claim');
        },
    );

    it('offers nothing where the Session is full', () => {
        expect(actionFor({ seats: { free: 0, max: 12 } })).toBeNull();
    });

    it('offers nothing where capacity was never read', () => {
        expect(actionFor({ seats: null })).toBeNull();
    });

    it.each(['CANCELLED', 'ONGOING', 'COMPLETED'] as const)(
        'offers nothing on a %s Session',
        (status) => {
            expect(actionFor({ status })).toBeNull();
        },
    );

    /**
     * A control that always fails is worse than no control. Past the RSVP
     * cut-off the card carries nothing rather than something that will be
     * refused.
     */
    it('offers nothing once the RSVP window has shut', () => {
        expect(
            actionFor({ now: new Date('2026-09-03T18:59:00.000Z') }),
        ).toBeNull();
    });

    /**
     * Reserving joins the Activity, so a claim offered on one the member is
     * only browsing would enrol them and open a bill in one tap, from a card
     * carrying neither the price nor the word "join". They keep the card's link
     * to the Session, where both are said.
     */
    it('withholds the claim on an Activity the member has only browsed', () => {
        expect(actionFor({ isJoined: false })).toBeNull();
    });

    /** But a member holding a Seat may always release it, joined or not. */
    it('still offers the withdrawal on an Activity they have not joined', () => {
        expect(
            actionFor({ isJoined: false, ownStatus: 'REGISTERED' })?.kind,
        ).toBe('withdraw');
    });
});

describe('slotActionFor — whether the card says money is due', () => {
    it('says a Fee is due where the Session charges one', () => {
        expect(actionFor({})?.isPaid).toBe(true);
    });

    it('says nothing is due on a free Session', () => {
        expect(actionFor({ fee: 0 })?.isPaid).toBe(false);
    });

    /**
     * "Claim & pay" is a statement about this member's money, not about the
     * Session's price list: a Fee nobody will charge them is not a Fee they pay.
     */
    it('says nothing is due where live Dues already cover the period', () => {
        expect(actionFor({ hasLiveDues: true })?.isPaid).toBe(false);
    });

    it('carries the same answer onto a withdrawal', () => {
        expect(
            actionFor({ ownStatus: 'REGISTERED', hasLiveDues: true }),
        ).toEqual({ kind: 'withdraw', sessionId: SESSION_ID, isPaid: false });
    });
});

import { describe, expect, it } from 'vitest';
import {
    isMoneyBehind,
    isSessionClosed,
    resolveDeleteRefusal,
    resolveSessionRefusal,
    toSessionLockFacts,
    type SessionPatch,
} from '../session-lock';
import {
    DAY_BEFORE,
    factsOf,
    OPEN_AND_UNFUNDED,
    STORED,
    storedAs,
    UNCHANGED,
} from './session-lock-fixtures';

/**
 * The rules that stop an Admin editing or destroying a Session out from under
 * the money already behind it, and out from under history. Every case here is a
 * refusal the route must make regardless of what the form offered, plus the one
 * that matters most: an unchanged field is not an edit, so a notes-only save on
 * a Completed Session — which posts the whole payload — still succeeds.
 *
 * The one way back out of Closed has its own suite, `session-reopen.test.ts`.
 */

describe('isSessionClosed', () => {
    it.each([
        ['COMPLETED', true],
        ['CANCELLED', true],
        ['SCHEDULED', false],
        ['ONGOING', false],
    ] as const)('reads %s as closed: %s', (status, expected) => {
        expect(isSessionClosed(status)).toBe(expected);
    });
});

describe('isMoneyBehind', () => {
    it('is true on a held Seat alone', () => {
        expect(isMoneyBehind(factsOf({ heldSeats: 1 }))).toBe(true);
    });

    it('is true on a live Payment alone', () => {
        expect(isMoneyBehind(factsOf({ hasLivePayment: true }))).toBe(true);
    });

    it('is false with neither', () => {
        expect(isMoneyBehind(OPEN_AND_UNFUNDED)).toBe(false);
    });
});

describe('toSessionLockFacts', () => {
    it('reads the two counts and the stored status', () => {
        const facts = toSessionLockFacts(
            { attendances: 3, payments: 0 },
            'CANCELLED',
        );
        expect(facts).toEqual({
            heldSeats: 3,
            hasLivePayment: false,
            isClosed: true,
        });
    });
});

describe('resolveSessionRefusal, an open Session nobody has funded', () => {
    it('lets every field through', () => {
        const patch: SessionPatch = {
            ...UNCHANGED,
            title: 'Thursday practice',
            date: '2026-08-27',
            fee: 75_000,
            maxPlayers: 8,
            status: 'ONGOING',
        };
        expect(
            resolveSessionRefusal(STORED, patch, OPEN_AND_UNFUNDED, DAY_BEFORE),
        ).toBeNull();
    });
});

describe('resolveSessionRefusal, money behind the Session', () => {
    const funded = factsOf({ heldSeats: 6 });

    it('refuses a changed fee', () => {
        const refusal = resolveSessionRefusal(
            STORED,
            { ...UNCHANGED, fee: 60_000 },
            funded,
            DAY_BEFORE,
        );
        expect(refusal).toEqual({ reason: 'FEE_LOCKED', heldSeats: 6 });
    });

    it('refuses a changed fee behind a Payment with no Seat held', () => {
        const refusal = resolveSessionRefusal(
            STORED,
            { fee: 0 },
            factsOf({ hasLivePayment: true }),
            DAY_BEFORE,
        );
        expect(refusal).toEqual({ reason: 'FEE_LOCKED', heldSeats: 0 });
    });

    it('lets the same fee through', () => {
        expect(
            resolveSessionRefusal(STORED, UNCHANGED, funded, DAY_BEFORE),
        ).toBeNull();
    });

    it('refuses capacity below the Seats already held', () => {
        const refusal = resolveSessionRefusal(
            STORED,
            { ...UNCHANGED, maxPlayers: 5 },
            funded,
            DAY_BEFORE,
        );
        expect(refusal).toEqual({
            reason: 'CAPACITY_BELOW_HELD',
            heldSeats: 6,
        });
    });

    it('allows capacity equal to the Seats already held', () => {
        const patch: SessionPatch = { ...UNCHANGED, maxPlayers: 6 };
        expect(
            resolveSessionRefusal(STORED, patch, funded, DAY_BEFORE),
        ).toBeNull();
    });

    it('checks the fee before capacity when both are wrong', () => {
        const patch: SessionPatch = {
            ...UNCHANGED,
            fee: 1,
            maxPlayers: 1,
        };
        expect(
            resolveSessionRefusal(STORED, patch, funded, DAY_BEFORE)?.reason,
        ).toBe('FEE_LOCKED');
    });
});

describe('resolveSessionRefusal, a Closed Session', () => {
    const stored = storedAs({ status: 'COMPLETED' });
    const closed = factsOf({ isClosed: true, heldSeats: 4 });
    const posted: SessionPatch = { ...UNCHANGED, status: 'COMPLETED' };

    it('accepts a notes-only save that posts every other field unchanged', () => {
        const patch: SessionPatch = { ...posted, notes: 'Rain stopped play.' };
        expect(
            resolveSessionRefusal(stored, patch, closed, DAY_BEFORE),
        ).toBeNull();
    });

    it('accepts notes moving from stored null to a written sentence', () => {
        expect(
            resolveSessionRefusal(
                stored,
                { notes: 'Court flooded.' },
                closed,
                DAY_BEFORE,
            ),
        ).toBeNull();
    });

    it.each([
        ['title', { title: 'Renamed' }],
        ['date', { date: '2026-08-26' }],
        ['startTime', { startTime: '09:00' }],
        ['endTime', { endTime: '11:00' }],
        ['location', { location: 'GOR Melati' }],
        ['maxPlayers', { maxPlayers: 20 }],
        ['fee', { fee: 0 }],
        ['status', { status: 'SCHEDULED' as const }],
    ])('refuses a changed %s', (_field, over) => {
        const refusal = resolveSessionRefusal(
            stored,
            { ...posted, ...over },
            closed,
            DAY_BEFORE,
        );
        expect(refusal).toEqual({ reason: 'SESSION_CLOSED', heldSeats: 4 });
    });

    it('refuses on a Cancelled Session the same way', () => {
        const cancelled = storedAs({ status: 'CANCELLED' });
        const refusal = resolveSessionRefusal(
            cancelled,
            { title: 'Renamed' },
            closed,
            DAY_BEFORE,
        );
        expect(refusal?.reason).toBe('SESSION_CLOSED');
    });

    it('refuses before the fee rule, so the reason names the Session', () => {
        const refusal = resolveSessionRefusal(
            stored,
            { ...posted, fee: 99_000 },
            closed,
            DAY_BEFORE,
        );
        expect(refusal?.reason).toBe('SESSION_CLOSED');
    });
});

describe('resolveDeleteRefusal', () => {
    it('refuses a Session with a held Seat', () => {
        const refusal = resolveDeleteRefusal(STORED, factsOf({ heldSeats: 2 }));
        expect(refusal).toEqual({ reason: 'SESSION_HAS_MONEY', heldSeats: 2 });
    });

    it('refuses a Session a live Payment names, with no Seat held', () => {
        const refusal = resolveDeleteRefusal(
            STORED,
            factsOf({ hasLivePayment: true }),
        );
        expect(refusal).toEqual({ reason: 'SESSION_HAS_MONEY', heldSeats: 0 });
    });

    it('refuses a Completed Session with nothing behind it', () => {
        const refusal = resolveDeleteRefusal(
            storedAs({ status: 'COMPLETED' }),
            factsOf({ isClosed: true }),
        );
        expect(refusal).toEqual({ reason: 'SESSION_CLOSED', heldSeats: 0 });
    });

    it('names the money before the Completed Session, so the fix is the one that works', () => {
        const refusal = resolveDeleteRefusal(
            storedAs({ status: 'COMPLETED' }),
            factsOf({ isClosed: true, heldSeats: 3 }),
        );
        expect(refusal?.reason).toBe('SESSION_HAS_MONEY');
    });

    it('allows a Cancelled Session with nothing behind it', () => {
        expect(
            resolveDeleteRefusal(
                storedAs({ status: 'CANCELLED' }),
                factsOf({ isClosed: true }),
            ),
        ).toBeNull();
    });

    it('allows an open Session nobody has funded', () => {
        expect(resolveDeleteRefusal(STORED, OPEN_AND_UNFUNDED)).toBeNull();
    });
});

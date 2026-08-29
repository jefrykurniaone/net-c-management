import { describe, expect, it } from 'vitest';
import {
    isMoneyBehind,
    isSessionClosed,
    resolveSessionRefusal,
    toSessionLockFacts,
    type SessionLockFacts,
    type SessionPatch,
    type StoredSession,
} from '../session-lock';

/**
 * The rules that stop an Admin editing a Session out from under the money
 * already behind it, and out from under history. Every case here is a refusal
 * the route must make regardless of what the form offered, plus the one that
 * matters most: an unchanged field is not an edit, so a notes-only save on a
 * Completed Session — which posts the whole payload — still succeeds.
 */

const STORED: StoredSession = {
    title: 'Tuesday practice',
    date: new Date('2026-08-25T00:00:00.000Z'),
    startTime: '08:00',
    endTime: '10:00',
    location: 'GOR Cempaka',
    maxPlayers: 16,
    fee: 50_000,
    notes: null,
    status: 'SCHEDULED',
};

/** What the edit form posts when the Admin changed nothing at all. */
const UNCHANGED: SessionPatch = {
    title: STORED.title,
    date: '2026-08-25',
    startTime: STORED.startTime,
    endTime: STORED.endTime,
    location: STORED.location,
    maxPlayers: STORED.maxPlayers,
    fee: STORED.fee,
    notes: '',
    status: STORED.status,
};

const OPEN_AND_UNFUNDED: SessionLockFacts = {
    heldSeats: 0,
    hasLivePayment: false,
    isClosed: false,
};

function factsOf(over: Partial<SessionLockFacts>): SessionLockFacts {
    return { ...OPEN_AND_UNFUNDED, ...over };
}

function storedAs(over: Partial<StoredSession>): StoredSession {
    return { ...STORED, ...over };
}

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
            resolveSessionRefusal(STORED, patch, OPEN_AND_UNFUNDED),
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
        );
        expect(refusal).toEqual({ reason: 'FEE_LOCKED', heldSeats: 6 });
    });

    it('refuses a changed fee behind a Payment with no Seat held', () => {
        const refusal = resolveSessionRefusal(
            STORED,
            { fee: 0 },
            factsOf({ hasLivePayment: true }),
        );
        expect(refusal).toEqual({ reason: 'FEE_LOCKED', heldSeats: 0 });
    });

    it('lets the same fee through', () => {
        expect(resolveSessionRefusal(STORED, UNCHANGED, funded)).toBeNull();
    });

    it('refuses capacity below the Seats already held', () => {
        const refusal = resolveSessionRefusal(
            STORED,
            { ...UNCHANGED, maxPlayers: 5 },
            funded,
        );
        expect(refusal).toEqual({
            reason: 'CAPACITY_BELOW_HELD',
            heldSeats: 6,
        });
    });

    it('allows capacity equal to the Seats already held', () => {
        const patch: SessionPatch = { ...UNCHANGED, maxPlayers: 6 };
        expect(resolveSessionRefusal(STORED, patch, funded)).toBeNull();
    });

    it('checks the fee before capacity when both are wrong', () => {
        const patch: SessionPatch = {
            ...UNCHANGED,
            fee: 1,
            maxPlayers: 1,
        };
        expect(resolveSessionRefusal(STORED, patch, funded)?.reason).toBe(
            'FEE_LOCKED',
        );
    });
});

describe('resolveSessionRefusal, a Closed Session', () => {
    const stored = storedAs({ status: 'COMPLETED' });
    const closed = factsOf({ isClosed: true, heldSeats: 4 });
    const posted: SessionPatch = { ...UNCHANGED, status: 'COMPLETED' };

    it('accepts a notes-only save that posts every other field unchanged', () => {
        const patch: SessionPatch = { ...posted, notes: 'Rain stopped play.' };
        expect(resolveSessionRefusal(stored, patch, closed)).toBeNull();
    });

    it('accepts notes moving from stored null to a written sentence', () => {
        expect(
            resolveSessionRefusal(stored, { notes: 'Court flooded.' }, closed),
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
        );
        expect(refusal).toEqual({ reason: 'SESSION_CLOSED', heldSeats: 4 });
    });

    it('refuses on a Cancelled Session the same way', () => {
        const cancelled = storedAs({ status: 'CANCELLED' });
        const refusal = resolveSessionRefusal(
            cancelled,
            { title: 'Renamed' },
            closed,
        );
        expect(refusal?.reason).toBe('SESSION_CLOSED');
    });

    it('refuses before the fee rule, so the reason names the Session', () => {
        const refusal = resolveSessionRefusal(
            stored,
            { ...posted, fee: 99_000 },
            closed,
        );
        expect(refusal?.reason).toBe('SESSION_CLOSED');
    });
});

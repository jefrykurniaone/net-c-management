import type {
    SessionLockFacts,
    SessionPatch,
    StoredSession,
} from '../session-lock';

/**
 * The one stored Session the locking cases are all decided against, and the
 * instants the reopening window is judged at.
 *
 * Shared by `session-lock.test.ts` and `session-reopen.test.ts` rather than
 * copied into each: two fixtures that drift apart make two suites that disagree
 * about the row they are supposedly describing. The name carries no `.test.`
 * segment, so vitest's `include` glob does not collect it as a suite of its own.
 */

export const STORED: StoredSession = {
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
export const UNCHANGED: SessionPatch = {
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

/**
 * Fixed instants, never the real clock: the reopening window turns on the
 * Session's WIB calendar day, so a case reading `new Date()` would pass until
 * the fixture date went by and then fail for a reason that is not a defect.
 */

/** 2026-08-24, 17:00 WIB — the day before the fixture Session's own day. */
export const DAY_BEFORE = new Date('2026-08-24T10:00:00.000Z');

/**
 * 2026-08-25, 01:00 WIB — the fixture Session's *own* day, at an instant UTC
 * still reads as the 24th. A rule that used the server's day rather than the WIB
 * one would agree with `DAY_BEFORE` here by accident and disagree with the rule
 * for the seven hours either side of every midnight.
 */
export const SAME_DAY = new Date('2026-08-24T18:00:00.000Z');

/** 2026-08-26, 17:00 WIB — a whole day after the fixture Session. */
export const DAY_AFTER = new Date('2026-08-26T10:00:00.000Z');

export const OPEN_AND_UNFUNDED: SessionLockFacts = {
    heldSeats: 0,
    hasLivePayment: false,
    isClosed: false,
};

export function factsOf(over: Partial<SessionLockFacts>): SessionLockFacts {
    return { ...OPEN_AND_UNFUNDED, ...over };
}

export function storedAs(over: Partial<StoredSession>): StoredSession {
    return { ...STORED, ...over };
}

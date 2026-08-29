import { describe, expect, it } from 'vitest';
import {
    canReopenSession,
    resolveSessionRefusal,
    type SessionPatch,
} from '../session-lock';
import {
    DAY_AFTER,
    DAY_BEFORE,
    factsOf,
    SAME_DAY,
    STORED,
    storedAs,
    UNCHANGED,
} from './session-lock-fixtures';

/**
 * The one way back out of Closed: a Cancelled Session returns to `SCHEDULED`
 * while its own WIB calendar day has not passed, and only that. Everything else
 * the Closed rule says still stands, so the cases that matter most here are the
 * refusals — a Completed Session, a day that has gone by, and a body that
 * changes anything else in the same request.
 *
 * `canReopenSession` is tested beside them because a surface that offered the
 * move where the route refuses it, or withheld it where the route allows it,
 * would be the same defect read from the other end.
 */

describe('resolveSessionRefusal, reopening a Cancelled Session', () => {
    const cancelled = storedAs({ status: 'CANCELLED' });
    const closed = factsOf({ isClosed: true, heldSeats: 4 });
    const reopen: SessionPatch = { status: 'SCHEDULED' };

    it('allows a status-only reopening the day before', () => {
        expect(
            resolveSessionRefusal(cancelled, reopen, closed, DAY_BEFORE),
        ).toBeNull();
    });

    it('allows it on the Session own WIB day, though UTC still reads yesterday', () => {
        expect(
            resolveSessionRefusal(cancelled, reopen, closed, SAME_DAY),
        ).toBeNull();
    });

    it('allows the whole payload where only the status differs', () => {
        const patch: SessionPatch = { ...UNCHANGED, status: 'SCHEDULED' };
        expect(
            resolveSessionRefusal(cancelled, patch, closed, DAY_BEFORE),
        ).toBeNull();
    });

    it('refuses once the Session day has passed', () => {
        const refusal = resolveSessionRefusal(
            cancelled,
            reopen,
            closed,
            DAY_AFTER,
        );
        expect(refusal).toEqual({ reason: 'SESSION_PAST', heldSeats: 4 });
    });

    it('never reopens a Completed Session', () => {
        const refusal = resolveSessionRefusal(
            storedAs({ status: 'COMPLETED' }),
            reopen,
            closed,
            DAY_BEFORE,
        );
        expect(refusal).toEqual({ reason: 'SESSION_CLOSED', heldSeats: 4 });
    });

    it.each([
        ['title', { title: 'Renamed' }],
        ['date', { date: '2026-08-27' }],
        ['startTime', { startTime: '09:00' }],
        ['location', { location: 'GOR Melati' }],
        ['maxPlayers', { maxPlayers: 20 }],
        ['fee', { fee: 0 }],
        ['notes', { notes: 'Back on.' }],
    ])('refuses a reopening that also changes the %s', (_field, over) => {
        const refusal = resolveSessionRefusal(
            cancelled,
            { ...reopen, ...over },
            closed,
            DAY_BEFORE,
        );
        expect(refusal).toEqual({ reason: 'SESSION_CLOSED', heldSeats: 4 });
    });

    it('refuses any standing but SCHEDULED', () => {
        const refusal = resolveSessionRefusal(
            cancelled,
            { status: 'ONGOING' },
            closed,
            DAY_BEFORE,
        );
        expect(refusal?.reason).toBe('SESSION_CLOSED');
    });
});

describe('canReopenSession', () => {
    const date = STORED.date;

    it.each([
        ['the day before', DAY_BEFORE, true],
        ['the Session own WIB day', SAME_DAY, true],
        ['the day after', DAY_AFTER, false],
    ] as const)('reads a Cancelled Session on %s as %s', (_when, now, can) => {
        expect(canReopenSession('CANCELLED', date, now)).toBe(can);
    });

    it.each(['COMPLETED', 'SCHEDULED', 'ONGOING'] as const)(
        'never offers the move on a %s Session',
        (status) => {
            expect(canReopenSession(status, date, DAY_BEFORE)).toBe(false);
        },
    );
});

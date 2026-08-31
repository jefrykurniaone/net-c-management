import { describe, it, expect } from 'vitest';
import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import {
    resolveSessionStanding,
    type SeatFigure,
    type SessionStanding,
    type SessionStandingInput,
} from '../session-standing';
import { attendanceState, resolveStatusChip, sessionState } from '../status-chip';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The one standing a Session card shows, over every combination the week strip
 * renders (#159): cancelled, own hold with its deadline, own registered, own
 * present, own no-show, ongoing, completed, full, and open with the figure.
 *
 * These are assertions about the *precedence*, not about colour or wording — the
 * variant and the label key of anything a stored enum names come from
 * `resolveStatusChip` (#149), which this module composes and never reimplements.
 * The tests below say so by comparing against that resolver's own answer rather
 * than against hardcoded literals, so a chip recoloured there cannot leave a
 * stale expectation passing here.
 */

const SEATS_LEFT: SeatFigure = { free: 3, max: 12 };
const NO_SEATS_LEFT: SeatFigure = { free: 0, max: 12 };
const HOLD_EXPIRES_AT = new Date('2026-08-31T07:35:00.000Z');

/** A live, posted, half-empty Session that the reader has no Seat in. */
const OPEN: SessionStandingInput = {
    status: 'SCHEDULED',
    ownStatus: null,
    seats: SEATS_LEFT,
};

function standingOf(patch: Partial<SessionStandingInput>): SessionStanding {
    return resolveSessionStanding({ ...OPEN, ...patch });
}

/** What `resolveStatusChip` says a Session status looks like — never a literal. */
function sessionChip(status: SessionStatus): SessionStanding {
    return { kind: 'chip', ...resolveStatusChip(sessionState(status)) };
}

/** The same, for the reader's own Seat state. */
function attendanceChip(status: AttendanceStatus): SessionStanding {
    return { kind: 'chip', ...resolveStatusChip(attendanceState(status)) };
}

describe('resolveSessionStanding — every state the week strip renders', () => {
    it('shows the free-Seat figure on an open Session', () => {
        expect(standingOf({})).toEqual({ kind: 'seats', seats: SEATS_LEFT });
    });

    it('shows full where a live Session has no Seat left', () => {
        expect(standingOf({ seats: NO_SEATS_LEFT })).toEqual({
            kind: 'full',
            variant: 'neutral',
        });
    });

    it('shows the cancelled chip the #149 resolver returns', () => {
        expect(standingOf({ status: 'CANCELLED' })).toEqual(
            sessionChip('CANCELLED'),
        );
    });

    it.each(['ONGOING', 'COMPLETED'] as const)(
        'shows the %s lifecycle chip the #149 resolver returns',
        (status) => {
            expect(standingOf({ status })).toEqual(sessionChip(status));
        },
    );

    it.each(['REGISTERED', 'PRESENT', 'MAYBE', 'NO_SHOW'] as const)(
        'shows the own-Seat %s chip the #149 resolver returns',
        (ownStatus) => {
            expect(standingOf({ ownStatus })).toEqual(attendanceChip(ownStatus));
        },
    );

    it('shows the held-Seat standing and its deadline where a hold is live', () => {
        expect(
            standingOf({
                ownStatus: 'REGISTERED',
                holdExpiresAt: HOLD_EXPIRES_AT,
            }),
        ).toEqual({
            kind: 'held',
            variant: 'provisional',
            holdExpiresAt: HOLD_EXPIRES_AT,
        });
    });

    it('shows the unposted chip where no Session is posted at all', () => {
        expect(
            resolveSessionStanding({
                status: null,
                ownStatus: null,
                seats: null,
            }),
        ).toEqual({ kind: 'chip', variant: 'neutral', labelKey: 'unposted' });
    });
});

describe('resolveSessionStanding — the precedence', () => {
    it('lets a cancelled Session override an own held Seat', () => {
        expect(
            standingOf({ status: 'CANCELLED', ownStatus: 'REGISTERED' }),
        ).toEqual(sessionChip('CANCELLED'));
    });

    it('lets a cancelled Session override a live hold and its deadline', () => {
        expect(
            standingOf({
                status: 'CANCELLED',
                ownStatus: 'REGISTERED',
                holdExpiresAt: HOLD_EXPIRES_AT,
            }),
        ).toEqual(sessionChip('CANCELLED'));
    });

    /**
     * A Seat and a Seat with a deadline on it are not the same promise, and the
     * deadline is the fact that can cost the member the Seat.
     */
    it('lets a live hold override the plain Registered chip', () => {
        const held = standingOf({
            ownStatus: 'REGISTERED',
            holdExpiresAt: HOLD_EXPIRES_AT,
        });

        expect(held.kind).toBe('held');
        expect(held).not.toEqual(attendanceChip('REGISTERED'));
    });

    it('shows the plain Registered chip once the money is behind the Seat', () => {
        expect(
            standingOf({ ownStatus: 'REGISTERED', holdExpiresAt: null }),
        ).toEqual(attendanceChip('REGISTERED'));
    });

    /** Only a held Seat can be on a payment hold — a `MAYBE` row holds none. */
    it.each(['MAYBE', 'ABSENT'] as const)(
        'never reads a hold on a %s row, which holds no Seat',
        (ownStatus) => {
            expect(
                standingOf({ ownStatus, holdExpiresAt: HOLD_EXPIRES_AT }).kind,
            ).not.toBe('held');
        },
    );

    it('lets an own Seat override the Session lifecycle', () => {
        expect(
            standingOf({ status: 'COMPLETED', ownStatus: 'PRESENT' }),
        ).toEqual(attendanceChip('PRESENT'));
    });

    it('lets an own No-Show override the lifecycle and the figure', () => {
        expect(
            standingOf({ status: 'COMPLETED', ownStatus: 'NO_SHOW' }),
        ).toEqual(attendanceChip('NO_SHOW'));
    });

    /**
     * Opted Out is the member's own choice to release a Seat, so the fact they
     * now need is how many Seats are free — their withdrawal is said on the
     * card's own line instead of taking the one standing slot.
     */
    it('keeps the figure for a member who opted out', () => {
        expect(standingOf({ ownStatus: 'ABSENT' })).toEqual({
            kind: 'seats',
            seats: SEATS_LEFT,
        });
    });

    it('lets an own Seat override a full Session', () => {
        expect(
            standingOf({ seats: NO_SEATS_LEFT, ownStatus: 'REGISTERED' }),
        ).toEqual(attendanceChip('REGISTERED'));
    });

    it('lets the lifecycle override full', () => {
        expect(
            standingOf({ status: 'ONGOING', seats: NO_SEATS_LEFT }),
        ).toEqual(sessionChip('ONGOING'));
    });

    /** A posted Session whose capacity was not read is not a full Session. */
    it('reads unknown capacity as unposted rather than as full', () => {
        expect(standingOf({ seats: null })).toEqual({
            kind: 'chip',
            variant: 'neutral',
            labelKey: 'unposted',
        });
    });
});

describe('the standings no stored enum can name', () => {
    /**
     * `full` and `held` cannot come out of `resolveStatusChip`: neither is a
     * value of a Prisma enum. Their variants are fixed by `session-standing.ts`
     * and their labels come from the surface's own dictionary block, exactly as
     * the retired Slot Cell's `full` chip already did.
     */
    const OWN_LABEL_KEYS = ['full', 'weekSeatHeld', 'weekHoldPayBy'] as const;

    it.each(LOCALES)('ships every one of its labels in %s', (locale) => {
        const { sessions } = getDictionary(locale);
        const missing = OWN_LABEL_KEYS.filter((key) => !sessions[key].trim());

        expect(missing).toEqual([]);
    });

    it.each(LOCALES)('keeps the hold deadline placeholder in %s', (locale) => {
        expect(getDictionary(locale).sessions.weekHoldPayBy).toContain('{time}');
    });

    it.each(LOCALES)('keeps both seat placeholders in %s', (locale) => {
        const figure = getDictionary(locale).sessions.weekSeatsFigure;

        expect(figure).toContain('{n}');
        expect(figure).toContain('{max}');
    });

    it.each(LOCALES)('keeps every card-name placeholder in %s', (locale) => {
        const aria = getDictionary(locale).sessions.weekCardAria;

        for (const slot of ['{day}', '{time}', '{activity}', '{title}', '{venue}', '{status}']) {
            expect(aria).toContain(slot);
        }
    });
});

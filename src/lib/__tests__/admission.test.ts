import { describe, it, expect } from 'vitest';
import {
    isAdmittedSession,
    resolveAdmissionState,
    WAITING_APPLICANT_WHERE,
} from '../admission';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The admission gate's one seam. Two nullable-and-boolean columns carry four
 * states, and every enforcement layer reads them through here — so the thing
 * worth testing is that the four stay four, and that the queue's where-clause
 * still selects the state the surfaces claim it does.
 */

const ADMITTED_AT = new Date('2026-08-01T00:00:00.000Z');

/** A session shaped like the two flags `auth.ts` puts on it. */
function sessionWith(
    flags: Readonly<{ isActive: boolean; isAdmitted: boolean }>,
) {
    return {
        user: { id: 'u1', ...flags },
    } as unknown as Parameters<typeof isAdmittedSession>[0];
}

describe('resolveAdmissionState', () => {
    it('reads a set admittedAt on a live row as admitted', () => {
        expect(
            resolveAdmissionState({ admittedAt: ADMITTED_AT, isActive: true }),
        ).toBe('admitted');
    });

    it('reads a null admittedAt on a live row as waiting — the queue', () => {
        expect(resolveAdmissionState({ admittedAt: null, isActive: true })).toBe(
            'waiting',
        );
    });

    it('reads a null admittedAt on a revoked row as declined', () => {
        expect(
            resolveAdmissionState({ admittedAt: null, isActive: false }),
        ).toBe('declined');
    });

    /**
     * The distinction the whole two-column design exists for: someone thrown out
     * is not someone who was never let in, and collapsing the two would make the
     * queue unable to tell them apart.
     */
    it('reads a set admittedAt on a revoked row as revoked, not declined', () => {
        expect(
            resolveAdmissionState({ admittedAt: ADMITTED_AT, isActive: false }),
        ).toBe('revoked');
    });
});

describe('WAITING_APPLICANT_WHERE', () => {
    it('is exactly the waiting state — never admitted, not declined', () => {
        expect(WAITING_APPLICANT_WHERE).toEqual({
            admittedAt: null,
            isActive: true,
        });
    });

    it('selects only the rows resolveAdmissionState calls waiting', () => {
        const rows = [
            { admittedAt: ADMITTED_AT, isActive: true },
            { admittedAt: null, isActive: true },
            { admittedAt: null, isActive: false },
            { admittedAt: ADMITTED_AT, isActive: false },
        ];

        const matched = rows.filter(
            (r) =>
                r.admittedAt === WAITING_APPLICANT_WHERE.admittedAt &&
                r.isActive === WAITING_APPLICANT_WHERE.isActive,
        );

        expect(matched.map(resolveAdmissionState)).toEqual(['waiting']);
    });
});

describe('isAdmittedSession', () => {
    it('lets an admitted, live member past the door', () => {
        expect(
            isAdmittedSession(sessionWith({ isActive: true, isAdmitted: true })),
        ).toBe(true);
    });

    it('stops an Applicant', () => {
        expect(
            isAdmittedSession(sessionWith({ isActive: true, isAdmitted: false })),
        ).toBe(false);
    });

    /**
     * `User.isActive` shipped with an admin control and a session field and
     * nothing that read it: a deactivated member still signed in and reached
     * /dashboard. Both flags are checked here so that hole stays shut.
     */
    it('stops a revoked member, admitted or not', () => {
        expect(
            isAdmittedSession(sessionWith({ isActive: false, isAdmitted: true })),
        ).toBe(false);
        expect(
            isAdmittedSession(
                sessionWith({ isActive: false, isAdmitted: false }),
            ),
        ).toBe(false);
    });

    it('stops a signed-out visitor', () => {
        expect(isAdmittedSession(null)).toBe(false);
        expect(isAdmittedSession(undefined)).toBe(false);
    });
});

/**
 * The gate is disclosed *before* the click. A stranger who signs in expecting
 * access and lands in a waiting room has been tricked into handing over an email
 * address, so the public route's promise is part of the mechanism: both doors
 * must say a person decides, in both locales.
 */
describe('the gate is disclosed before the click', () => {
    it.each(LOCALES)('discloses the review on the public CTA in %s', (locale) => {
        const t = getDictionary(locale);
        const promisesStraightIn = /langsung membawamu ke dalam|takes you straight in/i;

        expect(t.landing.hero.disclosure).not.toMatch(promisesStraightIn);
    });

    it.each(LOCALES)('gives the waiting room all three states in %s', (locale) => {
        const t = getDictionary(locale);

        for (const line of [
            t.pending.waitingTitle,
            t.pending.waitingLead,
            t.pending.declinedTitle,
            t.pending.declinedLead,
            t.pending.revokedTitle,
            t.pending.revokedLead,
            t.pending.whatsapp,
            t.pending.signOut,
        ]) {
            expect(line.trim().length).toBeGreaterThan(0);
        }
    });
});

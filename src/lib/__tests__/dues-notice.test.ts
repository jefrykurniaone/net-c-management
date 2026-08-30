import { describe, expect, it } from 'vitest';
import { PaymentMode } from '@prisma/client';
import { BEGINNING_OF_TIME } from '../billing-period';
import type { DuesRateChangeOutcome, DuesRateRow } from '../dues-rate';
import {
    duesChangeEventOf,
    findDuesChangeNotices,
    type DuesNoticeMembership,
} from '../dues-notice';

/**
 * Who hears that Dues change, and who does not.
 *
 * Telling the wrong people about a price is a trust defect, so the audience is
 * pinned here rather than left to a page: it is every member billed **Monthly
 * for the Period the change starts from**, which is not "Monthly today". These
 * cases are the four ways that distinction bites, plus the one that needs no
 * write — the sentence disappearing the month the change arrives.
 */

/** 75k since forever, 90k queued from September 2026. */
const SINCE_FOREVER: DuesRateRow = {
    amount: 75_000,
    effectiveFrom: BEGINNING_OF_TIME,
};
const FROM_SEPTEMBER: DuesRateRow = { amount: 90_000, effectiveFrom: 202609 };
const SEPTEMBER_KEY = 202609;

const IN_JULY = new Date(2026, 6, 15);
const IN_SEPTEMBER = new Date(2026, 8, 1);

const BOTH_MODES = { allowsMonthly: true, allowsPerSession: true };

function activity(
    overrides: Partial<DuesNoticeMembership['activity']> = {},
): DuesNoticeMembership['activity'] {
    return {
        id: 'badminton',
        name: 'Badminton',
        duesRates: [SINCE_FOREVER, FROM_SEPTEMBER],
        ...BOTH_MODES,
        ...overrides,
    };
}

function membership(
    overrides: Partial<DuesNoticeMembership> = {},
): DuesNoticeMembership {
    return {
        paymentMode: PaymentMode.MONTHLY,
        effectiveFrom: BEGINNING_OF_TIME,
        pendingMode: null,
        pendingEffectiveFrom: null,
        activity: activity(),
        ...overrides,
    };
}

describe('findDuesChangeNotices, the audience for a queued Dues change', () => {
    it('tells a Monthly member the new figure and the month it starts', () => {
        const notices = findDuesChangeNotices([membership()], IN_JULY);
        expect(notices).toEqual([
            {
                activityId: 'badminton',
                activityName: 'Badminton',
                amount: 90_000,
                period: { month: 9, year: 2026 },
            },
        ]);
    });

    const excluded: readonly [string, Partial<DuesNoticeMembership>][] = [
        [
            'a per-Session member of the same Activity',
            { paymentMode: PaymentMode.PER_SESSION },
        ],
        [
            'a member switching away to per-Session by that Period',
            {
                pendingMode: PaymentMode.PER_SESSION,
                pendingEffectiveFrom: SEPTEMBER_KEY,
            },
        ],
        [
            'a member who has chosen no mode where both are offered',
            { paymentMode: null, effectiveFrom: BEGINNING_OF_TIME },
        ],
    ];

    it.each(excluded)('says nothing to %s', (_name, overrides) => {
        expect(findDuesChangeNotices([membership(overrides)], IN_JULY)).toEqual([]);
    });

    it('tells a member whose pending switch to Monthly lands by that Period', () => {
        const switching = membership({
            paymentMode: PaymentMode.PER_SESSION,
            pendingMode: PaymentMode.MONTHLY,
            pendingEffectiveFrom: SEPTEMBER_KEY,
        });
        expect(findDuesChangeNotices([switching], IN_JULY)).toHaveLength(1);
    });

    it('says nothing to a per-Session member switching to Monthly only later', () => {
        const switchingLater = membership({
            paymentMode: PaymentMode.PER_SESSION,
            pendingMode: PaymentMode.MONTHLY,
            pendingEffectiveFrom: 202610,
        });
        expect(findDuesChangeNotices([switchingLater], IN_JULY)).toEqual([]);
    });

    it('drops the sentence once the Period arrives, with no write anywhere', () => {
        const rows = [SINCE_FOREVER, FROM_SEPTEMBER];
        expect(findDuesChangeNotices([membership()], IN_SEPTEMBER)).toEqual([]);
        // The rows the notice was derived from are untouched: the sentence was
        // never stored, so nothing had to clear it.
        expect(rows).toEqual([SINCE_FOREVER, FROM_SEPTEMBER]);
    });

    it('says nothing when the Activity has no queued change', () => {
        const settled = membership({
            activity: activity({ duesRates: [SINCE_FOREVER] }),
        });
        expect(findDuesChangeNotices([settled], IN_JULY)).toEqual([]);
    });

    it('carries one sentence per affected Activity, ordered by name', () => {
        const futsal = membership({
            activity: activity({ id: 'futsal', name: 'Futsal' }),
        });
        const archery = membership({
            activity: activity({ id: 'archery', name: 'Archery' }),
        });
        const names = findDuesChangeNotices([futsal, archery], IN_JULY).map(
            (n) => n.activityName,
        );
        expect(names).toEqual(['Archery', 'Futsal']);
    });

    it('resolves a single offered mode without the member choosing it', () => {
        const monthlyOnly = membership({
            paymentMode: null,
            activity: activity({ allowsMonthly: true, allowsPerSession: false }),
        });
        expect(findDuesChangeNotices([monthlyOnly], IN_JULY)).toHaveLength(1);
    });
});

describe('duesChangeEventOf, the email a Dues Rate write owes', () => {
    function outcome(
        over: Partial<DuesRateChangeOutcome>,
    ): DuesRateChangeOutcome {
        return { kind: 'none', previousQueued: null, queued: null, ...over };
    }

    it('owes nothing for a write that changed nothing', () => {
        expect(duesChangeEventOf(outcome({}))).toBeNull();
    });

    it('owes the queued template for a fresh change', () => {
        const change = outcome({ kind: 'queued', queued: FROM_SEPTEMBER });
        expect(duesChangeEventOf(change)).toEqual({
            kind: 'queued',
            amount: 90_000,
            effectiveFrom: SEPTEMBER_KEY,
        });
    });

    it('owes the replaced template alone, never a withdraw and a queue', () => {
        const change = outcome({
            kind: 'replaced',
            previousQueued: { amount: 80_000, effectiveFrom: 202610 },
            queued: FROM_SEPTEMBER,
        });
        expect(duesChangeEventOf(change)).toEqual({
            kind: 'replaced',
            amount: 90_000,
            effectiveFrom: SEPTEMBER_KEY,
        });
    });

    it('owes the withdrawn template naming the Period that was cancelled', () => {
        const change = outcome({
            kind: 'withdrawn',
            previousQueued: FROM_SEPTEMBER,
        });
        // No amount travels: the figure that stays is what the current Period
        // charges, read at send time — never the withdrawn row's own figure.
        expect(duesChangeEventOf(change)).toEqual({
            kind: 'withdrawn',
            effectiveFrom: SEPTEMBER_KEY,
        });
    });
});

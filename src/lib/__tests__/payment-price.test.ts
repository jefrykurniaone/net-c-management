import { describe, expect, it } from 'vitest';
import { BEGINNING_OF_TIME } from '../billing-period';
import { expectedPriceOf, type PricedPayment } from '../payment-price';

/**
 * The figure the Admin's Confirm dialog judges a Payment against is the one the
 * Payment's **own** Billing Period charged. A rate set for a later Period never
 * reaches back and flags a Proof that was correct when it was sent.
 */

/** One Activity's history: 75k since forever, 90k from September 2026. */
const RAISED_IN_SEPTEMBER = [
    { amount: 75_000, effectiveFrom: BEGINNING_OF_TIME },
    { amount: 90_000, effectiveFrom: 202609 },
];

function duesFor(month: number, year: number): PricedPayment {
    return {
        type: 'MONTHLY',
        month,
        year,
        activity: { duesRates: RAISED_IN_SEPTEMBER },
        session: null,
    };
}

describe('expectedPriceOf, what a Payment was supposed to be', () => {
    const monthly: readonly [string, number, number, number][] = [
        ['a month years before the rise', 3, 2021, 75_000],
        ['the month before the rise', 8, 2026, 75_000],
        ['the month the rise takes effect', 9, 2026, 90_000],
        ['a month after the rise', 11, 2026, 90_000],
    ];

    it.each(monthly)(
        'judges Dues for %s by that month: %i/%i → %i',
        (_name, month, year, expected) => {
            expect(expectedPriceOf(duesFor(month, year))).toBe(expected);
        },
    );

    it("judges a per-Session Payment by that Session's own Fee, not by Dues", () => {
        const perSession: PricedPayment = {
            type: 'SESSION',
            month: 8,
            year: 2026,
            activity: { duesRates: RAISED_IN_SEPTEMBER },
            session: { fee: 35_000 },
        };
        expect(expectedPriceOf(perSession)).toBe(35_000);
    });

    const noFigure: readonly [string, PricedPayment][] = [
        [
            'the Session a per-Session Payment names is gone',
            {
                type: 'SESSION',
                month: 8,
                year: 2026,
                activity: { duesRates: RAISED_IN_SEPTEMBER },
                session: null,
            },
        ],
        [
            'no Dues Rate row covers the monthly Payment Period',
            {
                type: 'MONTHLY',
                month: 8,
                year: 2026,
                activity: { duesRates: [{ amount: 90_000, effectiveFrom: 202609 }] },
                session: null,
            },
        ],
    ];

    it.each(noFigure)('reads null, never 0, where %s', (_name, payment) => {
        expect(expectedPriceOf(payment)).toBeNull();
    });
});

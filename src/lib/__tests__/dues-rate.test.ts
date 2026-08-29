import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEGINNING_OF_TIME, type BillingPeriod } from '../billing-period';
import {
    findEffectiveDuesRate,
    findQueuedDuesRate,
    resolveDuesRate,
    type DuesRateRow,
} from '../dues-rate';

/**
 * A Dues Rate is frozen per Billing Period: the amount a Period charges is
 * whichever rate was in force when that Period arrived, and setting a new rate
 * for a later Period never reprices an earlier one. These are the rules that
 * say so — the only code in the app that compares a Period to a rate row.
 */

/** One Activity's history: 75k since forever, 90k from September 2026. */
const SINCE_FOREVER: DuesRateRow = {
    amount: 75_000,
    effectiveFrom: BEGINNING_OF_TIME,
};
const FROM_SEPTEMBER: DuesRateRow = { amount: 90_000, effectiveFrom: 202609 };
const FROM_DECEMBER: DuesRateRow = { amount: 120_000, effectiveFrom: 202612 };

const RAISED_IN_SEPTEMBER: DuesRateRow[] = [SINCE_FOREVER, FROM_SEPTEMBER];

function period(month: number, year: number): BillingPeriod {
    return { month, year };
}

describe('resolveDuesRate, the amount a Billing Period charges', () => {
    const cases: readonly [string, BillingPeriod, number][] = [
        ['a Period years before any change', period(1, 2020), 75_000],
        ['the Period before the change', period(8, 2026), 75_000],
        ['the Period the change takes effect', period(9, 2026), 90_000],
        ['the Period after it', period(10, 2026), 90_000],
        ['a Period years after it', period(1, 2030), 90_000],
    ];

    it.each(cases)('charges %s the rate in force: %o → %i', (_name, on, expected) => {
        expect(resolveDuesRate(RAISED_IN_SEPTEMBER, on)).toBe(expected);
    });

    it('reads a Period before every row as the beginning-of-time rate', () => {
        const history = [SINCE_FOREVER, FROM_SEPTEMBER, FROM_DECEMBER];
        expect(resolveDuesRate(history, period(3, 2021))).toBe(75_000);
    });

    it('picks the latest of several changes that have taken effect', () => {
        const history = [SINCE_FOREVER, FROM_SEPTEMBER, FROM_DECEMBER];
        expect(resolveDuesRate(history, period(12, 2026))).toBe(120_000);
        expect(resolveDuesRate(history, period(11, 2026))).toBe(90_000);
    });

    it('does not depend on the order the rows arrive in', () => {
        const shuffled = [FROM_DECEMBER, SINCE_FOREVER, FROM_SEPTEMBER];
        expect(resolveDuesRate(shuffled, period(10, 2026))).toBe(90_000);
    });

    it('returns null rather than 0 when no row covers the Period', () => {
        // The beginning-of-time row exists to make both of these impossible.
        expect(resolveDuesRate([], period(8, 2026))).toBeNull();
        expect(resolveDuesRate([FROM_DECEMBER], period(8, 2026))).toBeNull();
    });
});

describe('findEffectiveDuesRate, the row in force', () => {
    it('hands back the whole row, so who set it and when survive the lookup', () => {
        const setInAugust = {
            ...FROM_SEPTEMBER,
            id: 'rate-2',
            setById: 'admin-1',
            setAt: new Date('2026-08-14T00:00:00.000Z'),
        };
        const found = findEffectiveDuesRate(
            [{ ...SINCE_FOREVER, id: 'rate-1', setById: null, setAt: new Date(0) }, setInAugust],
            period(9, 2026),
        );
        expect(found).toEqual(setInAugust);
    });

    it('finds nothing for an Activity with no rows', () => {
        expect(findEffectiveDuesRate([], period(9, 2026))).toBeNull();
    });
});

describe('findQueuedDuesRate, the change that has not landed', () => {
    const cases: readonly [string, BillingPeriod, DuesRateRow | null][] = [
        ['a Period before it', period(8, 2026), FROM_SEPTEMBER],
        ['the Period it takes effect', period(9, 2026), null],
        ['a Period after it', period(10, 2026), null],
    ];

    it.each(cases)('reads %s as %o', (_name, on, expected) => {
        expect(findQueuedDuesRate(RAISED_IN_SEPTEMBER, on)).toEqual(expected);
    });

    it('names the earliest change still to come', () => {
        const history = [FROM_DECEMBER, SINCE_FOREVER, FROM_SEPTEMBER];
        expect(findQueuedDuesRate(history, period(8, 2026))).toEqual(FROM_SEPTEMBER);
    });

    it('finds nothing queued on an Activity that has only ever had one rate', () => {
        expect(findQueuedDuesRate([SINCE_FOREVER], period(8, 2026))).toBeNull();
    });
});

describe('the resolver never reads a clock', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('answers the same with the system clock decades on', () => {
        const before = resolveDuesRate(RAISED_IN_SEPTEMBER, period(8, 2026));
        const queuedBefore = findQueuedDuesRate(RAISED_IN_SEPTEMBER, period(8, 2026));

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2099-06-01T00:00:00.000Z'));

        expect(resolveDuesRate(RAISED_IN_SEPTEMBER, period(8, 2026))).toBe(before);
        expect(findQueuedDuesRate(RAISED_IN_SEPTEMBER, period(8, 2026))).toEqual(
            queuedBefore,
        );
    });
});

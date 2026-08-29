import { describe, expect, it } from 'vitest';
import { BEGINNING_OF_TIME, toPeriodKey } from '../billing-period';
import {
    DUES_RATE_HORIZON_PERIODS,
    allowedDuesRatePeriods,
    hasDuesRatePeriodArrived,
    isDuesRateEffectiveFromAllowed,
    isDuesRateSaveUnchanged,
    type DuesRateRow,
} from '../dues-rate';
import { buildDuesRateFieldView } from '../dues-rate-view';
import { getDictionary } from '../i18n/dictionaries';

/**
 * The queuing rules, and the field that offers only what they allow.
 *
 * A change starts next Period at the earliest and twelve ahead at the latest,
 * an arrived Period is settled forever, and a save that changes nothing writes
 * nothing. Every rule takes `now` as a parameter, so these read a fixed August
 * 2026 rather than whatever day the suite runs on.
 */

/** Mid-August 2026, local time — the instant every case below is judged at. */
const AUGUST_2026 = new Date(2026, 7, 14, 9, 30);
/** Mid-December 2026, the case where the next Period rolls the year. */
const DECEMBER_2026 = new Date(2026, 11, 20, 9, 30);

const SEPTEMBER_2026 = toPeriodKey(9, 2026);
const AUGUST_KEY = toPeriodKey(8, 2026);

/** 75k since forever, 90k queued from September 2026. */
const SINCE_FOREVER: DuesRateRow = {
    amount: 75_000,
    effectiveFrom: BEGINNING_OF_TIME,
};
const FROM_SEPTEMBER: DuesRateRow = {
    amount: 90_000,
    effectiveFrom: SEPTEMBER_2026,
};

const t = getDictionary('en');

describe('allowedDuesRatePeriods, the months a change may start from', () => {
    it('offers twelve, the first of them the next Period', () => {
        const periods = allowedDuesRatePeriods(AUGUST_2026);
        expect(periods).toHaveLength(DUES_RATE_HORIZON_PERIODS);
        expect(periods[0]).toEqual({ month: 9, year: 2026 });
        expect(periods[DUES_RATE_HORIZON_PERIODS - 1]).toEqual({
            month: 8,
            year: 2027,
        });
    });

    it('rolls the year rather than offering a thirteenth month', () => {
        const periods = allowedDuesRatePeriods(DECEMBER_2026);
        expect(periods[0]).toEqual({ month: 1, year: 2027 });
        expect(periods[DUES_RATE_HORIZON_PERIODS - 1]).toEqual({
            month: 12,
            year: 2027,
        });
    });

    it('never offers the current Period or any before it', () => {
        const keys = allowedDuesRatePeriods(AUGUST_2026).map((period) =>
            toPeriodKey(period.month, period.year),
        );
        expect(keys.every((key) => key > AUGUST_KEY)).toBe(true);
    });
});

describe('isDuesRateEffectiveFromAllowed, the window the route enforces', () => {
    const cases: readonly [string, number, boolean][] = [
        ['a Period long past', toPeriodKey(1, 2020), false],
        ['last Period', toPeriodKey(7, 2026), false],
        ['the current Period', AUGUST_KEY, false],
        ['the next Period', SEPTEMBER_2026, true],
        ['six Periods ahead', toPeriodKey(2, 2027), true],
        ['twelve Periods ahead', toPeriodKey(8, 2027), true],
        ['thirteen Periods ahead', toPeriodKey(9, 2027), false],
        ['the beginning of time', BEGINNING_OF_TIME, false],
    ];

    it.each(cases)('reads %s as %o → %o', (_name, effectiveFrom, expected) => {
        expect(isDuesRateEffectiveFromAllowed(effectiveFrom, AUGUST_2026)).toBe(
            expected,
        );
    });

    /**
     * A YYYYMM key is not dense. These sit numerically between the window's ends
     * and encode no calendar month, so a range check would accept every one of
     * them — and each would later *arrive*, become the rate, and be frozen there
     * by the freeze itself. The rule is membership, not an interval.
     */
    const nonCalendar: readonly [string, number][] = [
        ['month 13', 202613],
        ['month 20', 202620],
        ['month 99', 202699],
        ['month 0 of the next year', 202700],
    ];

    it.each(nonCalendar)('refuses %s (%i), which is no month at all', (_name, key) => {
        expect(isDuesRateEffectiveFromAllowed(key, AUGUST_2026)).toBe(false);
    });

    it('accepts exactly the keys the picker offers, and nothing between them', () => {
        const offered = new Set(
            allowedDuesRatePeriods(AUGUST_2026).map((period) =>
                toPeriodKey(period.month, period.year),
            ),
        );
        for (let key = AUGUST_KEY; key <= toPeriodKey(9, 2027); key += 1) {
            expect(isDuesRateEffectiveFromAllowed(key, AUGUST_2026)).toBe(
                offered.has(key),
            );
        }
    });
});

describe('hasDuesRatePeriodArrived, the freeze', () => {
    const cases: readonly [string, number, boolean][] = [
        ['the beginning-of-time row, which is never editable', BEGINNING_OF_TIME, true],
        ['a Period long past', toPeriodKey(1, 2020), true],
        ['last Period', toPeriodKey(7, 2026), true],
        ['the current Period, settled the moment it arrived', AUGUST_KEY, true],
        ['the next Period', SEPTEMBER_2026, false],
        ['a Period a year out', toPeriodKey(8, 2027), false],
    ];

    it.each(cases)('reads %s as %o → %o', (_name, effectiveFrom, expected) => {
        expect(hasDuesRatePeriodArrived(effectiveFrom, AUGUST_2026)).toBe(
            expected,
        );
    });

    it('freezes a Period the moment the clock reaches it', () => {
        const december = toPeriodKey(12, 2026);
        expect(hasDuesRatePeriodArrived(december, AUGUST_2026)).toBe(false);
        expect(hasDuesRatePeriodArrived(december, DECEMBER_2026)).toBe(true);
    });
});

describe('isDuesRateSaveUnchanged, the save that writes nothing', () => {
    const period = { month: 8, year: 2026 };
    const nothingQueued = [SINCE_FOREVER];
    const changeQueued = [SINCE_FOREVER, FROM_SEPTEMBER];

    const cases: readonly [string, DuesRateRow[], number, number, boolean][] = [
        [
            'the current rate saved again with nothing queued',
            nothingQueued,
            75_000,
            SEPTEMBER_2026,
            true,
        ],
        [
            'a different figure with nothing queued',
            nothingQueued,
            80_000,
            SEPTEMBER_2026,
            false,
        ],
        [
            'a request identical to the queued change',
            changeQueued,
            90_000,
            SEPTEMBER_2026,
            true,
        ],
        [
            'the queued month at a different figure',
            changeQueued,
            95_000,
            SEPTEMBER_2026,
            false,
        ],
        [
            'the queued figure moved to another month',
            changeQueued,
            90_000,
            toPeriodKey(10, 2026),
            false,
        ],
        [
            'the current rate while a change is queued, which withdraws nothing',
            changeQueued,
            75_000,
            SEPTEMBER_2026,
            false,
        ],
    ];

    it.each(cases)(
        'reads %s as %o',
        (_name, rates, amount, effectiveFrom, expected) => {
            expect(
                isDuesRateSaveUnchanged(rates, amount, effectiveFrom, period),
            ).toBe(expected);
        },
    );
});

describe('buildDuesRateFieldView, the Dues field an Admin is shown', () => {
    it('starts at the current rate and the next Period when nothing is queued', () => {
        const view = buildDuesRateFieldView([SINCE_FOREVER], AUGUST_2026, t);
        expect(view.amount).toBe(75_000);
        expect(view.currentAmount).toBe(75_000);
        expect(view.effectiveFrom).toBe(SEPTEMBER_2026);
        expect(view.nextEffectiveFrom).toBe(SEPTEMBER_2026);
        expect(view.queuedEffectiveFrom).toBeNull();
        expect(view.sentence).toContain('Rp 75.000');
    });

    it('follows the queued change, so an unrelated save re-states it', () => {
        const view = buildDuesRateFieldView(
            [SINCE_FOREVER, FROM_SEPTEMBER],
            AUGUST_2026,
            t,
        );
        expect(view.amount).toBe(90_000);
        expect(view.currentAmount).toBe(75_000);
        expect(view.effectiveFrom).toBe(SEPTEMBER_2026);
        expect(view.nextEffectiveFrom).toBe(SEPTEMBER_2026);
        expect(view.queuedEffectiveFrom).toBe(SEPTEMBER_2026);
    });

    it('names the queued figure and its month in the disclosure', () => {
        const view = buildDuesRateFieldView(
            [SINCE_FOREVER, FROM_SEPTEMBER],
            AUGUST_2026,
            t,
        );
        expect(view.sentence).toContain('Rp 75.000');
        expect(view.sentence).toContain('Rp 90.000');
        expect(view.sentence).toContain('September 2026');
    });

    it('offers exactly the Periods the route accepts', () => {
        const view = buildDuesRateFieldView([SINCE_FOREVER], AUGUST_2026, t);
        expect(view.options).toHaveLength(DUES_RATE_HORIZON_PERIODS);
        expect(view.options[0]).toEqual({
            key: SEPTEMBER_2026,
            label: 'September 2026',
        });
        for (const option of view.options) {
            expect(
                isDuesRateEffectiveFromAllowed(option.key, AUGUST_2026),
            ).toBe(true);
        }
    });

    it('drops a queued change from the field once its Period arrives', () => {
        const arrived = buildDuesRateFieldView(
            [SINCE_FOREVER, FROM_SEPTEMBER],
            new Date(2026, 8, 2, 9, 30),
            t,
        );
        expect(arrived.queuedEffectiveFrom).toBeNull();
        expect(arrived.currentAmount).toBe(90_000);
        expect(arrived.amount).toBe(90_000);
    });

    it('says so rather than showing Rp 0 when no row covers the Period', () => {
        const view = buildDuesRateFieldView([FROM_SEPTEMBER], AUGUST_2026, t);
        expect(view.currentAmount).toBeNull();
        expect(view.sentence).toBe(t.admin.duesRateMissingNote);
    });
});

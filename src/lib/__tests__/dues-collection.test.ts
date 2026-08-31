import { PaymentMode, PaymentStatus, PaymentType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { BEGINNING_OF_TIME } from '../billing-period';
import {
    DUES_CHART_PERIODS,
    duesChartPeriods,
    resolveDuesCollectionSeries,
    type DuesChartActivity,
    type DuesChartMembership,
    type DuesChartPayment,
    type DuesCollectionInput,
    type DuesCollectionSeries,
    type DuesPeriodPoint,
} from '../dues-collection';

/**
 * What the admin dashboard's Dues bars claim, asserted as arithmetic.
 *
 * Two figures per Billing Period and one wrong one misleads an Admin about
 * collection, so each rule that decides whether a record counts has its own
 * case: owed prices only Monthly Memberships, at the rate the Period was frozen
 * with; collected counts only Confirmed Dues Payments carrying that Period's
 * month and year. Pending, Rejected and Fees are excluded here, in the code the
 * loader runs, rather than in a `where` clause no test can reach.
 */

/** 15 August 2026, local — so the window is March through August 2026. */
const NOW = new Date(2026, 7, 15);

const MARCH = 202603;
const JUNE = 202606;
const JULY = 202607;
const AUGUST = 202608;

const RATE_75K = { amount: 75_000, effectiveFrom: BEGINNING_OF_TIME };
const RATE_90K_FROM_JULY = { amount: 90_000, effectiveFrom: JULY };
const RATE_40K_FROM_JULY = { amount: 40_000, effectiveFrom: JULY };

function monthlyMember(
    overrides: Partial<DuesChartMembership> = {},
): DuesChartMembership {
    return {
        paymentMode: PaymentMode.MONTHLY,
        effectiveFrom: BEGINNING_OF_TIME,
        pendingMode: null,
        pendingEffectiveFrom: null,
        joinedPeriodKey: BEGINNING_OF_TIME,
        ...overrides,
    };
}

/** One Activity offering both modes, 75k since forever, one Monthly member. */
function activity(overrides: Partial<DuesChartActivity> = {}): DuesChartActivity {
    return {
        id: 'badminton',
        allowsMonthly: true,
        allowsPerSession: true,
        duesRates: [RATE_75K],
        memberships: [monthlyMember()],
        ...overrides,
    };
}

/** A Confirmed Dues Payment for August 2026. */
function duesPayment(overrides: Partial<DuesChartPayment> = {}): DuesChartPayment {
    return {
        amount: 75_000,
        month: 8,
        year: 2026,
        status: PaymentStatus.CONFIRMED,
        type: PaymentType.MONTHLY,
        ...overrides,
    };
}

function series(input: Partial<DuesCollectionInput> = {}): DuesCollectionSeries {
    return resolveDuesCollectionSeries({
        activities: [],
        payments: [],
        now: NOW,
        ...input,
    });
}

/** The point for one YYYYMM key — never a silent `undefined` to assert against. */
function pointAt(result: DuesCollectionSeries, periodKey: number): DuesPeriodPoint {
    const point = result.points.find((each) => each.periodKey === periodKey);
    if (!point) {
        throw new Error(`Period ${periodKey} is not in the window`);
    }
    return point;
}

describe('duesChartPeriods, the six Periods the chart covers', () => {
    it('ends with the Period containing now, oldest first', () => {
        expect(duesChartPeriods(NOW)).toEqual([
            { month: 3, year: 2026 },
            { month: 4, year: 2026 },
            { month: 5, year: 2026 },
            { month: 6, year: 2026 },
            { month: 7, year: 2026 },
            { month: 8, year: 2026 },
        ]);
    });

    it('rolls back across a year boundary', () => {
        expect(duesChartPeriods(new Date(2027, 0, 10))).toEqual([
            { month: 8, year: 2026 },
            { month: 9, year: 2026 },
            { month: 10, year: 2026 },
            { month: 11, year: 2026 },
            { month: 12, year: 2026 },
            { month: 1, year: 2027 },
        ]);
    });
});

describe('an empty community', () => {
    it('is six zero Periods, not an empty series', () => {
        const result = series();
        expect(result.points).toHaveLength(DUES_CHART_PERIODS);
        expect(result.points.map((point) => point.owed)).toEqual([0, 0, 0, 0, 0, 0]);
        expect(result.points.map((point) => point.collected)).toEqual([
            0, 0, 0, 0, 0, 0,
        ]);
        expect(result.skipped).toEqual([]);
    });
});

describe('collected, the money that actually came in', () => {
    it('sums Confirmed Dues Payments carrying the Period month and year', () => {
        const result = series({
            payments: [duesPayment(), duesPayment({ amount: 40_000 })],
        });
        expect(pointAt(result, AUGUST).collected).toBe(115_000);
    });

    const refused: readonly [string, PaymentStatus][] = [
        ['Pending', PaymentStatus.PENDING],
        ['Rejected', PaymentStatus.REJECTED],
    ];

    it.each(refused)('never counts a %s Payment — a hold is not money', (_name, status) => {
        const result = series({ payments: [duesPayment({ status })] });
        expect(pointAt(result, AUGUST).collected).toBe(0);
    });

    it('never counts a Fee, however confirmed', () => {
        const result = series({
            payments: [
                duesPayment({ type: PaymentType.SESSION, amount: 25_000 }),
            ],
        });
        expect(pointAt(result, AUGUST).collected).toBe(0);
    });

    it('counts a Payment against the Period it is for', () => {
        const result = series({ payments: [duesPayment({ month: 7 })] });
        expect(pointAt(result, JULY).collected).toBe(75_000);
        expect(pointAt(result, AUGUST).collected).toBe(0);
    });

    it('ignores a Payment outside the six-Period window', () => {
        const result = series({
            payments: [duesPayment({ month: 2 }), duesPayment({ month: 9 })],
        });
        expect(result.points.map((point) => point.collected)).toEqual([
            0, 0, 0, 0, 0, 0,
        ]);
    });
});

describe('owed, resolved through the Dues Rate history', () => {
    it('prices each Period with the rate that was in force when it arrived', () => {
        const raised = activity({
            duesRates: [RATE_75K, RATE_90K_FROM_JULY],
            memberships: [monthlyMember(), monthlyMember()],
        });
        const result = series({ activities: [raised] });
        expect(pointAt(result, JUNE).owed).toBe(150_000);
        expect(pointAt(result, JULY).owed).toBe(180_000);
        expect(pointAt(result, AUGUST).owed).toBe(180_000);
    });

    it('counts a switching Membership only in its Monthly Periods', () => {
        const switcher = monthlyMember({
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: JULY,
        });
        const result = series({
            activities: [activity({ memberships: [switcher] })],
        });
        expect(pointAt(result, JUNE).owed).toBe(75_000);
        expect(pointAt(result, JULY).owed).toBe(0);
        expect(pointAt(result, AUGUST).owed).toBe(0);
    });

    it('never counts a Per-Session Membership — its Seats are funded by Fees', () => {
        const perSession = monthlyMember({ paymentMode: PaymentMode.PER_SESSION });
        const result = series({
            activities: [activity({ memberships: [perSession] })],
        });
        expect(result.points.map((point) => point.owed)).toEqual([
            0, 0, 0, 0, 0, 0,
        ]);
    });

    it('never counts a Membership that has chosen no mode where both are offered', () => {
        const result = series({
            activities: [
                activity({ memberships: [monthlyMember({ paymentMode: null })] }),
            ],
        });
        expect(result.points.map((point) => point.owed)).toEqual([
            0, 0, 0, 0, 0, 0,
        ]);
    });

    it('counts an unchosen Membership where the Activity offers Monthly alone', () => {
        const monthlyOnly = activity({
            allowsPerSession: false,
            memberships: [monthlyMember({ paymentMode: null })],
        });
        expect(pointAt(series({ activities: [monthlyOnly] }), AUGUST).owed).toBe(
            75_000,
        );
    });

    it('never prices a Membership before the Period it joined in', () => {
        const joinedInJuly = monthlyMember({ joinedPeriodKey: JULY });
        const result = series({
            activities: [activity({ memberships: [joinedInJuly] })],
        });
        expect(pointAt(result, JUNE).owed).toBe(0);
        expect(pointAt(result, JULY).owed).toBe(75_000);
        expect(pointAt(result, AUGUST).owed).toBe(75_000);
    });

    /**
     * A known limit, pinned so it stays known. A Membership records a standing
     * mode rather than a history: once a switch to Per-Session lands, nothing
     * says the member was on Monthly in March, and `resolvePaymentMode` falls
     * back to the offered set, which answers `null` where both modes are
     * offered. So a settled Period can lose owed it did have — and read
     * collected above owed. Undoing it needs a Membership mode history in the
     * shape ADR 0002 gave the Dues Rate, which is a schema decision of its own.
     */
    it('loses a past Period once a switch away from Monthly has landed', () => {
        const switched = monthlyMember({
            paymentMode: PaymentMode.PER_SESSION,
            effectiveFrom: AUGUST,
        });
        const result = series({
            activities: [activity({ memberships: [switched] })],
        });
        expect(pointAt(result, JUNE).owed).toBe(0);
    });

    it('keeps that Period where the Activity offers Monthly alone', () => {
        const switched = monthlyMember({
            paymentMode: PaymentMode.PER_SESSION,
            effectiveFrom: AUGUST,
        });
        const monthlyOnly = activity({
            allowsPerSession: false,
            memberships: [switched],
        });
        expect(pointAt(series({ activities: [monthlyOnly] }), JUNE).owed).toBe(
            75_000,
        );
    });

    it('keeps a Period with nothing owed as a zero rather than dropping it', () => {
        const result = series({
            activities: [
                activity({
                    memberships: [monthlyMember({ joinedPeriodKey: AUGUST })],
                }),
            ],
        });
        expect(result.points).toHaveLength(DUES_CHART_PERIODS);
        expect(pointAt(result, MARCH).owed).toBe(0);
    });
});

describe('an Activity no Dues Rate covers', () => {
    const uncovered = activity({
        id: 'futsal',
        duesRates: [RATE_40K_FROM_JULY],
    });

    it('is left out of owed rather than charging zero for it', () => {
        const result = series({ activities: [activity(), uncovered] });
        // March has no Futsal rate at all, so only Badminton's 75k is owed —
        // Futsal is absent from the figure, not priced at nothing.
        expect(pointAt(result, MARCH).owed).toBe(75_000);
        expect(pointAt(result, JULY).owed).toBe(115_000);
    });

    it('records the skip, so a missing rate cannot pass in silence', () => {
        const result = series({ activities: [activity(), uncovered] });
        expect(result.skipped).toEqual([
            { activityId: 'futsal', periodKey: 202603 },
            { activityId: 'futsal', periodKey: 202604 },
            { activityId: 'futsal', periodKey: 202605 },
            { activityId: 'futsal', periodKey: 202606 },
        ]);
    });

    it('records no skip when every Activity is covered', () => {
        expect(series({ activities: [activity()] }).skipped).toEqual([]);
    });
});

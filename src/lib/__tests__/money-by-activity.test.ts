import { PaymentStatus, PaymentType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
    resolveMoneyByActivitySeries,
    type MoneyByActivityInput,
    type MoneyByActivitySeries,
    type MoneyChartPayment,
} from '../money-by-activity';

/**
 * What the admin dashboard's donut claims, asserted as arithmetic.
 *
 * The figure an Admin quotes off this ring is Dues **and** Fees for one Period,
 * which is a different total from the Dues chart beside it and a different
 * total again from the dashboard's Dues stat tile. That is only defensible if
 * each rule deciding whether a row counts has its own case: Confirmed only, a
 * Dues row by the Period it names, a Fee by its Session's date, and a Fee that
 * names no Session left out and reported rather than guessed at.
 */

/** 15 August 2026, local — so the Period counted is August 2026. */
const NOW = new Date(2026, 7, 15);

/** UTC midnight of a WIB day in August 2026 — how a Session date is stored. */
const IN_PERIOD = new Date('2026-08-10T00:00:00.000Z');
/** The same, in July: one Period earlier. */
const BEFORE_PERIOD = new Date('2026-07-28T00:00:00.000Z');

const BADMINTON = { id: 'badminton', name: 'Badminton' };
const FUTSAL = { id: 'futsal', name: 'Futsal' };

/** A Confirmed Dues Payment for August 2026 on Badminton. */
function duesPayment(
    overrides: Partial<MoneyChartPayment> = {},
): MoneyChartPayment {
    return {
        id: 'dues-1',
        activityId: BADMINTON.id,
        activityName: BADMINTON.name,
        amount: 75_000,
        month: 8,
        year: 2026,
        status: PaymentStatus.CONFIRMED,
        type: PaymentType.MONTHLY,
        sessionDate: null,
        ...overrides,
    };
}

/** A Confirmed Fee on Badminton whose Session falls inside August 2026. */
function feePayment(
    overrides: Partial<MoneyChartPayment> = {},
): MoneyChartPayment {
    return {
        id: 'fee-1',
        activityId: BADMINTON.id,
        activityName: BADMINTON.name,
        amount: 20_000,
        month: 8,
        year: 2026,
        status: PaymentStatus.CONFIRMED,
        type: PaymentType.SESSION,
        sessionDate: IN_PERIOD,
        ...overrides,
    };
}

function series(
    input: Partial<MoneyByActivityInput> = {},
): MoneyByActivitySeries {
    return resolveMoneyByActivitySeries({
        activities: [BADMINTON, FUTSAL],
        payments: [],
        now: NOW,
        ...input,
    });
}

/** One Activity's slice — never a silent `undefined` to assert against. */
function sliceFor(result: MoneyByActivitySeries, activityId: string) {
    const slice = result.slices.find((each) => each.activityId === activityId);
    if (!slice) {
        throw new Error(`Activity ${activityId} is not in the series`);
    }
    return slice;
}

describe('the Period the ring counts', () => {
    it('is the one containing now', () => {
        expect(series().period).toEqual({ month: 8, year: 2026 });
    });

    it('is empty and zero for a community with no Payments at all', () => {
        const result = resolveMoneyByActivitySeries({
            activities: [],
            payments: [],
            now: NOW,
        });

        expect(result.slices).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.unplacedFees).toEqual([]);
    });
});

describe('which Payments count', () => {
    it.each([PaymentStatus.PENDING, PaymentStatus.REJECTED])(
        'leaves a %s Payment out — a hold is not money',
        (status) => {
            const result = series({ payments: [duesPayment({ status })] });

            expect(result.total).toBe(0);
            expect(sliceFor(result, BADMINTON.id).amount).toBe(0);
        },
    );

    it('counts a Confirmed Dues Payment carrying this Period', () => {
        expect(series({ payments: [duesPayment()] }).total).toBe(75_000);
    });

    it('leaves out a Dues Payment naming another Period', () => {
        const result = series({
            payments: [duesPayment({ month: 7 }), duesPayment({ year: 2025 })],
        });

        expect(result.total).toBe(0);
    });

    it('counts a Fee whose Session falls in this Period', () => {
        expect(series({ payments: [feePayment()] }).total).toBe(20_000);
    });

    it('leaves out a Fee whose Session falls outside this Period', () => {
        const result = series({
            payments: [feePayment({ sessionDate: BEFORE_PERIOD })],
        });

        expect(result.total).toBe(0);
    });

    it('places a Fee by its Session, not by its own month and year', () => {
        // The columns say August, the Session says July. AD-4 derives the
        // columns from the Session, so the two only differ once something has
        // gone wrong — and when they do, the Session is what places the Fee.
        const result = series({
            payments: [
                feePayment({ month: 8, year: 2026, sessionDate: BEFORE_PERIOD }),
            ],
        });

        expect(result.total).toBe(0);
    });

    it('counts a Fee on the first WIB day of the Period', () => {
        const result = series({
            payments: [
                feePayment({
                    sessionDate: new Date('2026-08-01T00:00:00.000Z'),
                }),
            ],
        });

        expect(result.total).toBe(20_000);
    });

    it('leaves out a Fee on the last WIB day before the Period', () => {
        const result = series({
            payments: [
                feePayment({
                    sessionDate: new Date('2026-07-31T00:00:00.000Z'),
                }),
            ],
        });

        expect(result.total).toBe(0);
    });

    it('counts Dues and Fees together, which is what this ring is', () => {
        const result = series({ payments: [duesPayment(), feePayment()] });

        expect(sliceFor(result, BADMINTON.id).amount).toBe(95_000);
        expect(result.total).toBe(95_000);
    });
});

describe('a Fee that names no Session', () => {
    const orphan = feePayment({ id: 'fee-orphan', sessionDate: null });

    it('is left out of the total rather than placed by its own columns', () => {
        const result = series({ payments: [orphan] });

        expect(result.total).toBe(0);
        expect(sliceFor(result, BADMINTON.id).amount).toBe(0);
    });

    it('is reported, so a broken row cannot pass in silence', () => {
        expect(series({ payments: [orphan] }).unplacedFees).toEqual([
            { paymentId: 'fee-orphan', activityId: BADMINTON.id },
        ]);
    });

    it('is not reported when the Fee has a Session, healthy or out of window', () => {
        const result = series({
            payments: [feePayment(), feePayment({ sessionDate: BEFORE_PERIOD })],
        });

        expect(result.unplacedFees).toEqual([]);
    });

    it('is never reported for a Dues row, which has no Session by definition', () => {
        expect(series({ payments: [duesPayment()] }).unplacedFees).toEqual([]);
    });
});

describe('grouping by Activity', () => {
    it('sums every counted Payment of one Activity into one slice', () => {
        const result = series({
            payments: [
                duesPayment({ id: 'a' }),
                duesPayment({ id: 'b', amount: 25_000 }),
                feePayment({ id: 'c' }),
            ],
        });

        expect(sliceFor(result, BADMINTON.id).amount).toBe(120_000);
        expect(result.slices).toHaveLength(2);
    });

    it('keeps the Activities that took nothing, at zero', () => {
        const result = series({ payments: [duesPayment()] });

        expect(sliceFor(result, FUTSAL.id)).toEqual({
            activityId: FUTSAL.id,
            activityName: FUTSAL.name,
            amount: 0,
        });
    });

    it('still counts money on an Activity outside the listed set, and names it', () => {
        // An Activity deactivated since the Payment landed is not in the zero
        // baseline. Dropping its slice would make the centre stop equalling
        // the sum, so the row's own Activity name opens one.
        const result = series({
            payments: [
                duesPayment({
                    activityId: 'archived',
                    activityName: 'Table Tennis',
                }),
            ],
        });

        expect(sliceFor(result, 'archived')).toEqual({
            activityId: 'archived',
            activityName: 'Table Tennis',
            amount: 75_000,
        });
        expect(result.total).toBe(75_000);
    });

    it('orders slices largest first, then by name, then by id', () => {
        const result = series({
            activities: [
                { id: 'c', name: 'Cycling' },
                { id: 'b', name: 'Badminton' },
                { id: 'a', name: 'Archery' },
            ],
            payments: [duesPayment({ activityId: 'c', activityName: 'Cycling' })],
        });

        expect(result.slices.map((slice) => slice.activityId)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });
});

describe('the total in the centre', () => {
    it('equals the sum of the slices', () => {
        const result = series({
            payments: [
                duesPayment(),
                duesPayment({ id: 'd2', activityId: FUTSAL.id, amount: 50_000 }),
                feePayment(),
                duesPayment({ id: 'p', status: PaymentStatus.PENDING }),
                feePayment({ id: 'f2', sessionDate: BEFORE_PERIOD }),
            ],
        });

        const summed = result.slices.reduce(
            (sum, slice) => sum + slice.amount,
            0,
        );
        expect(result.total).toBe(summed);
        expect(result.total).toBe(145_000);
    });
});

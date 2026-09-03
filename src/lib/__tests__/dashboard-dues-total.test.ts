import { PaymentMode } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    sumDuesForPeriod,
    type DuesTotalActivity,
} from '@/app/(admin)/admin/dashboard-dues-total';
import { BEGINNING_OF_TIME, type BillingPeriod } from '@/lib/billing-period';
import type { MembershipMode } from '@/lib/payment-mode';

/**
 * What the admin dashboard's "Dues collected" tile claims is owed, asserted as
 * arithmetic.
 *
 * Every case below is an amount for one Billing Period, never the shape of a
 * query — the tile's own defect (#203) was a `groupBy` that answered a question
 * nobody had asked it, and a test of the query would have agreed with it. The
 * rule the amounts pin is that a headcount is not what the community is owed:
 * only a Membership `resolvePaymentMode` resolves to `MONTHLY` for the Period
 * being priced is billed for Dues, and it is billed at the rate that Period was
 * frozen with (`docs/adr/0002-dues-rate-history.md`).
 *
 * The tile's other figure, `collected`, is a Prisma `where` clause with no pure
 * seam to reach; the identical exclusion on the chart's side is pinned by
 * `dues-collection.test.ts` ("never counts a Fee, however confirmed").
 */

/** The Period the tile prices — September 2026, and its YYYYMM key. */
const PERIOD: BillingPeriod = { month: 9, year: 2026 };
const SEPTEMBER = 202609;
const OCTOBER = 202610;

const RATE_75K = { amount: 75_000, effectiveFrom: BEGINNING_OF_TIME };
const RATE_90K_FROM_OCTOBER = { amount: 90_000, effectiveFrom: OCTOBER };

/** A Membership standing on Monthly since forever, with nothing queued. */
function monthlyMember(overrides: Partial<MembershipMode> = {}): MembershipMode {
    return {
        paymentMode: PaymentMode.MONTHLY,
        effectiveFrom: BEGINNING_OF_TIME,
        pendingMode: null,
        pendingEffectiveFrom: null,
        ...overrides,
    };
}

/** One Activity offering both modes, 75k since forever, one Monthly member. */
function activity(overrides: Partial<DuesTotalActivity> = {}): DuesTotalActivity {
    return {
        id: 'badminton',
        allowsMonthly: true,
        allowsPerSession: true,
        duesRates: [RATE_75K],
        memberships: [monthlyMember()],
        ...overrides,
    };
}

function totalDue(activities: readonly DuesTotalActivity[]): number {
    return sumDuesForPeriod(activities, PERIOD);
}

describe('totalDue, priced through the Dues Rate history', () => {
    it('charges each Monthly Membership the rate the Period is on', () => {
        const roster = activity({
            memberships: [monthlyMember(), monthlyMember()],
        });
        expect(totalDue([roster])).toBe(150_000);
    });

    it('never charges a rate queued for a later Period', () => {
        const raised = activity({
            duesRates: [RATE_75K, RATE_90K_FROM_OCTOBER],
        });
        expect(totalDue([raised])).toBe(75_000);
    });

    it('adds every Activity together', () => {
        const futsal = activity({
            id: 'futsal',
            duesRates: [{ amount: 40_000, effectiveFrom: BEGINNING_OF_TIME }],
        });
        expect(totalDue([activity(), futsal])).toBe(115_000);
    });

    it('owes nothing for an Activity nobody is a member of', () => {
        expect(totalDue([activity({ memberships: [] })])).toBe(0);
    });
});

describe('totalDue, counting only the Memberships that owe Dues', () => {
    it('never counts a Per-Session Membership — its Seats are funded by Fees', () => {
        const perSession = monthlyMember({
            paymentMode: PaymentMode.PER_SESSION,
        });
        expect(totalDue([activity({ memberships: [perSession] })])).toBe(0);
    });

    it('never counts a Membership that has chosen no mode where both are offered', () => {
        const unchosen = monthlyMember({ paymentMode: null });
        expect(totalDue([activity({ memberships: [unchosen] })])).toBe(0);
    });

    it('counts an unchosen Membership where the Activity offers Monthly alone', () => {
        const monthlyOnly = activity({
            allowsPerSession: false,
            memberships: [monthlyMember({ paymentMode: null })],
        });
        expect(totalDue([monthlyOnly])).toBe(75_000);
    });

    it('still counts a Membership whose switch away lands next Period', () => {
        const switching = monthlyMember({
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: OCTOBER,
        });
        expect(totalDue([activity({ memberships: [switching] })])).toBe(75_000);
    });

    it('drops a Membership the Period its switch away arrives', () => {
        const switched = monthlyMember({
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: SEPTEMBER,
        });
        expect(totalDue([activity({ memberships: [switched] })])).toBe(0);
    });

    /**
     * The dev seed's shape, and the arithmetic the tile got wrong: a roster of
     * three where one owes Dues. The headcount answer is 225,000 and the
     * community is owed 75,000.
     */
    it('bills a mixed roster for its Monthly members alone', () => {
        const mixed = activity({
            memberships: [
                monthlyMember(),
                monthlyMember({ paymentMode: PaymentMode.PER_SESSION }),
                monthlyMember({ paymentMode: null }),
            ],
        });
        expect(totalDue([mixed])).toBe(75_000);
    });
});

describe('an Activity no Dues Rate covers', () => {
    const uncovered = activity({
        id: 'futsal',
        duesRates: [RATE_90K_FROM_OCTOBER],
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is left out of the total rather than priced at nothing', () => {
        const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(totalDue([activity(), uncovered])).toBe(75_000);
        expect(logged).toHaveBeenCalledTimes(1);
        expect(logged).toHaveBeenCalledWith(expect.stringContaining('futsal'));
    });

    it('says nothing when every Activity is covered', () => {
        const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(totalDue([activity()])).toBe(75_000);
        expect(logged).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from 'vitest';
import { PaymentMode } from '@prisma/client';
import { BEGINNING_OF_TIME } from '../billing-period';
import {
    describeDelivery,
    planDuesChange,
    type AudienceActivity,
} from '../dues-change-mail';
import type { DuesChangeEvent } from '../dues-notice';

/**
 * Why a Dues-change email sent nothing — the half of #135 that can be pinned
 * without a running server.
 *
 * The three no-send outcomes used to be bare `return`s inside the post-response
 * callback, and a bare `return` cannot be tested or read in a log: a member who
 * never heard about a price change and a member who correctly heard nothing
 * looked the same from outside. These cases fix the reason each outcome reports,
 * and the last one rules a candidate cause of #135 out by construction — a
 * `'queued'` event names the figure the write itself reported, so it can never
 * take the `no-amount` path however broken the Activity's rate rows are.
 */

const SEPTEMBER_KEY = 202609;
const IN_JULY = new Date(2026, 6, 15);

const MONTHLY_ONLY = { allowsMonthly: true, allowsPerSession: false };
const BOTH_MODES = { allowsMonthly: true, allowsPerSession: true };

const SINCE_FOREVER = { amount: 75_000, effectiveFrom: BEGINNING_OF_TIME };

type Membership = AudienceActivity['memberships'][number];

function membership(overrides: Partial<Membership> = {}): Membership {
    return {
        paymentMode: PaymentMode.MONTHLY,
        effectiveFrom: BEGINNING_OF_TIME,
        pendingMode: null,
        pendingEffectiveFrom: null,
        user: { name: 'Member', email: 'member@example.com' },
        ...overrides,
    };
}

function activity(overrides: Partial<AudienceActivity> = {}): AudienceActivity {
    return {
        name: 'Tennis',
        ...MONTHLY_ONLY,
        duesRates: [SINCE_FOREVER],
        memberships: [membership()],
        ...overrides,
    };
}

const QUEUED: DuesChangeEvent = {
    kind: 'queued',
    amount: 90_000,
    effectiveFrom: SEPTEMBER_KEY,
};
const WITHDRAWN: DuesChangeEvent = {
    kind: 'withdrawn',
    effectiveFrom: SEPTEMBER_KEY,
};

describe('planDuesChange, what a Dues change sends and to whom', () => {
    it('sends the figure the write reported to every member billed Monthly', () => {
        const plan = planDuesChange(activity(), QUEUED, IN_JULY);
        expect(plan).toEqual({
            kind: 'send',
            activityName: 'Tennis',
            amount: 90_000,
            considered: 1,
            recipients: [{ to: 'member@example.com', name: 'Member' }],
        });
    });

    it('takes in a member whose queued switch to Monthly covers the period', () => {
        const plan = planDuesChange(
            activity({
                ...BOTH_MODES,
                memberships: [
                    membership({
                        paymentMode: PaymentMode.PER_SESSION,
                        pendingMode: PaymentMode.MONTHLY,
                        pendingEffectiveFrom: SEPTEMBER_KEY,
                        user: { name: 'Nadia', email: 'nadia@example.com' },
                    }),
                ],
            }),
            QUEUED,
            IN_JULY,
        );
        expect(plan).toMatchObject({
            kind: 'send',
            recipients: [{ to: 'nadia@example.com', name: 'Nadia' }],
        });
    });

    it('addresses a member with no name by their own address', () => {
        const plan = planDuesChange(
            activity({
                memberships: [
                    membership({
                        user: { name: null, email: 'citra@example.com' },
                    }),
                ],
            }),
            QUEUED,
            IN_JULY,
        );
        expect(plan).toMatchObject({
            kind: 'send',
            recipients: [{ to: 'citra@example.com', name: 'citra@example.com' }],
        });
    });
});

describe('planDuesChange, why a Dues change sent nothing', () => {
    it('reports a missing Activity rather than returning silently', () => {
        const plan = planDuesChange(null, QUEUED, IN_JULY);
        expect(plan).toEqual({ kind: 'no-activity' });
        expect(describeDelivery(plan)).toBe('nothing sent, Activity not found');
    });

    it('counts the memberships it loaded when none is billed Monthly', () => {
        const perSession = membership({
            paymentMode: PaymentMode.PER_SESSION,
            user: { name: 'Per session', email: 'per-session@example.com' },
        });
        const plan = planDuesChange(
            activity({
                ...BOTH_MODES,
                memberships: [perSession, perSession, perSession],
            }),
            QUEUED,
            IN_JULY,
        );
        expect(plan).toEqual({ kind: 'no-audience', considered: 3 });
        expect(describeDelivery(plan)).toBe(
            'nothing sent, 0 of 3 loaded memberships are billed Monthly for the period',
        );
    });

    it('separates an Activity with no members from an audience that narrowed to none', () => {
        const plan = planDuesChange(
            activity({ memberships: [] }),
            QUEUED,
            IN_JULY,
        );
        expect(describeDelivery(plan)).toBe(
            'nothing sent, 0 of 0 loaded memberships are billed Monthly for the period',
        );
    });

    it('skips a membership whose user has no address', () => {
        const plan = planDuesChange(
            activity({
                memberships: [membership({ user: { name: 'No mail', email: null } })],
            }),
            QUEUED,
            IN_JULY,
        );
        expect(plan).toEqual({ kind: 'no-audience', considered: 1 });
    });

    it('reports the broken rate invariant when a withdrawal has no rate to name', () => {
        const plan = planDuesChange(
            activity({ duesRates: [{ amount: 80_000, effectiveFrom: 202610 }] }),
            WITHDRAWN,
            IN_JULY,
        );
        expect(plan).toEqual({ kind: 'no-amount', considered: 1 });
        expect(describeDelivery(plan)).toBe(
            'nothing sent, no Dues Rate row covers the period (1 loaded memberships)',
        );
    });

    it('never blames the amount for a queued change, however broken the rows are', () => {
        const plan = planDuesChange(
            activity({ duesRates: [] }),
            QUEUED,
            IN_JULY,
        );
        expect(plan).toMatchObject({ kind: 'send', amount: 90_000 });
    });
});

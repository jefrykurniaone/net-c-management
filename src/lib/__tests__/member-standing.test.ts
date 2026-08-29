import { describe, expect, it } from 'vitest';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { ADMITTED_MEMBER_WHERE, WAITING_APPLICANT_WHERE } from '../admission';
import { resolveMembershipStanding } from '../member-standing';
import type { BillingPeriod, MembershipMode, OfferedModes } from '../payment-mode';

/**
 * Standing is the one thing the Members register says about money, and it is
 * said per Membership rather than per person. Two rules carry it: a per-Session
 * Membership has no standing at all, and a monthly one is settled only by money
 * that funds the period — a Rejected Payment funds nothing.
 */

const PERIOD: BillingPeriod = { month: 8, year: 2026 };
const PERIOD_KEY = 202608;

const BOTH_MODES: OfferedModes = { allowsMonthly: true, allowsPerSession: true };
const MONTHLY_ONLY: OfferedModes = {
    allowsMonthly: true,
    allowsPerSession: false,
};
const PER_SESSION_ONLY: OfferedModes = {
    allowsMonthly: false,
    allowsPerSession: true,
};

function membershipOn(mode: PaymentMode | null): MembershipMode {
    return {
        paymentMode: mode,
        effectiveFrom: mode === null ? 0 : PERIOD_KEY,
        pendingMode: null,
        pendingEffectiveFrom: null,
    };
}

describe('resolveMembershipStanding, monthly', () => {
    const cases: readonly [PaymentStatus | null, string][] = [
        [PaymentStatus.CONFIRMED, 'settled'],
        [PaymentStatus.PENDING, 'awaiting'],
        [PaymentStatus.REJECTED, 'owed'],
        [null, 'owed'],
    ];

    it.each(cases)(
        'reads a %s Payment for the period as %s',
        (periodStatus, expected) => {
            const standing = resolveMembershipStanding(
                {
                    membership: membershipOn(PaymentMode.MONTHLY),
                    offered: BOTH_MODES,
                    periodStatus,
                },
                PERIOD,
            );
            expect(standing).toEqual({
                mode: PaymentMode.MONTHLY,
                standing: expected,
            });
        },
    );
});

describe('resolveMembershipStanding, everything that is not monthly', () => {
    it('gives a per-Session Membership its mode and no standing', () => {
        const standing = resolveMembershipStanding(
            {
                membership: membershipOn(PaymentMode.PER_SESSION),
                offered: BOTH_MODES,
                periodStatus: PaymentStatus.CONFIRMED,
            },
            PERIOD,
        );
        expect(standing).toEqual({
            mode: PaymentMode.PER_SESSION,
            standing: 'none',
        });
    });

    it('gives an unchosen Membership no mode and no standing', () => {
        const standing = resolveMembershipStanding(
            { membership: membershipOn(null), offered: BOTH_MODES, periodStatus: null },
            PERIOD,
        );
        expect(standing).toEqual({ mode: null, standing: 'none' });
    });
});

describe('resolveMembershipStanding reads the mode resolver, never the Payments', () => {
    it('takes the sole offered mode where the member chose nothing', () => {
        expect(
            resolveMembershipStanding(
                {
                    membership: membershipOn(null),
                    offered: MONTHLY_ONLY,
                    periodStatus: null,
                },
                PERIOD,
            ),
        ).toEqual({ mode: PaymentMode.MONTHLY, standing: 'owed' });

        expect(
            resolveMembershipStanding(
                {
                    membership: membershipOn(null),
                    offered: PER_SESSION_ONLY,
                    periodStatus: null,
                },
                PERIOD,
            ).standing,
        ).toBe('none');
    });

    it('keeps a switch queued for a later period out of this one', () => {
        const membership: MembershipMode = {
            paymentMode: PaymentMode.MONTHLY,
            effectiveFrom: 202601,
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: 202609,
        };
        expect(
            resolveMembershipStanding(
                { membership, offered: BOTH_MODES, periodStatus: null },
                PERIOD,
            ),
        ).toEqual({ mode: PaymentMode.MONTHLY, standing: 'owed' });
    });

    it('applies a switch once its own period has arrived', () => {
        const membership: MembershipMode = {
            paymentMode: PaymentMode.MONTHLY,
            effectiveFrom: 202601,
            pendingMode: PaymentMode.PER_SESSION,
            pendingEffectiveFrom: PERIOD_KEY,
        };
        expect(
            resolveMembershipStanding(
                {
                    membership,
                    offered: BOTH_MODES,
                    periodStatus: PaymentStatus.CONFIRMED,
                },
                PERIOD,
            ),
        ).toEqual({ mode: PaymentMode.PER_SESSION, standing: 'none' });
    });
});

describe('the roster predicate', () => {
    it('selects on admittedAt, so no Applicant reaches the Members register', () => {
        expect(ADMITTED_MEMBER_WHERE).toEqual({ admittedAt: { not: null } });
        expect(WAITING_APPLICANT_WHERE.admittedAt).toBeNull();
    });

    it('keeps a revoked member on the roster, unlike the admission queue', () => {
        expect(ADMITTED_MEMBER_WHERE).not.toHaveProperty('isActive');
        expect(WAITING_APPLICANT_WHERE.isActive).toBe(true);
    });
});

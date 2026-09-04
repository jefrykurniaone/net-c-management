import { PaymentMode, PaymentStatus } from '@prisma/client';
import {
    resolvePaymentMode,
    type BillingPeriod,
    type MembershipMode,
    type OfferedModes,
} from './payment-mode';

/**
 * A Membership's **standing** — its Dues state for the Billing Period in force,
 * as the Members register draws it.
 *
 * A view module (`docs/adr/0006-view-modules.md`) reading `resolvePaymentMode`
 * for the effective mode and `pickPeriodPaymentStatus` for the period's already
 * picked Payment status, and turning the pair into the one fact the register
 * shows.
 *
 * Standing is a property of a **monthly** Membership only. A per-Session
 * Membership has no recurring obligation, so there is nothing for it to be in
 * good or bad standing on — it carries its mode label and no chip.
 */

/**
 * - `settled` — the period's Dues are Confirmed. Drawn **settled**.
 * - `awaiting` — a Payment stands against the period and an Admin has not
 *   decided it. Drawn **provisional**.
 * - `owed` — the period is not funded: nothing has been sent, or the only
 *   Payment against it was Rejected and funds nothing. Drawn **neutral**, which
 *   is the same chip the member's own profile draws for this state.
 * - `none` — not a monthly Membership, so there is no standing to draw.
 */
export type DuesStanding = 'settled' | 'awaiting' | 'owed' | 'none';

/** What deciding one Membership's standing needs. */
export interface MembershipStandingInput {
    readonly membership: MembershipMode;
    readonly offered: OfferedModes;
    /**
     * The one Payment that speaks for the current Billing Period on this
     * Activity, already picked by `pickPeriodPaymentStatus`. Null where none
     * stands against it.
     */
    readonly periodStatus: PaymentStatus | null;
}

/** The effective mode for the period, and what it is standing at. */
export interface MembershipStanding {
    readonly mode: PaymentMode | null;
    readonly standing: DuesStanding;
}

/**
 * A Rejected Payment funds nothing, so it leaves the period owed — the same
 * reading `isLivePaymentStatus` applies on the write path, rather than a second
 * opinion about what Rejected means.
 */
const STANDING_BY_STATUS: Record<PaymentStatus, DuesStanding> = {
    [PaymentStatus.CONFIRMED]: 'settled',
    [PaymentStatus.PENDING]: 'awaiting',
    [PaymentStatus.REJECTED]: 'owed',
};

function duesStandingFor(status: PaymentStatus | null): DuesStanding {
    return status === null ? 'owed' : STANDING_BY_STATUS[status];
}

/**
 * One Membership's mode and standing for `period`. The mode comes from the
 * resolver and is never inferred from what has been paid — a member who paid
 * last month and switched is on the mode their Membership resolves to, not on
 * the mode their last Payment implies.
 */
export function resolveMembershipStanding(
    input: MembershipStandingInput,
    period: BillingPeriod,
): MembershipStanding {
    const mode = resolvePaymentMode(
        input.membership,
        input.offered,
        period.month,
        period.year,
    );
    if (mode !== PaymentMode.MONTHLY) {
        return { mode, standing: 'none' };
    }
    return { mode, standing: duesStandingFor(input.periodStatus) };
}

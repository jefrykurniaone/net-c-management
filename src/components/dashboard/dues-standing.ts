import 'server-only';
import type { PaymentMode, PaymentStatus } from '@prisma/client';
import type { BillingPeriod } from '@/lib/payment-mode';
import { resolvePaymentMode } from '@/lib/payment-mode';
import { resolveDuesRate } from '@/lib/dues-rate';
import {
    findDuesChangeNotices,
    type DuesChangeNotice,
    type DuesNoticeMembership,
} from '@/lib/dues-notice';

/**
 * What this member owes right now, as the dashboard's Dues banner and Dues
 * stat read it — one resolution, consumed by both, so the sentence in the
 * banner and the figure in the strip can never disagree.
 *
 * **No money rule is restated here.** The Dues Rate for the Billing Period
 * comes from `resolveDuesRate` (ADR 0002) and the Payment Mode from
 * `resolvePaymentMode` (AD-7); this module only decides which Activities the
 * pair leaves owing.
 *
 * **Pure**: no database and no clock of its own — `now` and the Period are
 * parameters, and the rows arrive as plain objects.
 */

/** The Payment Mode that bills a Billing Period rather than a Seat. */
const MONTHLY = 'MONTHLY';

/**
 * A Payment the member has already acted on. `CONFIRMED` is settled and
 * `PENDING` is a Proof in review — neither is an unpaid Due still needing
 * their attention, so both drop out of the banner and the count (this is the
 * rule `/payments` applies too).
 */
const ACTED_ON: readonly PaymentStatus[] = ['CONFIRMED', 'PENDING'];

/** One Activity as this resolution reads it: enough to name it and bill it. */
export interface DuesStandingActivity {
    readonly id: string;
    readonly name: string;
}

/** The current Billing Period's Dues Payment rows, one per Activity at most. */
export interface DuesStandingPayment {
    readonly activityId: string;
    readonly status: PaymentStatus;
}

export interface DuesStandingInput {
    readonly memberships: readonly DuesNoticeMembership[];
    /** The member's Activities, in the order the page draws them. */
    readonly activities: readonly DuesStandingActivity[];
    readonly monthPayments: readonly DuesStandingPayment[];
    /** Reserved-but-unpaid Seats, which owe a Fee rather than Dues. */
    readonly outstandingCount: number;
    readonly period: BillingPeriod;
    readonly now: Date;
}

/** One Activity left owing this Billing Period, as the banner names it. */
export interface UnpaidDuesActivity {
    readonly name: string;
    readonly duesAmount: number;
}

export interface DuesStanding {
    /**
     * What each Activity bills this member by — Monthly, Per-Session, or not
     * yet chosen. Resolved once so the Activity card's header chip (#160) and
     * the Monthly filter below read the same answer.
     */
    readonly paymentModeByActivity: ReadonlyMap<string, PaymentMode | null>;
    /** The first Activity still owing, or `undefined` when nothing is owed. */
    readonly firstUnpaid: UnpaidDuesActivity | undefined;
    /** Unpaid Monthly Activities plus reserved-but-unpaid Seats. */
    readonly duesCount: number;
    /** Queued Dues changes this member is billed Monthly for (#113). */
    readonly notices: readonly DuesChangeNotice[];
}

/**
 * The Dues Rate covering `period` for each Activity, in Rupiah.
 *
 * No rate covering the Period is a broken invariant (`dues-rate.ts`) — read
 * like the "no fee set" branch, never as a free Period.
 */
function duesAmounts(
    memberships: readonly DuesNoticeMembership[],
    period: BillingPeriod,
): ReadonlyMap<string, number> {
    return new Map(
        memberships.map((m) => [
            m.activity.id,
            resolveDuesRate(m.activity.duesRates, period) ?? 0,
        ]),
    );
}

function paymentModes(
    memberships: readonly DuesNoticeMembership[],
    period: BillingPeriod,
): ReadonlyMap<string, PaymentMode | null> {
    return new Map(
        memberships.map((m) => [
            m.activity.id,
            resolvePaymentMode(m, m.activity, period.month, period.year),
        ]),
    );
}

export function resolveDuesStanding(input: DuesStandingInput): DuesStanding {
    const { memberships, activities, monthPayments, period, now } = input;
    const duesAmountByActivity = duesAmounts(memberships, period);
    const paymentModeByActivity = paymentModes(memberships, period);
    const statusByActivity = new Map(
        monthPayments.map((p) => [p.activityId, p.status]),
    );

    // Owes Monthly Dues this Period: mode-resolved Monthly, and a fee is set.
    // Per-Session and unselected Memberships are billed elsewhere, or not yet.
    const isMonthlyDue = (activity: DuesStandingActivity) =>
        paymentModeByActivity.get(activity.id) === MONTHLY &&
        (duesAmountByActivity.get(activity.id) ?? 0) > 0;
    const hasActed = (activity: DuesStandingActivity) => {
        const status = statusByActivity.get(activity.id);
        return status !== undefined && ACTED_ON.includes(status);
    };

    const unpaidMonthly = activities.filter(
        (activity) => isMonthlyDue(activity) && !hasActed(activity),
    );
    const first = unpaidMonthly[0];

    return {
        paymentModeByActivity,
        firstUnpaid: first
            ? {
                  name: first.name,
                  duesAmount: duesAmountByActivity.get(first.id) ?? 0,
              }
            : undefined,
        duesCount: unpaidMonthly.length + input.outstandingCount,
        // Nothing is stored and nothing clears a notice: the sentence stops the
        // Period it arrives, because the resolver stops calling an arrived
        // change a change (`src/lib/dues-notice.ts`).
        notices: findDuesChangeNotices(memberships, now),
    };
}

import 'server-only';
import { PaymentMode } from '@prisma/client';
import type { BillingPeriod } from '@/lib/billing-period';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';
import { resolvePaymentMode, type MembershipMode } from '@/lib/payment-mode';

/**
 * One Activity as the owed figure reads it: what it charges, which modes it
 * offers, and the Memberships that might owe under them.
 *
 * The four Membership fields are exactly `MembershipMode`, the shape
 * `resolvePaymentMode` resolves against a Period; `allowsMonthly` and
 * `allowsPerSession` are the `OfferedModes` pair it resolves *within*, because a
 * Membership that has chosen nothing resolves through what its Activity offers.
 * Both rules stay in that resolver — this module hands it rows and counts what
 * comes back, so no money rule is restated here.
 */
export interface DuesTotalActivity {
    readonly id: string;
    readonly allowsMonthly: boolean;
    readonly allowsPerSession: boolean;
    readonly duesRates: readonly DuesRateRow[];
    readonly memberships: readonly MembershipMode[];
}

/**
 * How many of an Activity's Memberships owe Dues in `period`.
 *
 * A headcount is not the answer, and the difference is money: `PER_SESSION`
 * funds its Seats through Fees and owes no Dues at all, and a `null` mode on an
 * Activity offering both is a member who has not chosen yet, which is not a
 * Monthly obligation either. Only what `resolvePaymentMode` calls `MONTHLY` is
 * billed, and it is asked about the exact Period being priced, so a switch
 * queued for next month never reprices this one.
 *
 * `monthlyMemberCount` in `src/lib/dues-collection.ts` answers the same question
 * for the Dues chart and carries one exclusion more: a Membership is never
 * priced before the Period it joined in. That one is absent here because it
 * could not fire — this tile prices the current Period, and no Membership joins
 * in a Period after it. A caller pricing a settled Period would need it; the
 * chart is that caller and has it.
 */
function countMonthlyMemberships(
    activity: DuesTotalActivity,
    period: BillingPeriod,
): number {
    let count = 0;
    for (const membership of activity.memberships) {
        const mode = resolvePaymentMode(
            membership,
            activity,
            period.month,
            period.year,
        );
        if (mode === PaymentMode.MONTHLY) {
            count += 1;
        }
    }
    return count;
}

/**
 * What this month's Dues come to across every Activity: the Memberships that
 * owe them times the Dues Rate of the Period this dashboard is about — the
 * current one.
 *
 * The figure moves on the first day of a new Period and not a day before,
 * because `period` moves and nothing is written: a rate queued for next month
 * is not this month's rate, so it cannot inflate the total early
 * (docs/adr/0002-dues-rate-history.md).
 *
 * An Activity that no rate row covers contributes nothing and says so in the
 * log. That is a broken invariant — the beginning-of-time row exists to make it
 * impossible — and a stat tile has nowhere to refuse: a total that is short
 * reads as short against `collected`, where one that invented a figure for the
 * missing rate would read as correct and be wrong.
 */
export function sumDuesForPeriod(
    activities: readonly DuesTotalActivity[],
    period: BillingPeriod,
): number {
    let total = 0;
    for (const activity of activities) {
        const rate = resolveDuesRate(activity.duesRates, period);
        if (rate === null) {
            console.error(
                `[admin dashboard] no Dues Rate covers ${period.year}-${period.month} for Activity ${activity.id}; left out of total due`,
            );
            continue;
        }
        total += countMonthlyMemberships(activity, period) * rate;
    }
    return total;
}

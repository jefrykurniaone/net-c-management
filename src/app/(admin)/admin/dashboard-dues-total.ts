import 'server-only';
import type { BillingPeriod } from '@/lib/billing-period';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';

/**
 * What this month's Dues come to across every Activity: headcount times the
 * Dues Rate of the Period this dashboard is about — the current one.
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
    activities: readonly { id: string }[],
    memberCounts: ReadonlyMap<string, number>,
    ratesByActivity: ReadonlyMap<string, readonly DuesRateRow[]>,
    period: BillingPeriod,
): number {
    let total = 0;
    for (const activity of activities) {
        const rate = resolveDuesRate(
            ratesByActivity.get(activity.id) ?? [],
            period,
        );
        if (rate === null) {
            console.error(
                `[admin dashboard] no Dues Rate covers ${period.year}-${period.month} for Activity ${activity.id}; left out of total due`,
            );
            continue;
        }
        total += (memberCounts.get(activity.id) ?? 0) * rate;
    }
    return total;
}

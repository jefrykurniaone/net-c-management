import 'server-only';
import { currentPeriod, toPeriodKey, type BillingPeriod } from './billing-period';
import {
    duesChartPeriods,
    resolveDuesCollectionSeries,
    type DuesChartActivity,
    type DuesCollectionSeries,
} from './dues-collection';
import { skippedDuesRateLog } from './dues-collection-view';
import { prisma } from './prisma';

/**
 * The admin dashboard's insight charts, read from the database (#170).
 *
 * Thin by design: each loader queries the window its chart is about and hands
 * plain rows to the pure resolver that does the arithmetic. Nothing here adds,
 * multiplies or excludes a Payment — every money rule lives in
 * `src/lib/dues-collection.ts`, where a unit test can reach it. #171's donut and
 * fill-rate line land beside these as their own `fetch…Rows` / `load…` pair.
 *
 * **This module writes nothing.** Charts read.
 */

/**
 * Active Activities with their Dues Rate history and their live Memberships,
 * plus every Payment carrying one of the six Periods' month/year.
 *
 * The Payment query narrows by the Period window and by nothing else. It could
 * have filtered `status` and `type` in SQL and returned less, and deliberately
 * does not: which Payments count is a money rule, and a money rule enforced
 * only in a `where` clause is a rule no test runs. The resolver applies it to
 * every row it is given, so the path the tests cover is the path production
 * takes.
 *
 * Rate rows are read as rows, never as a figure — `resolveDuesRate` says which
 * of them prices a Period (`docs/adr/0002-dues-rate-history.md`) — and no order
 * is assumed of them.
 */
async function fetchDuesChartRows(periods: readonly BillingPeriod[]) {
    const [activities, payments] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            select: {
                id: true,
                allowsMonthly: true,
                allowsPerSession: true,
                duesRates: { select: { amount: true, effectiveFrom: true } },
                memberships: {
                    where: { isActive: true },
                    select: {
                        paymentMode: true,
                        effectiveFrom: true,
                        pendingMode: true,
                        pendingEffectiveFrom: true,
                        joinedAt: true,
                    },
                },
            },
        }),
        prisma.payment.findMany({
            where: {
                OR: periods.map((period) => ({
                    month: period.month,
                    year: period.year,
                })),
            },
            select: {
                amount: true,
                month: true,
                year: true,
                status: true,
                type: true,
            },
        }),
    ]);

    return { activities, payments };
}

type DuesChartRows = Awaited<ReturnType<typeof fetchDuesChartRows>>;

/**
 * One Activity row as the resolver reads it. The only derivation is
 * `joinedPeriodKey`: `joinedAt` is an instant and the resolver compares
 * Periods, and `currentPeriod` is the one function that turns one into the
 * other.
 */
function toChartActivity(row: DuesChartRows['activities'][number]): DuesChartActivity {
    return {
        id: row.id,
        allowsMonthly: row.allowsMonthly,
        allowsPerSession: row.allowsPerSession,
        duesRates: row.duesRates,
        memberships: row.memberships.map((membership) => {
            const joined = currentPeriod(membership.joinedAt);
            return {
                paymentMode: membership.paymentMode,
                effectiveFrom: membership.effectiveFrom,
                pendingMode: membership.pendingMode,
                pendingEffectiveFrom: membership.pendingEffectiveFrom,
                joinedPeriodKey: toPeriodKey(joined.month, joined.year),
            };
        }),
    };
}

/**
 * Every Activity the series could not price, said out loud.
 *
 * The dashboard's stat tile already logs the same broken invariant for the
 * current Period (`dashboard-dues-total.ts`); the chart says it for each of the
 * six, so the two surfaces never disagree about which Activity is missing a
 * rate.
 */
function reportSkippedRates(series: DuesCollectionSeries): void {
    for (const skip of series.skipped) {
        console.error(skippedDuesRateLog(skip.activityId, skip.periodKey));
    }
}

/** Dues collected against Dues owed for the six Periods ending with `now`. */
export async function loadDuesCollectionSeries(
    now: Date,
): Promise<DuesCollectionSeries> {
    const rows = await fetchDuesChartRows(duesChartPeriods(now));
    const series = resolveDuesCollectionSeries({
        activities: rows.activities.map(toChartActivity),
        payments: rows.payments,
        now,
    });
    reportSkippedRates(series);
    return series;
}

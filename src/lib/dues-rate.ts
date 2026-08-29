import { toPeriodKey, type BillingPeriod } from './billing-period';

/**
 * What an Activity charges for Dues in one Billing Period — the **only** code
 * that compares a Period to a rate row (CONTEXT.md "Dues Rate"; ADR 0002).
 *
 * A Dues Rate is a history, not a live figure: one row per (Activity,
 * effective-from Period), and the rate of a Period is the row with the greatest
 * effective-from that is not after it. So a Period that has arrived keeps the
 * rate it had no matter what is set later, which is what "a Period that has
 * arrived is settled" means for money. Every Activity carries a
 * beginning-of-time row at `BEGINNING_OF_TIME`, written by the migration that
 * created the table, by the Activity create path and by both seeders, so every
 * Period — however far back — resolves to an amount.
 *
 * **Pure, and free of `server-only`, Prisma and React** — the shape
 * `session-lock.ts` uses and for the same reason: the Admin's Period picker and
 * the Proof upload form are client components that have to answer "what does
 * this month charge?" from the same rules the routes enforce, and a rule behind
 * a server boundary gets copied instead of read. That is also why `toPeriodKey`
 * and `BillingPeriod` are imported from `billing-period.ts` rather than from
 * `payment-mode.ts`, which re-exports them but imports `server-only`.
 *
 * **No clock.** The Period is always a parameter. Which Period a surface is
 * about — this month, the month a member picked, the month a Payment is for —
 * is the caller's question; this file only answers what that Period charges.
 */

/**
 * The two columns these rules read. Deliberately structural rather than the
 * generated `DuesRate` type: callers pass whatever projection they selected
 * (with `id`, `setBy`, `setAt`), the generic hands the whole row back, and
 * nothing here needs the Prisma client in the bundle.
 */
export type DuesRateRow = Readonly<{
    amount: number;
    /** The YYYYMM key this rate applies from; `BEGINNING_OF_TIME` = forever. */
    effectiveFrom: number;
}>;

/**
 * The row in force for `period`: the greatest `effectiveFrom` that is not after
 * it. `null` only when the Activity has no row at or before the Period, which
 * the beginning-of-time row exists to make impossible.
 *
 * Input order is never assumed — a Prisma `findMany` without an `orderBy`
 * returns rows in whatever order the database liked, and a rule that quietly
 * depended on sorting would misprice a Period the day that order changed.
 */
export function findEffectiveDuesRate<T extends DuesRateRow>(
    rates: readonly T[],
    period: BillingPeriod,
): T | null {
    const periodKey = toPeriodKey(period.month, period.year);
    let effective: T | null = null;
    for (const rate of rates) {
        if (rate.effectiveFrom > periodKey) {
            continue;
        }
        if (effective === null || rate.effectiveFrom > effective.effectiveFrom) {
            effective = rate;
        }
    }
    return effective;
}

/**
 * The amount `period` charges for Dues.
 *
 * `null` means this Activity has no rate covering the Period — a broken
 * invariant, never a free Period. Callers must say what to do about it rather
 * than fall back to a silent `0`: charging nothing because a row is missing is
 * the failure mode a stored money table exists to prevent.
 */
export function resolveDuesRate(
    rates: readonly DuesRateRow[],
    period: BillingPeriod,
): number | null {
    return findEffectiveDuesRate(rates, period)?.amount ?? null;
}

/**
 * The queued row: the change that has not landed yet, as of `period`.
 *
 * That is the earliest row whose effective-from is after the Period — the next
 * one to take effect, which is what a disclosure beneath the Dues field names.
 * At most one such row exists per Activity (the queuing rule), so "earliest"
 * only decides a case the write path does not create. `null` when nothing is
 * queued, which is also what an arrived change looks like: once its Period
 * arrives it is the rate, and no longer a change.
 */
export function findQueuedDuesRate<T extends DuesRateRow>(
    rates: readonly T[],
    period: BillingPeriod,
): T | null {
    const periodKey = toPeriodKey(period.month, period.year);
    let queued: T | null = null;
    for (const rate of rates) {
        if (rate.effectiveFrom <= periodKey) {
            continue;
        }
        if (queued === null || rate.effectiveFrom < queued.effectiveFrom) {
            queued = rate;
        }
    }
    return queued;
}

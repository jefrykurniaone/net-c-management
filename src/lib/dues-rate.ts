import {
    currentPeriod,
    nextPeriod,
    toPeriodKey,
    type BillingPeriod,
} from './billing-period';

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

/**
 * The queuing rules (ADR 0002), stated once for the route that enforces them and
 * the Period picker that offers only what they allow.
 *
 * They live beside the resolver rather than in a module of their own for the
 * reason the file header gives: this is the only code that compares a Period to
 * a rate row, and a second file doing it is a second answer waiting to disagree.
 * Like the resolver they read no clock — `now` is a parameter, so a test can put
 * the caller in December and a route can pass the instant it started at.
 */

/**
 * How far ahead a rate change may be set: twelve Periods, which is a year.
 *
 * ADR 0002: as far ahead as a committee decides, and near enough that the Period
 * picker stays finite and a queued row stays meaningful.
 */
export const DUES_RATE_HORIZON_PERIODS = 12;

/**
 * The Period `offset` Periods after the one containing `now` — offset 0 being
 * the next Period, the earliest a rate may start from.
 *
 * The month arithmetic is `Date`'s own: a month index past December rolls the
 * year, which is the same roll `nextPeriod` performs by hand for its single
 * step. Doing it this way adds no second copy of the calendar rule.
 */
function periodAhead(now: Date, offset: number): BillingPeriod {
    const first = nextPeriod(now);
    return currentPeriod(new Date(first.year, first.month - 1 + offset, 1));
}

/**
 * Every Period an Admin may start a new rate from, earliest first: the next
 * Period through twelve Periods ahead. This is what the picker offers, and the
 * route refuses anything outside it — the control and the rule read one list.
 */
export function allowedDuesRatePeriods(now: Date): BillingPeriod[] {
    const periods: BillingPeriod[] = [];
    for (let offset = 0; offset < DUES_RATE_HORIZON_PERIODS; offset += 1) {
        periods.push(periodAhead(now, offset));
    }
    return periods;
}

/**
 * Whether `effectiveFrom` is one of the Periods a change may start from.
 *
 * **Membership in that list, never a numeric interval between its ends.** A
 * YYYYMM key is not dense: between December 2026 (`202612`) and January 2027
 * (`202701`) lie eighty-eight integers that encode no calendar month at all.
 * A range check of `earliest <= key <= latest` accepts every one of them, and
 * `202613` would then be stored, named as "undefined 2026" by any sentence that
 * decodes it, offered by no picker — and, once the clock passes it, would
 * *arrive*, become the rate from January 2027 onward, and be frozen there
 * forever by the very rule that protects a settled Period. The picker and the
 * route read one list precisely so that cannot happen.
 */
export function isDuesRateEffectiveFromAllowed(
    effectiveFrom: number,
    now: Date,
): boolean {
    return allowedDuesRatePeriods(now).some(
        (period) => toPeriodKey(period.month, period.year) === effectiveFrom,
    );
}

/**
 * Whether a rate row's Period has arrived — the current Period or any before it.
 *
 * An arrived Period is settled: its row is never updated and never deleted, by
 * anyone, Owner included. `BEGINNING_OF_TIME` is 0 and so always arrived, which
 * is what makes an Activity's founding rate permanent rather than a special
 * case somebody has to remember.
 */
export function hasDuesRatePeriodArrived(
    effectiveFrom: number,
    now: Date,
): boolean {
    const period = currentPeriod(now);
    return effectiveFrom <= toPeriodKey(period.month, period.year);
}

/**
 * Whether saving `amount` from `effectiveFrom` would leave the Activity charging
 * exactly what it charges now — in which case the write is a no-op rather than
 * an error, and no row is touched.
 *
 * Two ways that happens. With nothing queued, an amount equal to what `period`
 * already charges is the Admin saving the form without meaning to change the
 * Dues — every save of the Activity's name or bank account carries the Dues
 * field along with it, and that must not queue a change. With a change queued,
 * a request identical to it is the same save arriving twice; rewriting the row
 * would move `setAt` and `setById` and falsify "who raised the Dues in March".
 */
export function isDuesRateSaveUnchanged(
    rates: readonly DuesRateRow[],
    amount: number,
    effectiveFrom: number,
    period: BillingPeriod,
): boolean {
    const queued = findQueuedDuesRate(rates, period);
    if (queued === null) {
        return resolveDuesRate(rates, period) === amount;
    }
    return queued.effectiveFrom === effectiveFrom && queued.amount === amount;
}

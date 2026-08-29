/**
 * The Billing Period as a comparable key, and the two Periods every surface
 * asks for — this one and the next.
 *
 * These four things were declared in `payment-mode.ts` and are re-exported from
 * it unchanged, so every existing import still resolves. They live here now
 * because that module imports `server-only`: a Period key is a domain primitive
 * that the Admin's Period picker and the Proof upload form need on the client
 * too, and a second copy of `year * 100 + month` — the encoding a stored column
 * holds — is the one duplication this codebase cannot afford. Nothing in this
 * file imports Prisma, `server-only` or React, for the reason `session-lock.ts`
 * gives: rules the route and the form both read cannot sit behind a server
 * boundary.
 */

/** Radix for encoding a billing period as YYYYMM (year * 100 + month). */
const PERIOD_YEAR_RADIX = 100;

/** Calendar months in a year — for rolling a December switch into January. */
const MONTHS_PER_YEAR = 12;

/** First calendar month (January), 1-indexed per AD-13. */
const FIRST_MONTH = 1;

/**
 * The key of the Period before every real one — "since forever".
 *
 * `Membership.effectiveFrom` already defaults to it for a standing that has
 * always applied, and `DuesRate` uses the same zero for an Activity's
 * beginning-of-time rate, so a Period however far back still resolves to an
 * amount. It is deliberately *not* a valid YYYYMM: no calendar month encodes
 * to 0, so it can never collide with a Period somebody chose.
 */
export const BEGINNING_OF_TIME = 0;

/** A billing period as the calendar pair used everywhere (AD-13). */
export interface BillingPeriod {
  month: number;
  year: number;
}

/**
 * Encode a billing period (calendar month 1–12 + year, AD-13) as a comparable
 * YYYYMM integer — e.g. July 2026 → 202607. Ordering by this key orders periods.
 */
export function toPeriodKey(month: number, year: number): number {
  return year * PERIOD_YEAR_RADIX + month;
}

/**
 * The billing period containing `now` — calendar month 1–12 + full year. `now`
 * is injected (never read from an ambient clock here) so this stays a pure
 * function, matching `resolvePaymentMode`.
 */
export function currentPeriod(now: Date): BillingPeriod {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

/**
 * The billing period immediately after the one containing `now`. December rolls
 * into January of the next year. Used to queue a mode switch for the next
 * period so the current period is never rewritten (AD-7).
 */
export function nextPeriod(now: Date): BillingPeriod {
  const { month, year } = currentPeriod(now);
  if (month === MONTHS_PER_YEAR) return { month: FIRST_MONTH, year: year + 1 };
  return { month: month + 1, year };
}

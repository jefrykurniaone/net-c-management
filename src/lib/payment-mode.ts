import 'server-only';
import { PaymentMode } from '@prisma/client';

/**
 * Server-only payment-mode resolution (AD-7, AD-13).
 *
 * The effective mode is a pure function of the billing period — it is never
 * inferred from past payments. All resolution goes through `resolvePaymentMode`
 * so a mid-period switch can never rewrite what the current period owes.
 */

/** Radix for encoding a billing period as YYYYMM (year * 100 + month). */
const PERIOD_YEAR_RADIX = 100;

/**
 * Encode a billing period (calendar month 1–12 + year, AD-13) as a comparable
 * YYYYMM integer — e.g. July 2026 → 202607. Ordering by this key orders periods.
 */
export function toPeriodKey(month: number, year: number): number {
  return year * PERIOD_YEAR_RADIX + month;
}

/** Calendar months in a year — for rolling a December switch into January. */
const MONTHS_PER_YEAR = 12;
/** First calendar month (January), 1-indexed per AD-13. */
const FIRST_MONTH = 1;

/** A billing period as the calendar pair used everywhere (AD-13). */
export interface BillingPeriod {
  month: number;
  year: number;
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

/** The minimal Membership fields the resolver reads. */
export interface MembershipMode {
  paymentMode: PaymentMode | null;
  effectiveFrom: number;
  pendingMode: PaymentMode | null;
  pendingEffectiveFrom: number | null;
}

/** The Activity's offered payment modes — the set a member resolves within. */
export interface OfferedModes {
  allowsMonthly: boolean;
  allowsPerSession: boolean;
}

/**
 * The sole mode an Activity offers, or `null` when it offers both (or none).
 * A single offered mode is auto-applied so a member never has to choose when
 * there is nothing to choose; both-offered stays unselected until chosen — no
 * silent default (FR-9, FR-10).
 */
export function singleOfferedMode(offered: OfferedModes): PaymentMode | null {
  if (offered.allowsMonthly && !offered.allowsPerSession) return PaymentMode.MONTHLY;
  if (offered.allowsPerSession && !offered.allowsMonthly) return PaymentMode.PER_SESSION;
  return null;
}

/**
 * Resolve the effective payment mode for an exact billing period.
 *
 * A queued switch (`pendingMode` / `pendingEffectiveFrom`) applies only from
 * its own period forward, so any period at or before the current one keeps the
 * standing mode — the current period is immutable. When no explicit selection
 * covers the period, the Activity's offered set decides (single mode
 * auto-applies; both-offered resolves to `null`, the "unselected" state the
 * caller must prompt on).
 */
export function resolvePaymentMode(
  membership: MembershipMode,
  offered: OfferedModes,
  month: number,
  year: number,
): PaymentMode | null {
  const period = toPeriodKey(month, year);

  // A queued switch wins once its period has arrived; it never applies to a
  // period before pendingEffectiveFrom (current-period immutability).
  if (
    membership.pendingMode !== null &&
    membership.pendingEffectiveFrom !== null &&
    period >= membership.pendingEffectiveFrom
  ) {
    return membership.pendingMode;
  }

  // The standing selection applies from its own effectiveFrom forward.
  if (membership.paymentMode !== null && period >= membership.effectiveFrom) {
    return membership.paymentMode;
  }

  // No explicit selection covers this period → the offered set decides.
  return singleOfferedMode(offered);
}

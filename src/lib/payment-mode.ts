import 'server-only';
import { PaymentMode } from '@prisma/client';
import { toPeriodKey, type BillingPeriod } from './billing-period';

/**
 * Server-only payment-mode resolution (AD-7, AD-13).
 *
 * The effective mode is a pure function of the billing period — it is never
 * inferred from past payments. All resolution goes through `resolvePaymentMode`
 * so a mid-period switch can never rewrite what the current period owes.
 */

/**
 * The Billing Period key, the beginning-of-time key and the two Periods every
 * surface asks for now live in `billing-period.ts`, free of `server-only` so
 * that the Admin's Period picker and the Proof upload form can read them too.
 * They are re-exported here unchanged: every existing `from './payment-mode'`
 * import keeps resolving, and `year * 100 + month` — the encoding a stored
 * column holds — is still written in exactly one place.
 */
export {
  BEGINNING_OF_TIME,
  currentPeriod,
  nextPeriod,
  toPeriodKey,
  type BillingPeriod,
} from './billing-period';

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

/**
 * The standing mode/effectiveFrom for `period`, with any already-elapsed
 * pending switch folded in. `resolvePaymentMode` treats a pending switch as
 * effective once its period arrives without ever persisting that graduation
 * back to `paymentMode`/`effectiveFrom` — a write path that compares against
 * the raw fields instead of this would rewrite an already-effective period
 * the next time it runs (AD-7). Any code that writes a new switch must fold
 * an elapsed pending switch in first via this helper.
 */
export function graduateStanding(
  membership: MembershipMode,
  period: BillingPeriod,
): { paymentMode: PaymentMode | null; effectiveFrom: number } {
  const periodKey = toPeriodKey(period.month, period.year);
  if (
    membership.pendingMode !== null &&
    membership.pendingEffectiveFrom !== null &&
    periodKey >= membership.pendingEffectiveFrom
  ) {
    return {
      paymentMode: membership.pendingMode,
      effectiveFrom: membership.pendingEffectiveFrom,
    };
  }
  return {
    paymentMode: membership.paymentMode,
    effectiveFrom: membership.effectiveFrom,
  };
}

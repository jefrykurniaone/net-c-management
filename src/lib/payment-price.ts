import { resolveDuesRate, type DuesRateRow } from './dues-rate';

/**
 * What a Payment was supposed to be — the figure the Admin's Confirm dialog
 * compares the amount actually sent against, and warns beneath when it falls
 * short (never blocks).
 *
 * **The Payment's own Billing Period, never today's.** A monthly Payment is
 * judged by the Dues Rate of the month it pays for, so a January Proof is
 * judged by January's Dues and a rate set for a later Period does not flag it
 * (CONTEXT.md "Dues Rate"; docs/adr/0002-dues-rate-history.md). A per-Session
 * Payment is judged by that Session's own Fee, which the Session has always
 * carried frozen — nothing here changes for it.
 *
 * Pure, and free of `server-only`, Prisma and React, in the shape
 * `dues-rate.ts` and `session-lock.ts` established: the queue's cells are drawn
 * on the client and the rule they draw belongs with the rules, not with a
 * component.
 */

/**
 * The parts of a Payment the price depends on. Structural rather than the
 * generated row type, so the queue passes whatever projection it selected and
 * nothing here pulls the Prisma client into the bundle.
 */
export type PricedPayment = Readonly<{
    type: 'MONTHLY' | 'SESSION';
    month: number;
    year: number;
    activity: Readonly<{ duesRates: readonly DuesRateRow[] }>;
    session: Readonly<{ fee: number }> | null;
}>;

/**
 * The amount this Payment's own Period charged for what it bills.
 *
 * `null` is "there is no figure to compare against", and the caller draws no
 * note at all rather than a note against a guess. Two ways to get there, both
 * of them a broken invariant rather than a free Payment: the Session a
 * per-Session Payment names is gone, or no Dues Rate row covers a monthly
 * Payment's Period — which the beginning-of-time row exists to make impossible.
 * Neither is read as 0, which would warn "below Dues" on every row.
 */
export function expectedPriceOf(payment: PricedPayment): number | null {
    if (payment.type === 'SESSION') {
        return payment.session?.fee ?? null;
    }
    return resolveDuesRate(payment.activity.duesRates, {
        month: payment.month,
        year: payment.year,
    });
}

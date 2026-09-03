import { PaymentMode, PaymentStatus, PaymentType } from '@prisma/client';
import { currentPeriod, toPeriodKey, type BillingPeriod } from './billing-period';
import { resolveDuesRate, type DuesRateRow } from './dues-rate';
import { resolvePaymentMode } from './payment-mode';

/**
 * Dues collected against Dues owed, one pair per Billing Period — the whole
 * arithmetic behind the admin dashboard's grouped bars (#170, spec
 * `docs/spec-rally-insights-v1.md`).
 *
 * **Owed resolves through the rate history, never a live field**
 * (`docs/adr/0002-dues-rate-history.md`): the amount a Period charges is
 * whichever `DuesRate` row was in force when that Period arrived, so a rate set
 * later never reprices an earlier bar. `resolveDuesRate` is the only code that
 * compares a Period to a rate row and this module consumes it rather than
 * repeating it; `resolvePaymentMode` is the only code that says which Payment
 * Mode a Membership is on in a Period, and this module consumes that too. No
 * money rule is restated here.
 *
 * **Pure**: no clock, no database, no logging. `now` is a parameter and the
 * records arrive as plain objects, so every figure below is a unit test away
 * (`src/lib/__tests__/dues-collection.test.ts`) rather than a browser away. The
 * one thing it cannot do purely — telling somebody an Activity has no covering
 * rate — it hands back as {@link DuesCollectionSeries.skipped} for the loader to
 * log, which is also what makes the skip assertable in a test.
 *
 * It is *not* free of `server-only`: `resolvePaymentMode` lives behind that
 * marker, and consuming the one payment-mode rule matters more than being
 * importable from the browser. Nothing needs it there — the chart component is
 * handed a finished series.
 */

/**
 * How many Billing Periods the chart covers, ending with the current one. Six,
 * per the spec: enough to read a direction, short enough that six grouped pairs
 * stay legible at 390px.
 */
export const DUES_CHART_PERIODS = 6;

/**
 * The Membership fields the owed figure reads. The first four are exactly
 * `MembershipMode`, which `resolvePaymentMode` resolves against a Period;
 * `joinedPeriodKey` is this module's own and is explained on
 * {@link monthlyMemberCount}.
 */
export interface DuesChartMembership {
    readonly paymentMode: PaymentMode | null;
    readonly effectiveFrom: number;
    readonly pendingMode: PaymentMode | null;
    readonly pendingEffectiveFrom: number | null;
    /** The YYYYMM Period the Membership began in — never priced before it. */
    readonly joinedPeriodKey: number;
}

/**
 * One Activity, its Dues Rate history and its Memberships. The offered-mode
 * pair is here because `resolvePaymentMode` needs it: a Membership that has
 * chosen nothing resolves through what its Activity offers.
 */
export interface DuesChartActivity {
    readonly id: string;
    readonly allowsMonthly: boolean;
    readonly allowsPerSession: boolean;
    readonly duesRates: readonly DuesRateRow[];
    readonly memberships: readonly DuesChartMembership[];
}

/**
 * One Payment row as this chart reads it. `status` and `type` are carried
 * rather than pre-filtered away by the query so that the rule excluding
 * Pending, Rejected and Fees runs *here*, in the code the tests cover, instead
 * of only in a `where` clause no unit test can reach.
 */
export interface DuesChartPayment {
    readonly amount: number;
    /** Calendar month 1-12 of the Billing Period the Payment is for. */
    readonly month: number;
    readonly year: number;
    readonly status: PaymentStatus;
    readonly type: PaymentType;
}

export interface DuesCollectionInput {
    readonly activities: readonly DuesChartActivity[];
    readonly payments: readonly DuesChartPayment[];
    readonly now: Date;
}

/** One Period's pair of bars, in Rupiah. */
export interface DuesPeriodPoint {
    readonly period: BillingPeriod;
    readonly periodKey: number;
    readonly owed: number;
    readonly collected: number;
}

/** An Activity that no Dues Rate row covers in a Period — a broken invariant. */
export interface SkippedDuesRate {
    readonly activityId: string;
    readonly periodKey: number;
}

export interface DuesCollectionSeries {
    /** Exactly {@link DUES_CHART_PERIODS} points, oldest first. */
    readonly points: readonly DuesPeriodPoint[];
    /**
     * Every (Activity, Period) that resolved to no rate. Each one is left out
     * of owed rather than counted as zero, and saying so is the caller's job:
     * an Activity charging nothing because a row is missing is precisely the
     * failure a stored rate table exists to prevent, so it must never pass in
     * silence. Empty is the healthy case.
     */
    readonly skipped: readonly SkippedDuesRate[];
}

/**
 * The Periods the chart covers, oldest first, ending with the one containing
 * `now`.
 *
 * The month arithmetic is `Date`'s own — a negative month index rolls the year
 * back, the mirror of the roll `periodAhead` in `dues-rate.ts` relies on — so
 * no second copy of the calendar rule is written here.
 */
export function duesChartPeriods(now: Date): BillingPeriod[] {
    const { month, year } = currentPeriod(now);
    const periods: BillingPeriod[] = [];
    for (let back = DUES_CHART_PERIODS - 1; back >= 0; back -= 1) {
        periods.push(currentPeriod(new Date(year, month - 1 - back, 1)));
    }
    return periods;
}

/**
 * How many of an Activity's Memberships owe Dues in `period`.
 *
 * Two conditions, and both are exclusions rather than assumptions. The
 * Membership must have existed: a member who joined in July owes nothing for
 * March, and pricing today's roster across all six Periods would make a growing
 * community's past collection look like a collapse. And it must resolve to
 * `MONTHLY` in that Period — `PER_SESSION` funds its Seats through Fees, and a
 * `null` mode is a member who has not chosen yet on an Activity offering both,
 * which is not a Monthly obligation either.
 *
 * Two things it cannot model, both because the Membership row records a
 * standing rather than a history, and both stated plainly here rather than
 * papered over:
 *
 * **Departure.** No column records when a Membership was deactivated, so a
 * member who has since left is absent from every Period, including the ones
 * they did owe for.
 *
 * **A mode switch that has landed.** A Membership carries one standing mode
 * with one `effectiveFrom` and one queued switch; when the switch arrives, the
 * standing moves onto it and what came before is gone. So after a member
 * switches to Per-Session from August, `resolvePaymentMode` finds no selection
 * covering March and falls back to the Activity's offered set — which answers
 * `null` where both modes are offered, and the member drops out of March's
 * owed although they owed it and paid it. Those Periods can therefore read
 * collected above owed. The honest fix is a Membership mode history in the
 * shape ADR 0002 gave the Dues Rate — one row per (Membership, effective-from
 * Period) — which is a schema change and a decision of its own, not something
 * a chart may invent. That decision — the shape, the backfill rule, and what
 * it asserts about Memberships whose earlier modes are already lost — is
 * recorded in `docs/adr/0004-membership-payment-mode-history.md`, proposed
 * rather than accepted. Until then this module reports what the rows can
 * answer; `dues-collection.test.ts` pins the behaviour so it stays a known
 * limit rather than becoming a surprise.
 */
function monthlyMemberCount(
    activity: DuesChartActivity,
    period: BillingPeriod,
): number {
    const periodKey = toPeriodKey(period.month, period.year);
    let count = 0;
    for (const membership of activity.memberships) {
        if (membership.joinedPeriodKey > periodKey) {
            continue;
        }
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
 * What the community was owed in `period`: headcount times the rate that Period
 * charges, across every Activity.
 *
 * An Activity whose rows do not cover the Period is recorded in `skipped` and
 * left out. It is never given an amount of its own and never counted as free
 * — `resolveDuesRate` returns `null` rather than `0` for exactly this reason.
 */
function owedForPeriod(
    activities: readonly DuesChartActivity[],
    period: BillingPeriod,
    skipped: SkippedDuesRate[],
): number {
    const periodKey = toPeriodKey(period.month, period.year);
    let total = 0;
    for (const activity of activities) {
        const rate = resolveDuesRate(activity.duesRates, period);
        if (rate === null) {
            skipped.push({ activityId: activity.id, periodKey });
            continue;
        }
        total += monthlyMemberCount(activity, period) * rate;
    }
    return total;
}

/**
 * What was actually collected for `period`: Confirmed Dues Payments carrying
 * that Period's own month and year.
 *
 * Three exclusions, each a separate line so none can be lost in a rewrite.
 * `PENDING` is a Proof nobody has looked at and `REJECTED` is one an Admin
 * refused — neither is money, and a hold is not money either. `SESSION` is a
 * Fee: it funds one Seat in one Session and is no part of what Dues owed asks
 * about, so counting it would show collection running ahead of the obligation
 * it is drawn against.
 */
function collectedForPeriod(
    payments: readonly DuesChartPayment[],
    period: BillingPeriod,
): number {
    let total = 0;
    for (const payment of payments) {
        if (payment.status !== PaymentStatus.CONFIRMED) {
            continue;
        }
        if (payment.type !== PaymentType.MONTHLY) {
            continue;
        }
        if (payment.month !== period.month || payment.year !== period.year) {
            continue;
        }
        total += payment.amount;
    }
    return total;
}

/**
 * The whole series: six Periods, each with what was owed and what came in.
 *
 * A Period with nothing in it is a zero pair rather than a missing point, so a
 * gap in collection is visible as a gap instead of vanishing from the axis.
 */
export function resolveDuesCollectionSeries(
    input: DuesCollectionInput,
): DuesCollectionSeries {
    const skipped: SkippedDuesRate[] = [];
    const points: DuesPeriodPoint[] = [];
    for (const period of duesChartPeriods(input.now)) {
        points.push({
            period,
            periodKey: toPeriodKey(period.month, period.year),
            owed: owedForPeriod(input.activities, period, skipped),
            collected: collectedForPeriod(input.payments, period),
        });
    }
    return { points, skipped };
}

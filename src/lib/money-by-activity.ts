import { PaymentStatus, PaymentType } from '@prisma/client';
import { currentPeriod, type BillingPeriod } from './billing-period';

/**
 * This Billing Period's money, grouped by Activity — the arithmetic behind the
 * admin dashboard's donut (#171, spec `docs/spec-rally-insights-v1.md`).
 *
 * **What this counts is a third quantity, and deliberately not either of the
 * other two on the same dashboard.** The Dues chart beside it (#170) counts
 * Dues alone, against what Dues was owed. This one counts **Dues and Fees
 * together** — every Confirmed Payment that belongs to this Period, whatever it
 * bills for — because the question it answers is "which Activity carries the
 * community", not "is Dues collection keeping up". The two therefore disagree
 * by design, and the caption says so; the figures never contradict, they answer
 * different questions.
 *
 * **Two arms, and they cannot overlap.** A Payment row is either `MONTHLY` (a
 * Dues row) or `SESSION` (a Fee row) — `PaymentType` has exactly those two
 * values — and each arm is entered only on its own type, so every row is
 * visited once and contributes at most once. The arms differ in *how* they are
 * placed in a Period, which is the whole reason they are separate:
 *
 * - **A Dues row belongs to the Period it names.** Its own `month`/`year`
 *   columns *are* the obligation it settles, so nothing else may decide.
 * - **A Fee belongs to the Period its Session falls in.** A Fee funds one Seat
 *   in one Session, so the Session's date is what places it. Its `month`/`year`
 *   columns are derived from that same Session date when the row is written
 *   (AD-4, `src/lib/payments.ts`), so reading the Session is not a second rule
 *   — it is the authoritative one, read at the source instead of through a
 *   copy that a later edit could leave behind.
 *
 * **Pure**: no clock, no database, no logging. `now` is a parameter and the
 * records arrive as plain objects, so every exclusion below is one unit test
 * away (`src/lib/__tests__/money-by-activity.test.ts`) rather than one browser
 * away. The one thing it cannot do purely — saying a Fee carries no Session —
 * it hands back as {@link MoneyByActivitySeries.unplacedFees} for the loader to
 * log, in the shape #170 gave a skipped Dues Rate.
 */

/** The Activities the ring lists even when they took nothing. */
export interface MoneyChartActivity {
    readonly id: string;
    readonly name: string;
}

/**
 * One Payment row as this chart reads it. `status` and `type` are carried
 * rather than filtered away by the query so that the rules excluding Pending,
 * Rejected and an out-of-Period row run *here*, in the code the tests cover,
 * instead of only in a `where` clause no unit test can reach.
 */
export interface MoneyChartPayment {
    /** Named in the log line when a Fee cannot be placed — never displayed. */
    readonly id: string;
    readonly activityId: string;
    /**
     * The Activity's name off the Payment's own relation. Carried on the row so
     * money is never dropped for want of a label: an Activity deactivated since
     * the Payment landed is not in {@link MoneyByActivityInput.activities}, and
     * dropping its slice would make the centre total stop equalling the sum.
     */
    readonly activityName: string;
    readonly amount: number;
    /** Calendar month 1-12 of the Billing Period a Dues row settles. */
    readonly month: number;
    readonly year: number;
    readonly status: PaymentStatus;
    readonly type: PaymentType;
    /**
     * The Session's stored `date` for a Fee — UTC midnight of its WIB calendar
     * day. Null on a Dues row, which has no Session, and null on a Fee whose
     * `sessionId` is unset: see {@link classifyPayment} for what happens then.
     */
    readonly sessionDate: Date | null;
}

export interface MoneyByActivityInput {
    readonly activities: readonly MoneyChartActivity[];
    readonly payments: readonly MoneyChartPayment[];
    readonly now: Date;
}

/** One Activity's share of the Period, in Rupiah. Zero is a real answer. */
export interface ActivityMoneySlice {
    readonly activityId: string;
    readonly activityName: string;
    readonly amount: number;
}

/** A Fee that names no Session, so no Period can be decided for it. */
export interface UnplacedFee {
    readonly paymentId: string;
    readonly activityId: string;
}

export interface MoneyByActivitySeries {
    /** The Period counted — the one containing `now`. */
    readonly period: BillingPeriod;
    /**
     * Every Activity, largest first, **including the ones at zero**. The series
     * carries them because the text list names them; the view drops them from
     * the drawn ring, so the two can never disagree about which Activity exists.
     */
    readonly slices: readonly ActivityMoneySlice[];
    /** The centre figure. Equal to the sum of {@link slices} by construction. */
    readonly total: number;
    /**
     * Every `SESSION` Payment carrying no Session date. Each is left out of the
     * total rather than counted, and saying so is the caller's job: the schema
     * restricts a Session from being deleted out from under a Payment
     * (`Payment.session`, `onDelete: Restrict`), so a Fee with no Session is a
     * broken invariant an engineer fixes, not a state to draw. Empty is the
     * healthy case.
     */
    readonly unplacedFees: readonly UnplacedFee[];
}

/** Whether two Periods are the same calendar month of the same year. */
function isSamePeriod(a: BillingPeriod, b: BillingPeriod): boolean {
    return a.month === b.month && a.year === b.year;
}

/**
 * The Billing Period a stored Session date falls in.
 *
 * Read with the `getUTC*` accessors, never `getMonth()`, because the column
 * holds UTC midnight of the Session's WIB calendar day: on a server west of
 * UTC the local reading of `2026-09-01T00:00:00Z` is 31 August, which would
 * post a September Session's Fee into August.
 */
function periodOfSessionDate(date: Date): BillingPeriod {
    return { month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
}

/** What a row is: counted, left out, or a Fee that cannot be placed at all. */
type PaymentVerdict = 'counted' | 'excluded' | 'unplaced';

/**
 * Whether one Payment belongs in this Period's ring.
 *
 * `CONFIRMED` first, and alone on its own line so it cannot be lost in a
 * rewrite: `PENDING` is a Proof nobody has looked at and `REJECTED` is one an
 * Admin refused. Neither is money, and a hold is not money — the spec's rule
 * for every collected figure in the app.
 *
 * Then the type decides which Period rule applies. A Fee with no Session date
 * is answered `'unplaced'` rather than falling back to its own `month`/`year`:
 * the fallback would be a second, different placement rule applied silently to
 * exactly the rows whose data is broken, and it would make the acceptance rule
 * — a Fee counts by its Session's date — untrue in the one case nobody looks
 * at. A row of a `PaymentType` this chart has no rule for is excluded rather
 * than assumed into an arm.
 */
function classifyPayment(
    payment: MoneyChartPayment,
    period: BillingPeriod,
): PaymentVerdict {
    if (payment.status !== PaymentStatus.CONFIRMED) {
        return 'excluded';
    }
    if (payment.type === PaymentType.MONTHLY) {
        const named = { month: payment.month, year: payment.year };
        return isSamePeriod(named, period) ? 'counted' : 'excluded';
    }
    if (payment.type === PaymentType.SESSION) {
        if (payment.sessionDate === null) {
            return 'unplaced';
        }
        const dated = periodOfSessionDate(payment.sessionDate);
        return isSamePeriod(dated, period) ? 'counted' : 'excluded';
    }
    return 'excluded';
}

/** Add one counted Payment to its Activity, opening a slice if it has none. */
function addToActivity(
    totals: Map<string, ActivityMoneySlice>,
    payment: MoneyChartPayment,
): void {
    const existing = totals.get(payment.activityId);
    totals.set(payment.activityId, {
        activityId: payment.activityId,
        activityName: existing?.activityName ?? payment.activityName,
        amount: (existing?.amount ?? 0) + payment.amount,
    });
}

/**
 * Largest slice first, then by name.
 *
 * Compared by code unit rather than through `localeCompare`, which reads the
 * server's default locale — an ambient input this module is otherwise free of,
 * and one that would order two equal Activities differently in two
 * environments. The Activity id breaks a remaining tie so the order is total,
 * which is what lets the ring's colours and the text list stay in step.
 */
function compareSlices(a: ActivityMoneySlice, b: ActivityMoneySlice): number {
    if (a.amount !== b.amount) {
        return b.amount - a.amount;
    }
    if (a.activityName !== b.activityName) {
        return a.activityName < b.activityName ? -1 : 1;
    }
    return a.activityId < b.activityId ? -1 : 1;
}

/**
 * The whole series: this Period's Confirmed money, per Activity, with the total.
 *
 * An Activity that took nothing is seeded at zero and stays in `slices`, so the
 * text list can name it. The total is summed from the finished slices rather
 * than accumulated alongside them, which is what makes "the centre equals the
 * list" true by construction instead of by agreement between two counters.
 */
export function resolveMoneyByActivitySeries(
    input: MoneyByActivityInput,
): MoneyByActivitySeries {
    const period = currentPeriod(input.now);
    const totals = new Map<string, ActivityMoneySlice>();
    for (const activity of input.activities) {
        totals.set(activity.id, {
            activityId: activity.id,
            activityName: activity.name,
            amount: 0,
        });
    }

    const unplacedFees: UnplacedFee[] = [];
    for (const payment of input.payments) {
        const verdict = classifyPayment(payment, period);
        if (verdict === 'unplaced') {
            unplacedFees.push({
                paymentId: payment.id,
                activityId: payment.activityId,
            });
        }
        if (verdict === 'counted') {
            addToActivity(totals, payment);
        }
    }

    const slices = [...totals.values()].sort(compareSlices);
    return {
        period,
        slices,
        total: slices.reduce((sum, slice) => sum + slice.amount, 0),
        unplacedFees,
    };
}

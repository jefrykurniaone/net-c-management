import 'server-only';
import type { PaymentStatus } from '@prisma/client';
import {
    resolvePaymentMode,
    type BillingPeriod,
    type MembershipMode,
    type OfferedModes,
} from '@/lib/payment-mode';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';
import type { MonthlyDuesRow } from '@/components/payments/monthly-dues-cards';

/**
 * The current Billing Period's Dues standing, one row per Activity the member
 * is billed Monthly for — already resolved, so the card only ever draws one of
 * three states and never picks one.
 *
 * **Bill only for the mode the member actually chose.** A `MONTHLY` Membership
 * owes this Period's Dues; a `PER_SESSION` Membership owes a Fee per reserved
 * Seat (the outstanding bills, resolved elsewhere); an unselected (`null`) mode
 * owes nothing yet. Every Monthly Membership with a fee set is surfaced for the
 * Period — the dashboard's unpaid banner applies the same rule, so the two
 * views stay consistent. They used to diverge when a registered Seat carried no
 * live hold (BUG-04).
 *
 * **No money rule is restated here**: the amount comes from `resolveDuesRate`
 * (ADR 0002) and the mode from `resolvePaymentMode` (AD-7).
 *
 * **Pure**: no database and no clock — the Period and the rows are parameters.
 */

/** The Payment Mode that bills a Billing Period rather than a Seat. */
const MONTHLY = 'MONTHLY';

/** The Membership fields a Dues row reads. */
export type MonthlyDuesMembership = MembershipMode &
    Readonly<{
        activity: OfferedModes &
            Readonly<{
                id: string;
                name: string;
                duesRates: readonly DuesRateRow[];
            }>;
    }>;

/** One live payment hold, as the batch selects it. */
export interface LiveHold {
    readonly holdExpiresAt: Date | null;
    readonly session: { readonly activityId: string };
}

export interface MonthlyDuesInput {
    readonly memberships: readonly MonthlyDuesMembership[];
    /** This Period's Dues Payment rows, at most one per Activity. */
    readonly monthPayments: readonly {
        readonly activityId: string;
        readonly status: PaymentStatus;
    }[];
    readonly liveHolds: readonly LiveHold[];
    readonly period: BillingPeriod;
}

/** One Activity still owing this Period, as the unpaid banner names it. */
export interface UnpaidDuesActivity {
    readonly name: string;
    readonly duesAmount: number;
}

/** The same Activity, keyed, as the Dues rows are built from. */
interface MonthlyDuesActivity extends UnpaidDuesActivity {
    readonly id: string;
}

export interface MonthlyDues {
    readonly rows: readonly MonthlyDuesRow[];
    readonly unpaidCount: number;
    readonly firstUnpaid: UnpaidDuesActivity | undefined;
}

/** Which of the three standings a monthly Activity's Dues card draws. */
export function duesStatus(
    isPaid: boolean,
    isInReview: boolean,
): MonthlyDuesRow['status'] {
    if (isPaid) return 'paid';
    if (isInReview) return 'inReview';
    return 'unpaid';
}

/**
 * The earliest live hold per Activity — a Monthly member's reserved Seat lapses
 * at this instant unless the Dues are paid, so the Dues card shows it.
 */
function earliestHoldByActivity(
    liveHolds: readonly LiveHold[],
): ReadonlyMap<string, Date> {
    const byActivity = new Map<string, Date>();
    for (const hold of liveHolds) {
        if (hold.holdExpiresAt === null) continue;
        const { activityId } = hold.session;
        const current = byActivity.get(activityId);
        if (!current || hold.holdExpiresAt < current) {
            byActivity.set(activityId, hold.holdExpiresAt);
        }
    }
    return byActivity;
}

/**
 * The Activities billed Monthly this Period with a fee set, by name.
 *
 * No rate covering the Period is a broken invariant (`dues-rate.ts`) — read
 * like the "no fee set" branch, never as a free Period.
 */
function monthlyDuesActivities(
    memberships: readonly MonthlyDuesMembership[],
    period: BillingPeriod,
): MonthlyDuesActivity[] {
    const amountByActivity = new Map(
        memberships.map((m) => [
            m.activity.id,
            resolveDuesRate(m.activity.duesRates, period) ?? 0,
        ]),
    );
    return memberships
        .filter(
            (m) =>
                resolvePaymentMode(
                    m,
                    m.activity,
                    period.month,
                    period.year,
                ) === MONTHLY &&
                (amountByActivity.get(m.activity.id) ?? 0) > 0,
        )
        .map((m) => ({
            id: m.activity.id,
            name: m.activity.name,
            duesAmount: amountByActivity.get(m.activity.id) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveMonthlyDues(input: MonthlyDuesInput): MonthlyDues {
    const { memberships, monthPayments, liveHolds, period } = input;
    const holdByActivity = earliestHoldByActivity(liveHolds);
    const statusByActivity = new Map(
        monthPayments.map((p) => [p.activityId, p.status]),
    );
    const activities = monthlyDuesActivities(memberships, period);

    const isPaid = (activityId: string) =>
        statusByActivity.get(activityId) === 'CONFIRMED';
    // A submitted-but-unconfirmed Proof is "in review": the member has acted, so
    // it neither nags in the banner nor shows as plain "Unpaid" on the card.
    const isInReview = (activityId: string) =>
        statusByActivity.get(activityId) === 'PENDING';

    const unpaid = activities.filter(
        (a) => !isPaid(a.id) && !isInReview(a.id),
    );
    const rows: MonthlyDuesRow[] = activities.map((activity) => {
        const status = duesStatus(isPaid(activity.id), isInReview(activity.id));
        return {
            id: activity.id,
            name: activity.name,
            duesAmount: activity.duesAmount,
            status,
            hold: status === 'unpaid' ? holdByActivity.get(activity.id) : undefined,
        };
    });

    return { rows, unpaidCount: unpaid.length, firstUnpaid: unpaid[0] };
}

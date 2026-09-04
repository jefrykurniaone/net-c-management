import { currentPeriod, fromPeriodKey, type BillingPeriod } from './billing-period';
import {
    findQueuedDuesRate,
    type DuesRateChangeOutcome,
    type DuesRateRow,
} from './dues-rate';
import {
    resolvePaymentMode,
    type MembershipMode,
    type OfferedModes,
} from './payment-mode';

/**
 * Who a queued Dues change concerns, and what their dashboard says about it.
 *
 * A queued change is money somebody will be asked for, so the audience is a
 * *resolution*, never a stored flag: every member whose Payment Mode resolves to
 * Monthly **for the Period the change starts from**, which is not the same set as
 * "Monthly today". A member who has already queued a switch to Monthly effective
 * that month will be billed the new figure and must be told; a member switching
 * away to per-Session by then will not be, and must not. `resolvePaymentMode` is
 * the one function that answers this, so it is the one asked here — the dashboard
 * sentence and the email pick their audience through the same call.
 *
 * Nothing about a notice is stored, and nothing clears it. The sentence exists
 * while `findQueuedDuesRate` still reports a queued row and stops the instant its
 * Period arrives, because an arrived change is the rate and no longer a change.
 * That is why the first day of the new month needs no write, no cron and no
 * cleanup: the notice was never a row.
 *
 * A pure rule module (`docs/adr/0005-pure-rule-modules.md`), so the rule that
 * decides who hears about a price is unit-tested rather than inferred from a page.
 */

/** The Payment Mode that is billed monthly, and so the only one a Dues change concerns. */
const MONTHLY = 'MONTHLY';

/** The Activity fields a notice reads: its name, its rates and what it offers. */
export type DuesNoticeActivity = OfferedModes &
    Readonly<{
        id: string;
        name: string;
        duesRates: readonly DuesRateRow[];
    }>;

/** One membership, as the dashboard already selects it. */
export type DuesNoticeMembership = MembershipMode &
    Readonly<{ activity: DuesNoticeActivity }>;

/** One sentence's worth of fact: which Activity, the new figure, the month. */
export type DuesChangeNotice = Readonly<{
    activityId: string;
    activityName: string;
    amount: number;
    /** The Billing Period the new figure starts from. */
    period: BillingPeriod;
}>;

/**
 * Whether this membership is billed Monthly for the Period a change starts from.
 *
 * The Period is decoded from the stored key rather than taken as a pair, because
 * every caller holds the key: the rate row carries it, and the withdraw route
 * receives it in the query string. A `null` resolution — both modes offered and
 * nothing chosen — is deliberately not in the audience: that member has not been
 * put on Dues yet, and telling them a Dues figure is changing would be the first
 * they heard of owing Dues at all.
 */
export function isDuesNoticeAudience(
    membership: MembershipMode,
    offered: OfferedModes,
    effectiveFrom: number,
): boolean {
    const { month, year } = fromPeriodKey(effectiveFrom);
    return resolvePaymentMode(membership, offered, month, year) === MONTHLY;
}

/**
 * The sentences one member's dashboard carries — at most one per Activity they
 * are on, ordered by Activity name so the banner reads the same on every render.
 */
export function findDuesChangeNotices(
    memberships: readonly DuesNoticeMembership[],
    now: Date,
): DuesChangeNotice[] {
    const period = currentPeriod(now);
    const notices: DuesChangeNotice[] = [];
    for (const membership of memberships) {
        const { activity } = membership;
        const queued = findQueuedDuesRate(activity.duesRates, period);
        if (queued === null) {
            continue;
        }
        if (!isDuesNoticeAudience(membership, activity, queued.effectiveFrom)) {
            continue;
        }
        notices.push({
            activityId: activity.id,
            activityName: activity.name,
            amount: queued.amount,
            period: fromPeriodKey(queued.effectiveFrom),
        });
    }
    return notices.sort((a, b) => a.activityName.localeCompare(b.activityName));
}

/**
 * What an Admin's write did, reduced to the one email it owes.
 *
 * A `'withdrawn'` event names only the Period that was cancelled: the figure the
 * member is told stays is what the *current* Period charges, which is read from
 * the Activity's rows at send time rather than carried here. The withdrawn row's
 * own amount is precisely the figure that will now never apply, so naming it
 * would tell the member the opposite of what happened.
 */
export type DuesChangeEvent =
    | Readonly<{ kind: 'queued' | 'replaced'; amount: number; effectiveFrom: number }>
    | Readonly<{ kind: 'withdrawn'; effectiveFrom: number }>;

/**
 * The event a Dues Rate write owes an email for, or `null` for a write that
 * changed nothing.
 *
 * Classified from the outcome the write itself reported (#127), never from a
 * second read of the rate rows: a replace is one event and sends the replaced
 * template alone — never a withdraw followed by a queue — and only the write
 * that performed it can tell a replace from a fresh queue.
 */
export function duesChangeEventOf(
    change: DuesRateChangeOutcome,
): DuesChangeEvent | null {
    if (change.kind === 'withdrawn') {
        return change.previousQueued === null
            ? null
            : { kind: 'withdrawn', effectiveFrom: change.previousQueued.effectiveFrom };
    }
    if (change.kind === 'none' || change.queued === null) {
        return null;
    }
    return {
        kind: change.kind,
        amount: change.queued.amount,
        effectiveFrom: change.queued.effectiveFrom,
    };
}

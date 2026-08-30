import 'server-only';
import { after } from 'next/server';
import { ADMITTED_MEMBER_WHERE } from '@/lib/admission';
import { currentPeriod, fromPeriodKey } from '@/lib/billing-period';
import { isDuesNoticeAudience, type DuesChangeEvent } from '@/lib/dues-notice';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';
import {
    isEmailConfigured,
    sendDuesChangeQueued,
    sendDuesChangeReplaced,
    sendDuesChangeWithdrawn,
    type DuesChangeParams,
} from '@/lib/email';
import { DEFAULT_LOCALE } from '@/lib/i18n/dictionaries';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

/**
 * Telling members about a Dues change an Admin just made — the audience query and
 * the send, both of which happen **after the response**.
 *
 * Nothing here runs before the Admin gets their answer. `queueDuesChangeEmail`
 * does two things synchronously — check that the write owed an email at all, and
 * check that email is configured — and hands everything else to `after()`. The
 * membership query is inside that callback too, deliberately: a hundred-member
 * Activity must not make saving a rate slower, and an audience read is exactly
 * the kind of work `after` exists for. Best-effort, like every other send in this
 * app: guarded by `isEmailConfigured()`, wrapped so one member's bounce does not
 * cost the rest theirs, failures logged and never thrown back at the route.
 *
 * **Every path leaves a line** (#135). Best-effort used to mean *silent* on all
 * but a thrown error — Activity gone, nobody billed Monthly, no rate row covering
 * the Period all logged nothing, so a real miss and a correct no-op read
 * identically. Now a Dues write says what it decided, and `queued after the
 * response` then `resolving audience` tells a dropped `after()` callback apart
 * from one that ran and found nobody. Operator-facing: plain ASCII English, never
 * the dictionary, no address the failure line does not already name.
 */

/**
 * The Activity, its rate history, and the members a change could concern.
 *
 * The membership filter is the *cheap* half of the audience — active membership
 * of an admitted, unrevoked member who has an address to send to. The half that
 * cannot be expressed as a `where` is the Payment Mode, resolved per Period in
 * code (`isDuesNoticeAudience`), so this query over-selects and the resolver
 * narrows.
 */
const AUDIENCE_SELECT = {
    name: true,
    allowsMonthly: true,
    allowsPerSession: true,
    duesRates: { select: { amount: true, effectiveFrom: true } },
    memberships: {
        where: {
            isActive: true,
            user: {
                ...ADMITTED_MEMBER_WHERE,
                isActive: true,
                email: { not: null },
            },
        },
        select: {
            paymentMode: true,
            effectiveFrom: true,
            pendingMode: true,
            pendingEffectiveFrom: true,
            user: { select: { name: true, email: true } },
        },
    },
} as const;

function loadAudienceActivity(activityId: string) {
    return prisma.activity.findUnique({
        where: { id: activityId },
        select: AUDIENCE_SELECT,
    });
}

export type AudienceActivity = NonNullable<
    Awaited<ReturnType<typeof loadAudienceActivity>>
>;

/** One member to write to. */
export type Recipient = Readonly<{ to: string; name: string }>;

/**
 * The members billed Monthly for the Period the change starts from. A member with
 * no name is addressed by their own address, the way every other template's caller
 * falls back.
 */
function recipientsOf(
    activity: AudienceActivity,
    effectiveFrom: number,
): Recipient[] {
    const recipients: Recipient[] = [];
    for (const membership of activity.memberships) {
        const { email, name } = membership.user;
        if (email === null) {
            continue;
        }
        if (!isDuesNoticeAudience(membership, activity, effectiveFrom)) {
            continue;
        }
        recipients.push({ to: email, name: name ?? email });
    }
    return recipients;
}

/**
 * The figure the email names. A withdrawal names what the current Period charges
 * — the figure that stays — read from the rows at send time; a queue or a replace
 * names the figure the write itself reported. `null` is the broken invariant
 * `dues-rate.ts` describes (no row covers the Period) and sends nothing, not `0`.
 */
function amountFor(
    event: DuesChangeEvent,
    rates: readonly DuesRateRow[],
    now: Date,
): number | null {
    if (event.kind === 'withdrawn') {
        return resolveDuesRate(rates, currentPeriod(now));
    }
    return event.amount;
}

/**
 * What one delivery decided, before anything is sent.
 *
 * The three ways it ends with no email are outcomes here rather than bare
 * `return`s inside the callback: "nothing was sent" is a fact an operator must be
 * able to read, and a reason invented at the `return` site cannot be tested.
 * `considered` is the *over-selected* membership count — what the `where` loaded
 * before the Payment Mode narrowed it — so `0 of 5` (nobody billed Monthly that
 * Period) is distinguishable from `0 of 0` (nothing loaded).
 */
export type DuesChangeDelivery =
    | Readonly<{
          kind: 'send';
          activityName: string;
          recipients: readonly Recipient[];
          amount: number;
          considered: number;
      }>
    | Readonly<{ kind: 'no-activity' }>
    | Readonly<{ kind: 'no-audience'; considered: number }>
    | Readonly<{ kind: 'no-amount'; considered: number }>;

/**
 * Who this change is sent to and for how much, or why it is sent to nobody.
 *
 * Pure — no Prisma, no clock, no `console` — so the rule that decides silence is
 * unit-tested rather than inferred from a log. The amount is settled before the
 * audience so a broken rate invariant is reported as itself rather than hidden
 * behind an empty audience when both hold; neither ends in a send, so the order
 * changes what is *said*, not what is sent.
 */
export function planDuesChange(
    activity: AudienceActivity | null,
    event: DuesChangeEvent,
    now: Date,
): DuesChangeDelivery {
    if (activity === null) {
        return { kind: 'no-activity' };
    }
    const considered = activity.memberships.length;
    const amount = amountFor(event, activity.duesRates, now);
    if (amount === null) {
        return { kind: 'no-amount', considered };
    }
    const recipients = recipientsOf(activity, event.effectiveFrom);
    if (recipients.length === 0) {
        return { kind: 'no-audience', considered };
    }
    return {
        kind: 'send',
        activityName: activity.name,
        recipients,
        amount,
        considered,
    };
}

/** The operator's half-sentence for an outcome — the log line's second half. */
export function describeDelivery(plan: DuesChangeDelivery): string {
    switch (plan.kind) {
        case 'send':
            return `sending to ${plan.recipients.length} of ${plan.considered} loaded memberships`;
        case 'no-activity':
            return 'nothing sent, Activity not found';
        case 'no-audience':
            return `nothing sent, 0 of ${plan.considered} loaded memberships are billed Monthly for the period`;
        case 'no-amount':
            return `nothing sent, no Dues Rate row covers the period (${plan.considered} loaded memberships)`;
    }
}

/** The stem every line of one delivery shares, so a log reader can grep one
 * write out of a busy server log by its Activity and Period. */
function deliveryTag(activityId: string, event: DuesChangeEvent): string {
    return `[dues-rate] ${event.kind} change for activity ${activityId} effective ${event.effectiveFrom}`;
}

const SENDERS: Record<
    DuesChangeEvent['kind'],
    (p: DuesChangeParams) => Promise<void>
> = {
    queued: sendDuesChangeQueued,
    replaced: sendDuesChangeReplaced,
    withdrawn: sendDuesChangeWithdrawn,
};

/**
 * One email per member per event. The template is chosen by the event alone, so a
 * replace sends the replaced message and nothing else. Every member gets the same
 * locale — `DEFAULT_LOCALE`. There is no per-user locale column, and the Admin's
 * request cookie is the Admin's language, not the member's; the day-reminder cron
 * makes the same choice for the same reason.
 */
async function sendToAll(
    plan: Extract<DuesChangeDelivery, { kind: 'send' }>,
    event: DuesChangeEvent,
): Promise<void> {
    const settings = await getSettings();
    const { month, year } = fromPeriodKey(event.effectiveFrom);
    const send = SENDERS[event.kind];
    for (const recipient of plan.recipients) {
        try {
            await send({
                ...recipient,
                activityName: plan.activityName,
                amount: plan.amount,
                month,
                year,
                communityName: settings.communityName,
                locale: DEFAULT_LOCALE,
            });
        } catch (err) {
            console.error(
                `[dues-rate] change email to ${recipient.to} failed:`,
                err,
            );
        }
    }
}

/** The whole post-response job: say it started, decide, then either send or say
 * why not. The opening line is written before the audience query, so a callback
 * that ran and then died in Prisma stays distinguishable from one that never ran. */
async function deliverDuesChange(
    activityId: string,
    event: DuesChangeEvent,
): Promise<void> {
    const tag = deliveryTag(activityId, event);
    console.info(`${tag}: resolving audience`);
    const activity = await loadAudienceActivity(activityId);
    const plan = planDuesChange(activity, event, new Date());
    if (plan.kind !== 'send') {
        console.warn(`${tag}: ${describeDelivery(plan)}`);
        return;
    }
    console.info(`${tag}: ${describeDelivery(plan)}`);
    await sendToAll(plan, event);
}

/**
 * Queue the member notification for a Dues change, after the response.
 *
 * A `null` event — a save that changed nothing queued — sends nothing, which is
 * what "hears nothing if it does not concern them" means for an Admin who
 * retyped the same figure. Both synchronous refusals say so, and the scheduling
 * is logged once `after()` has accepted the callback — the line #135 lacked.
 */
export function queueDuesChangeEmail(
    activityId: string,
    event: DuesChangeEvent | null,
): void {
    if (event === null) {
        console.info(`[dues-rate] activity ${activityId}: no Dues change to announce`);
        return;
    }
    const tag = deliveryTag(activityId, event);
    if (!isEmailConfigured()) {
        console.info(`${tag}: nothing sent, email is not configured`);
        return;
    }
    after(async () => {
        try {
            await deliverDuesChange(activityId, event);
        } catch (err) {
            console.error(
                `[dues-rate] change emails for activity ${activityId} failed:`,
                err,
            );
        }
    });
    console.info(`${tag}: queued after the response`);
}

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
 * the kind of work `after` exists for.
 *
 * Best-effort, like every other send in this app: guarded by
 * `isEmailConfigured()`, wrapped so one member's bounce does not cost the rest
 * theirs, failures logged and never thrown back at the route.
 */

/**
 * The Activity, its rate history, and the members a change could concern.
 *
 * The membership filter is the *cheap* half of the audience — active membership
 * of an admitted, unrevoked member who has an address to send to. The half that
 * cannot be expressed as a `where` is the Payment Mode, which is resolved per
 * Period in code (`isDuesNoticeAudience`), so this query deliberately
 * over-selects and the resolver narrows.
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

type AudienceActivity = NonNullable<
    Awaited<ReturnType<typeof loadAudienceActivity>>
>;

/** One member to write to. */
type Recipient = Readonly<{ to: string; name: string }>;

/**
 * The members billed Monthly for the Period the change starts from. A member
 * with no name is addressed by their own address, the way every other template's
 * caller falls back.
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
 * The figure the email names. A withdrawal names what the current Period
 * charges — the figure that stays — read from the rows at send time; a queue or
 * a replace names the figure the write itself reported. `null` is the broken
 * invariant `dues-rate.ts` describes (no row covers the Period) and sends
 * nothing rather than a `0`.
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

const SENDERS: Record<
    DuesChangeEvent['kind'],
    (p: DuesChangeParams) => Promise<void>
> = {
    queued: sendDuesChangeQueued,
    replaced: sendDuesChangeReplaced,
    withdrawn: sendDuesChangeWithdrawn,
};

/**
 * One email per member per event. The template is chosen by the event alone, so
 * a replace sends the replaced message and nothing else.
 *
 * Every member gets the same locale — `DEFAULT_LOCALE`. There is no per-user
 * locale column, and the Admin's request cookie is the Admin's language, not the
 * member's; the day-reminder cron makes the same choice for the same reason.
 */
async function deliverDuesChange(
    activityId: string,
    event: DuesChangeEvent,
): Promise<void> {
    const activity = await loadAudienceActivity(activityId);
    if (activity === null) {
        return;
    }
    const recipients = recipientsOf(activity, event.effectiveFrom);
    const amount = amountFor(event, activity.duesRates, new Date());
    if (recipients.length === 0 || amount === null) {
        return;
    }
    const settings = await getSettings();
    const { month, year } = fromPeriodKey(event.effectiveFrom);
    const send = SENDERS[event.kind];
    for (const recipient of recipients) {
        try {
            await send({
                ...recipient,
                activityName: activity.name,
                amount,
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

/**
 * Queue the member notification for a Dues change, after the response.
 *
 * A `null` event — a save that changed nothing queued — sends nothing, which is
 * what "hears nothing if it does not concern them" means for an Admin who
 * retyped the same figure.
 */
export function queueDuesChangeEmail(
    activityId: string,
    event: DuesChangeEvent | null,
): void {
    if (event === null || !isEmailConfigured()) {
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
}

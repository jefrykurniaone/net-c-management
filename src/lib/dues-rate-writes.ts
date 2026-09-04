import 'server-only';
import type { Activity, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { currentPeriod, toPeriodKey } from '@/lib/billing-period';
import {
    findQueuedDuesRate,
    hasDuesRatePeriodArrived,
    isDuesRateEffectiveFromAllowed,
    isDuesRateSaveUnchanged,
    resolveDuesRate,
    type DuesRateChangeOutcome,
} from '@/lib/dues-rate';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The two Admin writes that change what an Activity charges for Dues, each
 * inside one short transaction holding the **Activity's own row lock**.
 *
 * The lock is `docs/adr/0008-row-locks-on-capacity-and-money-writes.md`, and it
 * is what makes "at most one queued change per Activity" true rather than merely
 * intended: two Admins saving a new rate at the same instant would otherwise
 * both read "nothing queued", both insert, and leave two future rows that no
 * disclosure can name and no Withdraw can reach.
 *
 * The Activity's own fields are written under the same lock and in the same
 * transaction as its rate row: an Admin's save is one act, so a refused rate
 * must not leave a renamed Activity behind, and a slug collision must not leave
 * a queued rate change behind either.
 *
 * **What never happens here.** No row whose Period has arrived is updated or
 * deleted, by any role.
 */

/** The rate columns these rules read. Who set a row and when is not among them. */
const DUES_RATE_SELECT = { amount: true, effectiveFrom: true } as const;

/**
 * Why a Dues Rate write was refused. Stable codes travelling beside the
 * translated sentence, the way `session-lock.ts`'s reasons do.
 */
export type DuesRateRefusalReason =
    | 'DUES_RATE_PERIOD_ARRIVED'
    | 'DUES_RATE_PERIOD_OUT_OF_RANGE'
    | 'DUES_RATE_NOTHING_QUEUED';

/**
 * An arrived Period is settled, so touching one is a conflict with a state the
 * request cannot change (409). A Period beyond the twelve-ahead horizon is a
 * malformed request the Admin can correct by picking another month (400).
 */
const REFUSAL_STATUS: Record<DuesRateRefusalReason, number> = {
    DUES_RATE_PERIOD_ARRIVED: 409,
    DUES_RATE_PERIOD_OUT_OF_RANGE: 400,
    DUES_RATE_NOTHING_QUEUED: 409,
};

export function duesRateRefusalStatus(reason: DuesRateRefusalReason): number {
    return REFUSAL_STATUS[reason];
}

/** The sentence the Admin reads beneath the field, in their own locale. */
export function duesRateRefusalMessage(
    reason: DuesRateRefusalReason,
    t: Dictionary,
): string {
    if (reason === 'DUES_RATE_PERIOD_ARRIVED') {
        return t.admin.duesRateArrivedRefusal;
    }
    if (reason === 'DUES_RATE_PERIOD_OUT_OF_RANGE') {
        return t.admin.duesRateOutOfRangeRefusal;
    }
    return t.admin.duesRateNothingQueuedRefusal;
}

/** The new rate an Activity update carries, or `null` when it carries none. */
export type DuesRatePatch = Readonly<{
    amount: number;
    effectiveFrom: number;
}>;

export type ActivityUpdateOutcome =
    | Readonly<{
          kind: 'updated';
          activity: Activity;
          duesRateChange: DuesRateChangeOutcome;
      }>
    | Readonly<{ kind: 'refused'; reason: DuesRateRefusalReason }>;

export type DuesRateWithdrawOutcome =
    | Readonly<{ kind: 'withdrawn' }>
    | Readonly<{ kind: 'missing' }>
    | Readonly<{ kind: 'refused'; reason: DuesRateRefusalReason }>;

/**
 * Whether a requested effective-from may be written at all.
 *
 * The arrived test runs **first** and deliberately: the current Period and every
 * one before it are also outside the allowed window, and answering "pick a month
 * in range" to an Admin trying to reprice last January teaches the wrong rule.
 * What they need told is that the month is settled.
 */
function refuseEffectiveFrom(
    effectiveFrom: number,
    now: Date,
): DuesRateRefusalReason | null {
    if (hasDuesRatePeriodArrived(effectiveFrom, now)) {
        return 'DUES_RATE_PERIOD_ARRIVED';
    }
    if (!isDuesRateEffectiveFromAllowed(effectiveFrom, now)) {
        return 'DUES_RATE_PERIOD_OUT_OF_RANGE';
    }
    return null;
}

/**
 * Serialize on the Activity itself. `FOR UPDATE` on a row that is not there
 * locks nothing and returns nothing, so a missing Activity is decided by the
 * read that follows, never by this.
 */
async function lockActivity(
    tx: Prisma.TransactionClient,
    activityId: string,
): Promise<void> {
    await tx.$queryRaw`
        SELECT "id" FROM "Activity" WHERE "id" = ${activityId} FOR UPDATE
    `;
}

/**
 * Replace whatever is queued with this one row, under a lock already held.
 *
 * The `deleteMany` clears every not-yet-arrived row **except** the one being
 * written, which is what leaves exactly one queued row however many a previous
 * defect or a hand-written row left behind. It runs **before** the unchanged
 * test and unconditionally: on a healthy Activity there is nothing but the
 * queued row to match, so it deletes nothing, and skipping it on the no-op path
 * would be exactly the case where a stray second queued row — invisible to the
 * disclosure, unreachable by Withdraw — survives. Its `gt` bound is the current
 * Period key, so no arrived row is ever in range: the freeze is a property of
 * the filter here, not only of the check above it.
 *
 * A request whose amount equals what the current Period charges
 * (`resolveDuesRate`) means "charge what we charge now" — no queued row may
 * survive it, so the row at `effectiveFrom` that the `deleteMany` above spared
 * (it is "the row being written", not a stray) is deleted too, and nothing is
 * written. That row is never an arrived one: the `gt` bound above still
 * protects those. Anything else that changes nothing then just stops, leaving
 * `setAt` and `setById` as they were — rewriting them would falsify "who raised
 * the Dues in March".
 *
 * Otherwise the row is an upsert on `(activityId, effectiveFrom)`: replacing a
 * queued change at the same month is one write on a known key rather than a
 * delete and an insert with a window in between (ADR 0002).
 */
async function writeQueuedDuesRate(
    tx: Prisma.TransactionClient,
    input: DuesRatePatch & { activityId: string; setById: string; now: Date },
): Promise<DuesRateChangeOutcome> {
    const { activityId, amount, effectiveFrom, setById, now } = input;
    const period = currentPeriod(now);
    const rates = await tx.duesRate.findMany({
        where: { activityId },
        select: DUES_RATE_SELECT,
    });
    const previousQueued = findQueuedDuesRate(rates, period);
    await tx.duesRate.deleteMany({
        where: {
            activityId,
            effectiveFrom: {
                gt: toPeriodKey(period.month, period.year),
                not: effectiveFrom,
            },
        },
    });
    if (resolveDuesRate(rates, period) === amount) {
        await tx.duesRate.deleteMany({ where: { activityId, effectiveFrom } });
        return {
            kind: previousQueued === null ? 'none' : 'withdrawn',
            previousQueued,
            queued: null,
        };
    }
    if (isDuesRateSaveUnchanged(rates, amount, effectiveFrom, period)) {
        return { kind: 'none', previousQueued, queued: previousQueued };
    }
    await tx.duesRate.upsert({
        where: { activityId_effectiveFrom: { activityId, effectiveFrom } },
        create: { activityId, amount, effectiveFrom, setById },
        update: { amount, setById, setAt: new Date() },
    });
    return {
        kind: previousQueued === null ? 'queued' : 'replaced',
        previousQueued,
        queued: { amount, effectiveFrom },
    };
}

/**
 * The Activity update, and the Dues Rate it may carry, as one write.
 *
 * `data` is whatever the update schema let through; it no longer carries the
 * retired live column, because the Dues figure is now a rate row. A `duesRate` of
 * `null` is a save that says nothing about Dues — the standing-toggle on the
 * register, for one — and leaves every rate row untouched.
 *
 * The clock is read **after the row lock is held**, not when the request
 * arrived, and the refusal is decided there. A save can wait on another Admin's
 * lock for as long as that Admin's transaction takes, and a request that began
 * at 23:59 on the last day of a month must not be judged by the month it
 * started in: the Period it is really writing against is the one current when
 * the write actually happens. That is also why the refusal sits before
 * `tx.activity.update` — a refused rate leaves no renamed Activity behind.
 *
 * Prisma's own errors travel out of the transaction unhandled and roll it back:
 * `P2025` for an Activity that is not there, `P2002` for a slug already taken.
 * The route already turns both into an answer, and rolling back is what keeps a
 * refused Activity update from queuing a rate change anyway.
 */
export async function updateActivityWithDuesRate(input: {
    activityId: string;
    data: Prisma.ActivityUpdateInput;
    duesRate: DuesRatePatch | null;
    setById: string;
}): Promise<ActivityUpdateOutcome> {
    const { activityId, data, duesRate, setById } = input;

    return prisma.$transaction(async (tx) => {
        await lockActivity(tx, activityId);
        const now = new Date();
        if (duesRate !== null) {
            const refusal = refuseEffectiveFrom(duesRate.effectiveFrom, now);
            if (refusal !== null) {
                return { kind: 'refused', reason: refusal };
            }
        }
        const activity = await tx.activity.update({
            where: { id: activityId },
            data,
        });
        const duesRateChange: DuesRateChangeOutcome =
            duesRate === null
                ? { kind: 'none', previousQueued: null, queued: null }
                : await writeQueuedDuesRate(tx, {
                      ...duesRate,
                      activityId,
                      setById,
                      now,
                  });
        return { kind: 'updated', activity, duesRateChange };
    });
}

/**
 * Withdraw the queued change — delete the row the Admin was shown, and only
 * that row.
 *
 * The caller names the Period it means rather than saying "whichever is
 * queued", for two reasons. A queued row whose Period arrived between the page
 * rendering and the tile being pressed is now the rate, and the Admin is told it
 * is settled instead of having a different row deleted underneath them. And it
 * makes the freeze answerable through this route for **any** Period, including
 * the beginning-of-time row, rather than only for whatever happened to be
 * queued.
 *
 * The clock is read under the lock, for the reason the update path gives, and
 * the delete carries the `gt` bound as well as the check above it: an arrived
 * row is out of the filter's range, so the freeze does not rest on one `if`.
 */
export async function withdrawQueuedDuesRate(input: {
    activityId: string;
    effectiveFrom: number;
}): Promise<DuesRateWithdrawOutcome> {
    const { activityId, effectiveFrom } = input;

    return prisma.$transaction(async (tx) => {
        await lockActivity(tx, activityId);
        const now = new Date();
        if (hasDuesRatePeriodArrived(effectiveFrom, now)) {
            return { kind: 'refused', reason: 'DUES_RATE_PERIOD_ARRIVED' };
        }
        const activity = await tx.activity.findUnique({
            where: { id: activityId },
            select: { id: true },
        });
        if (activity === null) {
            return { kind: 'missing' };
        }
        const period = currentPeriod(now);
        const { count } = await tx.duesRate.deleteMany({
            where: {
                activityId,
                effectiveFrom: {
                    equals: effectiveFrom,
                    gt: toPeriodKey(period.month, period.year),
                },
            },
        });
        if (count === 0) {
            return { kind: 'refused', reason: 'DUES_RATE_NOTHING_QUEUED' };
        }
        return { kind: 'withdrawn' };
    });
}

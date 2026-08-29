import type { SessionQuota } from './recurring-sessions';

/**
 * The cost-sharing floor as a register row states it: how many members have
 * committed against how many the Activity needs for the Session to pay for
 * itself.
 *
 * Nothing here computes the figure. `getSessionQuotas` owns the weighting — a
 * per-Session joiner funds one Session and counts as half a monthly member — and
 * this only decides whether there is a floor to draw at all. The type import is
 * erased at compile time, so reading the quota's shape does not drag the
 * server-only module that produces it into a client bundle.
 */

export type SessionFloor = Readonly<{
    committed: number;
    needed: number;
    /** `committed >= needed`. A Session below it may not pay for itself. */
    isMet: boolean;
}>;

/**
 * The floor to draw, or `null` where none applies.
 *
 * `needed === 0` is an Activity that sets no minimum, and `0/0` would state a
 * floor that has been met rather than one that was never set — two different
 * facts, and only one of them is true. A Session whose quota is missing (its
 * Activity was not read) draws nothing for the same reason.
 */
export function resolveSessionFloor(
    quota: SessionQuota | undefined,
): SessionFloor | null {
    if (quota === undefined || quota.needed === 0) {
        return null;
    }
    return {
        committed: quota.committed,
        needed: quota.needed,
        isMet: quota.isMet,
    };
}

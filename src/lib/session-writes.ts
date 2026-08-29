import 'server-only';
import type { ActivitySession, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    LIVE_PAYMENT_STATUSES,
    resolveDeleteRefusal,
    resolveSessionRefusal,
    SEAT_HOLDING_STATUSES,
    toSessionLockFacts,
    type SessionPatch,
    type SessionRefusal,
} from '@/lib/session-lock';

/**
 * The two Admin writes to a Session that have to serialise against a
 * reservation, each inside one short transaction holding the Session's own row
 * lock.
 *
 * `PATCH` used to read the held-Seat count and write the new `maxPlayers` in two
 * separate statements with nothing between them. A reservation committing in
 * that window — under its own `SELECT … FOR UPDATE` in `src/lib/payments.ts`
 * (`registerAndPaySession`, `reserveSeat`) — could leave `maxPlayers` one below
 * the Seats actually held, which is the one invariant capacity has. Taking the
 * **same** row lock, in the same statement shape, is what makes the two writes
 * queue instead of interleave: whichever arrives second reads the other's
 * committed count.
 *
 * `DELETE` takes it for the same reason: its refusal turns on the same counts,
 * and a Seat claimed between the count and the delete would be destroyed along
 * with the row it was claimed on.
 *
 * What is deliberately **outside** the transaction, and stays outside:
 * `releaseExpiredHolds()` — its caller sweeps first, so the counts are taken
 * after it, and the sweep is its own write with emails queued behind it —
 * `auth()`, the dictionary, `invalidatePublicLanding()` and every send.
 * Production caps the pool at one connection per function instance
 * (`src/lib/prisma.ts`), so a transaction that waited on anything but this row
 * would be holding the only connection there is while it waited.
 *
 * A refusal is a **returned value**, never a throw: the route answers it with a
 * 409, and a thrown refusal would roll the transaction back into a 500 instead.
 */

/**
 * The stored row the locking rules read, and the two counts they turn on. The
 * counts are taken **after** the hold sweep and **under** the row lock, so a
 * lapsed hold neither locks a fee nor floors capacity, and a live one cannot
 * appear between the count and the write.
 */
const LOCK_SELECT = {
    title: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    maxPlayers: true,
    fee: true,
    notes: true,
    status: true,
    _count: {
        select: {
            attendances: { where: { status: { in: SEAT_HOLDING_STATUSES } } },
            payments: { where: { status: { in: LIVE_PAYMENT_STATUSES } } },
        },
    },
} satisfies Prisma.ActivitySessionSelect;

/** What a locked write could not do, for the route to answer with. */
export type SessionWriteRefusal =
    | Readonly<{ kind: 'missing' }>
    | Readonly<{ kind: 'refused'; refusal: SessionRefusal }>;

export type SessionUpdateOutcome =
    | Readonly<{ kind: 'updated'; session: ActivitySession }>
    | SessionWriteRefusal;

export type SessionDeleteOutcome =
    | Readonly<{ kind: 'deleted' }>
    | SessionWriteRefusal;

/**
 * Take the reservation path's own row lock, then read what the rules decide on.
 *
 * `FOR UPDATE` on a row that is not there locks nothing and returns nothing, so
 * the read below is what turns a missing Session into a 404 — the lock's own
 * result says only that there was something to lock.
 */
async function lockAndRead(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`
        SELECT "id" FROM "ActivitySession" WHERE "id" = ${id} FOR UPDATE
    `;
    const existing = await tx.activitySession.findUnique({
        where: { id },
        select: LOCK_SELECT,
    });
    if (!existing) {
        return null;
    }
    const { _count, ...stored } = existing;
    return { stored, facts: toSessionLockFacts(_count, stored.status) };
}

/**
 * The edit, decided and written under one lock. `now` is the instant a
 * reopening is judged against and comes from the caller, so the rules themselves
 * read no clock.
 */
export function updateSessionLocked(
    id: string,
    patch: SessionPatch,
    now: Date,
): Promise<SessionUpdateOutcome> {
    return prisma.$transaction(async (tx): Promise<SessionUpdateOutcome> => {
        const row = await lockAndRead(tx, id);
        if (!row) {
            return { kind: 'missing' };
        }
        const refusal = resolveSessionRefusal(row.stored, patch, row.facts, now);
        if (refusal) {
            return { kind: 'refused', refusal };
        }
        const { date, ...rest } = patch;
        const session = await tx.activitySession.update({
            where: { id },
            data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
        });
        return { kind: 'updated', session };
    });
}

/** The destruction, decided and written under the same lock. */
export function deleteSessionLocked(id: string): Promise<SessionDeleteOutcome> {
    return prisma.$transaction(async (tx): Promise<SessionDeleteOutcome> => {
        const row = await lockAndRead(tx, id);
        if (!row) {
            return { kind: 'missing' };
        }
        const refusal = resolveDeleteRefusal(row.stored, row.facts);
        if (refusal) {
            return { kind: 'refused', refusal };
        }
        await tx.activitySession.delete({ where: { id } });
        return { kind: 'deleted' };
    });
}

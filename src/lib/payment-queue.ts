/**
 * The Payments queue's ordering, expressed as arithmetic rather than as a sort.
 *
 * "Awaiting a decision first, then the rest by recency" is two orderings, not
 * one, and no `orderBy` says it. Sorting on the status column would only work
 * by accident: it would lean on the *declaration order* of the `PaymentStatus`
 * enum in Postgres, so reordering three lines in `schema.prisma` — a change
 * nobody would review as a behaviour change — would silently bury the rows the
 * Admin came for. Ordering that matters this much does not get to be a
 * coincidence.
 *
 * So the queue is two queries over two disjoint bands of the same filtered set,
 * each ordered by recency on its own, concatenated in band order. What this
 * module owns is the one part that can be got wrong without a database: which
 * slice of which band a given page is. It is pure, so it is tested.
 *
 * The bands are disjoint and exhaustive by construction — `status = PENDING`
 * and `status <> PENDING` — so the two counts sum to the filtered total and the
 * shared pagination control keeps working unchanged.
 */

/** One band's slice of a page, in the shape Prisma's `findMany` takes. */
export type QueueBand = Readonly<{
    skip: number | undefined;
    take: number | undefined;
}>;

export type QueuePageSplit = Readonly<{
    awaiting: QueueBand;
    decided: QueueBand;
}>;

/** "Show all" asks for both bands whole, still in band order. */
const WHOLE_BAND: QueueBand = { skip: undefined, take: undefined };

/**
 * Which slice of each band the requested page is made of.
 *
 * A page is a window `[skip, skip + take)` over the concatenation of the two
 * bands, so the awaiting band contributes whatever of that window still falls
 * inside its own `awaitingTotal` rows and the decided band contributes the
 * rest, offset by however many awaiting rows the window has already passed.
 *
 * A band whose `take` comes back `0` contributes nothing to this page and is
 * not worth a round trip; callers check for it.
 */
export function splitQueuePage(
    awaitingTotal: number,
    skip: number | undefined,
    take: number | undefined,
): QueuePageSplit {
    if (skip === undefined || take === undefined) {
        return { awaiting: WHOLE_BAND, decided: WHOLE_BAND };
    }
    const awaitingLeft = Math.max(awaitingTotal - skip, 0);
    const awaitingTake = Math.min(awaitingLeft, take);
    return {
        awaiting: { skip: Math.min(skip, awaitingTotal), take: awaitingTake },
        decided: {
            skip: Math.max(skip - awaitingTotal, 0),
            take: take - awaitingTake,
        },
    };
}

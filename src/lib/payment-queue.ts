import { PaymentStatus, Prisma, Role } from '@prisma/client';

/**
 * The Payments queue's page, as one ordered read.
 *
 * **Ordering is the feature.** Payments awaiting a decision come first, then
 * everything else by recency. That is two orderings, and no Prisma `orderBy`
 * says it: sorting on the status column would work only by accident, leaning on
 * the *declaration order* of the `PaymentStatus` enum in Postgres, so
 * reordering three lines in `schema.prisma` — a change nobody would review as a
 * behaviour change — would silently bury the rows the Admin came for. Ordering
 * that matters this much does not get to be a coincidence.
 *
 * So the order is a `CASE` that names the awaiting value itself, through the
 * generated `PaymentStatus.PENDING` rather than a hand-typed string: the
 * declaration order is never read, and a value that is ever renamed moves the
 * constant and this statement together. Recency follows, and then the id —
 * `createdAt` is a millisecond timestamp, so two Payments can share one, and an
 * ordering that ends on a unique column stops being a tie at all. A tie is free
 * to resolve differently from one read to the next, which drops a row from one
 * page and repeats it on another.
 *
 * This replaces two reads over two disjoint bands (`status = PENDING` and
 * `status <> PENDING`) whose slices were worked out arithmetically between
 * them. One `ORDER BY` over the whole filtered set is what makes a page a
 * single snapshot: an Admin who Confirms a Payment mid-read can no longer move
 * a row from one band into the other between two queries, and so can no longer
 * drop it from the page or show it twice.
 *
 * It is SQL because Prisma has no computed `orderBy`, and it lives here rather
 * than beside its caller so the translation can be tested without a database.
 * Every filter value is a bound parameter; nothing anybody typed is ever
 * concatenated into the statement.
 */

/**
 * What the queue filters by — structurally what `PaymentFilterValues` carries.
 * Declared here rather than imported so this module owes nothing to the surface
 * it serves; the compiler checks the two agree at the call site.
 */
export type QueueFilters = Readonly<{
    month: number | undefined;
    year: number | undefined;
    status: string | undefined;
    activityId: string | undefined;
    search: string;
}>;

/**
 * The email arm of the search, which an Owner's row joins only for an Owner.
 *
 * This is `searchByNameOrEmail`'s rule in SQL, and it is a rule about an
 * address rather than about a column: a filter that matches on a value the row
 * refuses to return is an oracle for that value, so an Admin could type the
 * Owner's address one character at a time and watch the row appear. The name
 * arm is unguarded because the name is the identifier these surfaces do print.
 */
function emailArmSql(pattern: string, viewerRole: Role): Prisma.Sql {
    if (viewerRole === Role.OWNER) {
        return Prisma.sql`u."email" ILIKE ${pattern}`;
    }
    return Prisma.sql`(u."email" ILIKE ${pattern} AND u."role" <> ${Role.OWNER}::"Role")`;
}

/**
 * Find a Payment by the name or the email of the member who sent it.
 *
 * This says in SQL what `searchWhere` in `payment-queue-query.ts` says in
 * Prisma, and the two must keep saying the same thing: the counts beside this
 * read are still Prisma's, and a queue whose rows and whose total disagree is
 * worse than either alone. `contains` does not escape `%` or `_` — Prisma
 * leaves that to the caller — so the pattern is built the same way here, with
 * the wildcards inside the bound value and nothing added to what was typed.
 *
 * `EXISTS` rather than a join: a Payment has exactly one member, so a join
 * could not duplicate a row either, but a subquery cannot be *read* as though
 * it might.
 */
function searchSql(search: string, viewerRole: Role): Prisma.Sql {
    const pattern = `%${search}%`;
    return Prisma.sql`EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = p."userId"
          AND (u."name" ILIKE ${pattern} OR ${emailArmSql(pattern, viewerRole)})
    )`;
}

/** The filters as one `AND`-ed clause, or no clause at all when none is set. */
function whereSql(filters: QueueFilters, viewerRole: Role): Prisma.Sql {
    const terms: Prisma.Sql[] = [];
    if (filters.month) {
        terms.push(Prisma.sql`p."month" = ${filters.month}`);
    }
    if (filters.year) {
        terms.push(Prisma.sql`p."year" = ${filters.year}`);
    }
    if (filters.status) {
        terms.push(Prisma.sql`p."status" = ${filters.status}::"PaymentStatus"`);
    }
    if (filters.activityId) {
        terms.push(Prisma.sql`p."activityId" = ${filters.activityId}`);
    }
    if (filters.search) {
        terms.push(searchSql(filters.search, viewerRole));
    }
    if (terms.length === 0) {
        return Prisma.empty;
    }
    return Prisma.sql`WHERE ${Prisma.join(terms, ' AND ')}`;
}

/** "Show all" asks for the whole filtered set, so it takes no window. */
function windowSql(
    skip: number | undefined,
    take: number | undefined,
): Prisma.Sql {
    if (skip === undefined || take === undefined) {
        return Prisma.empty;
    }
    return Prisma.sql`LIMIT ${take} OFFSET ${skip}`;
}

/**
 * The ids of one page of the queue, in the order the page draws them.
 *
 * Ids rather than whole rows: the shape the register takes is a Prisma `select`
 * carrying two relations, and rebuilding that by hand in SQL would be a second
 * definition of one contract, free to drift from the first. The rows are
 * fetched by id afterwards, and that fetch cannot reorder the page — given a
 * fixed list of ids it can only answer with those rows, or with fewer if one
 * was deleted in between.
 */
export function queuePageIdsSql(
    filters: QueueFilters,
    viewerRole: Role,
    skip: number | undefined,
    take: number | undefined,
): Prisma.Sql {
    const awaitingFirst = Prisma.sql`CASE WHEN p."status" = ${PaymentStatus.PENDING}::"PaymentStatus" THEN 0 ELSE 1 END`;
    return Prisma.sql`
        SELECT p."id"
        FROM "Payment" p
        ${whereSql(filters, viewerRole)}
        ORDER BY ${awaitingFirst} ASC, p."createdAt" DESC, p."id" DESC
        ${windowSql(skip, take)}
    `;
}

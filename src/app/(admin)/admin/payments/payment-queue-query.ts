import { PaymentStatus, type Prisma, type Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    resolveOwnerVisibility,
    searchByNameOrEmail,
} from '@/lib/owner-visibility';
import { parseSearch, type RawSearchParams } from '@/lib/table-params';
import { queuePageIdsSql } from '@/lib/payment-queue';
import type { PaymentQueueRow } from './payment-cells';
import type { PaymentFilterValues } from './payment-filters';

/**
 * What the queue reads, and in what order.
 *
 * **Ordering is the feature.** Payments awaiting a decision come first, then
 * everything else by recency. See `src/lib/payment-queue.ts` for the ordering
 * itself and for why it is not one `orderBy` on the status column: that would
 * rest on the declaration order of the `PaymentStatus` enum, where the `CASE`
 * it uses instead names `PENDING` explicitly, and ordering an Admin's work
 * queue does not get to be a coincidence.
 *
 * **A page is one snapshot.** The queue's own order is read as a single
 * statement returning the page's ids, and the rows are then fetched by id. It
 * used to be two reads over two disjoint bands (`status = PENDING` and
 * `status <> PENDING`) with the page's slice of each worked out between them,
 * and an Admin Confirming a Payment mid-read moved a row from one band to the
 * other — so the page dropped a row or drew one twice. Fetching by a fixed list
 * of ids cannot reorder anything, so the second read cannot reintroduce that.
 *
 * The two counts are still two ordinary reads, and deliberately: they size the
 * pagination control and the heading rather than deciding which rows the page
 * holds, so a count taken a moment apart from the page costs at worst a
 * pagination control that is one out of date until the next load.
 *
 * The search predicate exists twice — `searchWhere` here for the counts, and
 * `searchSql` in `src/lib/payment-queue.ts` for the page — and the two must
 * keep saying the same thing, the Owner email guard included. Both defer to
 * `searchByNameOrEmail`'s rule: the email arm skips Owner rows for anybody but
 * an Owner, so no filter can be used as an oracle for an address no cell prints.
 *
 * An explicit column sort wins: the moment the Admin picks one, they have said
 * what order they want, and the page becomes a single ordinary read.
 */

/** The default view. Not a column, so no head ever renders as sorted by it. */
export const QUEUE_SORT = 'queue';

/** The columns whose heads sort. Anything else means the queue's own order. */
const SORTABLE_COLS = ['member', 'amount', 'month', 'createdAt'];

const STATUS_FILTERS: PaymentStatus[] = [
    PaymentStatus.PENDING,
    PaymentStatus.CONFIRMED,
    PaymentStatus.REJECTED,
];

const PAYMENT_SELECT = {
    id: true,
    type: true,
    amount: true,
    month: true,
    year: true,
    status: true,
    proofUrl: true,
    createdAt: true,
    confirmedAt: true,
    user: { select: { name: true, email: true, role: true } },
    activity: {
        select: {
            id: true,
            name: true,
            monthlyFee: true,
            bankName: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
        },
    },
    session: { select: { title: true, date: true, fee: true } },
} as const;

/**
 * The exact shape one `PAYMENT_SELECT` row comes back as. `role` is read only
 * to resolve the Owner contact rule below and never leaves this module —
 * `toVisibleRow` strips it before a row reaches the page.
 */
type SelectedPaymentRow = Prisma.PaymentGetPayload<{
    select: typeof PAYMENT_SELECT;
}>;

/**
 * The one place a queue row's Owner contact is decided — never in the cell
 * that draws it, for the same reason `member-rows.ts` withholds server-side: a
 * component handed the address and choosing not to draw it would still have
 * shipped it to the browser.
 */
function toVisibleRow(
    row: SelectedPaymentRow,
    viewerRole: Role,
): PaymentQueueRow {
    const { email, isContactWithheld } = resolveOwnerVisibility(
        { role: row.user.role, email: row.user.email, phone: null },
        viewerRole,
    );
    return {
        ...row,
        user: { name: row.user.name, email },
        isContactWithheld,
    };
}

function first(sp: RawSearchParams, key: string): string | undefined {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
}

function toMonthOrYear(raw: string | undefined): number | undefined {
    if (!raw) {
        return undefined;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
}

export function readFilters(sp: RawSearchParams): PaymentFilterValues {
    const rawStatus = first(sp, 'status');
    return {
        month: toMonthOrYear(first(sp, 'month')),
        year: toMonthOrYear(first(sp, 'year')),
        status: STATUS_FILTERS.find((status) => status === rawStatus),
        activityId: first(sp, 'activityId') || undefined,
        search: parseSearch(sp),
    };
}

/**
 * Matches on name always, and on email only where that email is not withheld
 * from this viewer — the same oracle guard `GET /api/users` and the Members
 * register share, so the Owner cannot be found by an address no cell prints.
 */
function searchWhere(search: string, viewerRole: Role): Prisma.PaymentWhereInput {
    return { user: searchByNameOrEmail(search, viewerRole) };
}

export function buildWhere(
    values: PaymentFilterValues,
    viewerRole: Role,
): Prisma.PaymentWhereInput {
    return {
        ...(values.month ? { month: values.month } : {}),
        ...(values.year ? { year: values.year } : {}),
        ...(values.status ? { status: values.status as PaymentStatus } : {}),
        ...(values.activityId ? { activityId: values.activityId } : {}),
        ...(values.search ? searchWhere(values.search, viewerRole) : {}),
    };
}

/** An explicit sort ends on the id for the same reason the queue's does. */
function buildOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.PaymentOrderByWithRelationInput[] {
    if (sortBy === 'month') {
        return [
            { year: dir },
            { month: dir },
            { createdAt: 'desc' },
            { id: 'desc' },
        ];
    }
    if (sortBy === 'member') {
        return [{ user: { name: dir } }, { createdAt: 'desc' }, { id: 'desc' }];
    }
    if (sortBy === 'amount') {
        return [{ amount: dir }, { createdAt: 'desc' }, { id: 'desc' }];
    }
    return [{ createdAt: dir }, { id: 'desc' }];
}

export type QueuePage = Readonly<{
    rows: PaymentQueueRow[];
    total: number;
    awaitingTotal: number;
}>;

export type PageRequest = Readonly<{
    filters: PaymentFilterValues;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number | undefined;
    take: number | undefined;
}>;

/**
 * The rows back in the order their ids came in.
 *
 * An id with no row was deleted between the two reads. The page is then one row
 * shorter and still whole, which is what a deletion means — it is not the
 * missing row the two-band read used to produce, where the row still existed
 * and the page simply failed to name it.
 */
function inIdOrder(
    ids: readonly string[],
    rows: SelectedPaymentRow[],
): SelectedPaymentRow[] {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered: SelectedPaymentRow[] = [];
    for (const id of ids) {
        const row = byId.get(id);
        if (row !== undefined) {
            ordered.push(row);
        }
    }
    return ordered;
}

/** The queue's own order: awaiting first, then the decided by recency. */
async function loadQueue(
    request: PageRequest,
    viewerRole: Role,
): Promise<SelectedPaymentRow[]> {
    const page = await prisma.$queryRaw<{ id: string }[]>(
        queuePageIdsSql(
            request.filters,
            viewerRole,
            request.skip,
            request.take,
        ),
    );
    const ids: string[] = page.map((row) => row.id);
    if (ids.length === 0) {
        return [];
    }
    const rows = await prisma.payment.findMany({
        where: { id: { in: ids } },
        select: PAYMENT_SELECT,
    });
    return inIdOrder(ids, rows);
}

/** Whichever order the Admin is on: their chosen column, or the queue's own. */
async function loadRows(
    request: PageRequest,
    where: Prisma.PaymentWhereInput,
    viewerRole: Role,
): Promise<SelectedPaymentRow[]> {
    if (SORTABLE_COLS.includes(request.sortBy)) {
        return prisma.payment.findMany({
            where,
            orderBy: buildOrderBy(request.sortBy, request.sortDir),
            skip: request.skip,
            take: request.take,
            select: PAYMENT_SELECT,
        });
    }
    return loadQueue(request, viewerRole);
}

export async function loadPayments(
    request: PageRequest,
    viewerRole: Role,
): Promise<QueuePage> {
    const where = buildWhere(request.filters, viewerRole);
    const [total, awaitingTotal, rows] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.count({
            where: { AND: [where, { status: PaymentStatus.PENDING }] },
        }),
        loadRows(request, where, viewerRole),
    ]);
    return {
        rows: rows.map((row) => toVisibleRow(row, viewerRole)),
        total,
        awaitingTotal,
    };
}

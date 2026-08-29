import { PaymentStatus, type Prisma, type Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    resolveOwnerVisibility,
    searchByNameOrEmail,
} from '@/lib/owner-visibility';
import { parseSearch, type RawSearchParams } from '@/lib/table-params';
import { splitQueuePage, type QueueBand } from '@/lib/payment-queue';
import type { PaymentQueueRow } from './payment-cells';
import type { PaymentFilterValues } from './payment-filters';

/**
 * What the queue reads, and in what order.
 *
 * **Ordering is the feature.** Payments awaiting a decision come first, then
 * everything else by recency — two orderings, so two reads over two disjoint
 * bands of the same filtered set, concatenated in band order. See
 * `src/lib/payment-queue.ts` for why this is not one `orderBy` on the status
 * column: that would rest on the declaration order of the `PaymentStatus` enum,
 * and ordering an Admin's work queue does not get to be a coincidence.
 *
 * The bands are `status = PENDING` and `status <> PENDING`, composed with the
 * caller's filters under `AND` rather than by spreading a status over them — a
 * spread would silently overwrite the Admin's own standing filter.
 *
 * An explicit column sort wins: the moment the Admin picks one, they have said
 * what order they want, and the page becomes a single ordinary read.
 */

/** The default view. Not a column, so no head ever renders as sorted by it. */
export const QUEUE_SORT = 'queue';

/** The columns whose heads sort. Anything else means the queue's own order. */
const SORTABLE_COLS = ['member', 'amount', 'month', 'createdAt'];

/**
 * Recency inside each band, then the id.
 *
 * `createdAt` is a millisecond timestamp, so two Payments can share one. Two
 * `LIMIT`/`OFFSET` reads that straddle such a pair are free to resolve the tie
 * differently, which drops one row from a page and shows another twice — so the
 * ordering ends on a unique column and stops being a tie at all.
 */
const QUEUE_ORDER: Prisma.PaymentOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
    { id: 'desc' },
];

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

/**
 * One band's slice. A band contributing nothing to this page is not worth a
 * round trip, so a `take` of zero answers without one.
 */
async function findBand(
    where: Prisma.PaymentWhereInput,
    band: QueueBand,
): Promise<SelectedPaymentRow[]> {
    if (band.take === 0) {
        return [];
    }
    return prisma.payment.findMany({
        where,
        orderBy: QUEUE_ORDER,
        skip: band.skip,
        take: band.take,
        select: PAYMENT_SELECT,
    });
}

export type QueuePage = Readonly<{
    rows: PaymentQueueRow[];
    total: number;
    awaitingTotal: number;
}>;

export type PageRequest = Readonly<{
    where: Prisma.PaymentWhereInput;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    skip: number | undefined;
    take: number | undefined;
}>;

/** The queue's own order: awaiting first, then the decided by recency. */
async function loadQueue(
    request: PageRequest,
    awaitingWhere: Prisma.PaymentWhereInput,
    awaitingTotal: number,
): Promise<SelectedPaymentRow[]> {
    const split = splitQueuePage(awaitingTotal, request.skip, request.take);
    const decidedWhere: Prisma.PaymentWhereInput = {
        AND: [request.where, { status: { not: PaymentStatus.PENDING } }],
    };
    const [awaiting, decided] = await Promise.all([
        findBand(awaitingWhere, split.awaiting),
        findBand(decidedWhere, split.decided),
    ]);
    return [...awaiting, ...decided];
}

export async function loadPayments(
    request: PageRequest,
    viewerRole: Role,
): Promise<QueuePage> {
    const { where, skip, take } = request;
    const awaitingWhere: Prisma.PaymentWhereInput = {
        AND: [where, { status: PaymentStatus.PENDING }],
    };
    const [total, awaitingTotal] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.count({ where: awaitingWhere }),
    ]);

    if (SORTABLE_COLS.includes(request.sortBy)) {
        const rows = await prisma.payment.findMany({
            where,
            orderBy: buildOrderBy(request.sortBy, request.sortDir),
            skip,
            take,
            select: PAYMENT_SELECT,
        });
        return {
            rows: rows.map((row) => toVisibleRow(row, viewerRole)),
            total,
            awaitingTotal,
        };
    }

    const rows = await loadQueue(request, awaitingWhere, awaitingTotal);
    return {
        rows: rows.map((row) => toVisibleRow(row, viewerRole)),
        total,
        awaitingTotal,
    };
}

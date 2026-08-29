import { PaymentStatus, type Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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

/** Recency inside each band. */
const QUEUE_ORDER: Prisma.PaymentOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
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
    user: { select: { name: true, email: true } },
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

function searchWhere(search: string): Prisma.PaymentWhereInput {
    return {
        user: {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        },
    };
}

export function buildWhere(
    values: PaymentFilterValues,
): Prisma.PaymentWhereInput {
    return {
        ...(values.month ? { month: values.month } : {}),
        ...(values.year ? { year: values.year } : {}),
        ...(values.status ? { status: values.status as PaymentStatus } : {}),
        ...(values.activityId ? { activityId: values.activityId } : {}),
        ...(values.search ? searchWhere(values.search) : {}),
    };
}

function buildOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.PaymentOrderByWithRelationInput[] {
    if (sortBy === 'month') {
        return [{ year: dir }, { month: dir }, { createdAt: 'desc' }];
    }
    if (sortBy === 'member') {
        return [{ user: { name: dir } }, { createdAt: 'desc' }];
    }
    if (sortBy === 'amount') {
        return [{ amount: dir }, { createdAt: 'desc' }];
    }
    return [{ createdAt: dir }];
}

/**
 * One band's slice. A band contributing nothing to this page is not worth a
 * round trip, so a `take` of zero answers without one.
 */
async function findBand(
    where: Prisma.PaymentWhereInput,
    band: QueueBand,
): Promise<PaymentQueueRow[]> {
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
): Promise<PaymentQueueRow[]> {
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

export async function loadPayments(request: PageRequest): Promise<QueuePage> {
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
        return { rows, total, awaitingTotal };
    }

    const rows = await loadQueue(request, awaitingWhere, awaitingTotal);
    return { rows, total, awaitingTotal };
}

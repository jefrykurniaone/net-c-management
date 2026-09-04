import type { Prisma } from '@prisma/client';
import { parsePagination, type RawSearchParams } from '@/lib/table-params';

/**
 * The member's Payment history, as the URL asks for it: which standing, which
 * Activity, which page. Pure — the search params arrive as a plain record.
 *
 * **Every filter is validated before it reaches Prisma.** A status arriving as
 * anything but one of the three stored values is dropped rather than passed
 * through, because an unrecognised enum value is a Prisma error rather than an
 * empty result.
 */

export const HISTORY_STATUS_KEY = 'historyStatus';
export const HISTORY_ACTIVITY_KEY = 'historyActivity';
export const HISTORY_PAGE_KEY = 'historyPage';
export const HISTORY_PAGE_SIZE_KEY = 'historyPageSize';

/** The three standings a Payment row can be in. */
const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED'] as const;

export type PaymentHistoryStatus = (typeof PAYMENT_STATUSES)[number];

export interface PaymentHistoryQuery {
    /** `undefined` means every standing, not "none of them". */
    readonly status: PaymentHistoryStatus | undefined;
    readonly activityId: string | undefined;
    readonly page: number;
    readonly pageSize: number | 'all';
    readonly skip: number | undefined;
    readonly take: number | undefined;
    readonly where: Prisma.PaymentWhereInput;
}

/** The first value of a repeated query-string key, or nothing. */
function first(sp: RawSearchParams, key: string): string | undefined {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
}

/** A stored standing, or `undefined` for anything the enum does not carry. */
function parseStatus(raw: string | undefined): PaymentHistoryStatus | undefined {
    return (PAYMENT_STATUSES as readonly string[]).includes(raw ?? '')
        ? (raw as PaymentHistoryStatus)
        : undefined;
}

export function resolvePaymentHistoryQuery(
    sp: RawSearchParams,
    userId: string,
): PaymentHistoryQuery {
    const status = parseStatus(first(sp, HISTORY_STATUS_KEY));
    const activityId = first(sp, HISTORY_ACTIVITY_KEY) || undefined;
    const { page, pageSize, skip, take } = parsePagination(
        sp,
        HISTORY_PAGE_KEY,
        HISTORY_PAGE_SIZE_KEY,
    );

    return {
        status,
        activityId,
        page,
        pageSize,
        skip,
        take,
        where: {
            userId,
            ...(status ? { status } : {}),
            ...(activityId ? { activityId } : {}),
        },
    };
}

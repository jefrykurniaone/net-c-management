/**
 * Server-safe utility functions for parsing pagination and sort params from
 * Next.js 16 App Router searchParams (which are always Promises).
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

type SortDir = 'asc' | 'desc';

/** Get the first string value of a raw search param (handles arrays). */
function get(sp: RawSearchParams, key: string): string | undefined {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
}

/** Parse `sortBy` and `sortDir` from raw search params with defaults. */
export function parseSort(
    sp: RawSearchParams,
    defaultSortBy: string,
    defaultSortDir: SortDir = 'asc',
): { sortBy: string; sortDir: SortDir } {
    const sortBy = get(sp, 'sortBy') ?? defaultSortBy;
    const raw = get(sp, 'sortDir') ?? defaultSortDir;
    const sortDir: SortDir = raw === 'desc' ? 'desc' : 'asc';
    return { sortBy, sortDir };
}

/** Parse pagination params with support for custom key names. */
export function parsePagination(
    sp: RawSearchParams,
    pageKey = 'page',
    pageSizeKey = 'pageSize',
): {
    page: number;
    pageSize: number | 'all';
    skip: number | undefined;
    take: number | undefined;
} {
    const rawPage = get(sp, pageKey);
    const rawSize = get(sp, pageSizeKey);
    const page = Math.max(1, parseInt(rawPage ?? '1') || 1);
    const isAll = rawSize === 'all';
    const pageSize: number | 'all' = isAll
        ? 'all'
        : Math.min(1000, Math.max(1, parseInt(rawSize ?? '10') || 10));
    const skip = isAll ? undefined : (page - 1) * (pageSize as number);
    const take = isAll ? undefined : (pageSize as number);
    return { page, pageSize, skip, take };
}

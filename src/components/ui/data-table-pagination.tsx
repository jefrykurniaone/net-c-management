'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RawSearchParams } from '@/lib/table-params';

export type { RawSearchParams };

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Build a query string that merges `current` with `updates`. */
function buildUrl(sp: RawSearchParams, updates: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
        const val = Array.isArray(v) ? v[0] : v;
        if (val !== undefined && val !== '') params.set(k, val);
    }
    for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined && v !== '') params.set(k, v);
        else params.delete(k);
    }
    return `?${params.toString()}`;
}

interface DataTablePaginationProps {
    total: number;
    page: number;
    pageSize: number | 'all';
    searchParams: RawSearchParams;
    labels: {
        previous: string;
        next: string;
        pageOf: string;
        perPage: string;
        showAll: string;
        total: string;
    };
    /** Override the URL param key for page (default: 'page') */
    pageKey?: string;
    /** Override the URL param key for pageSize (default: 'pageSize') */
    pageSizeKey?: string;
}

export function DataTablePagination({
    total,
    page,
    pageSize,
    searchParams,
    labels,
    pageKey = 'page',
    pageSizeKey = 'pageSize',
}: DataTablePaginationProps) {
    const router = useRouter();
    const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize));
    const hasPrev = pageSize !== 'all' && page > 1;
    const hasNext = pageSize !== 'all' && page < totalPages;
    const prevUrl = hasPrev ? buildUrl(searchParams, { [pageKey]: String(page - 1) }) : null;
    const nextUrl = hasNext ? buildUrl(searchParams, { [pageKey]: String(page + 1) }) : null;

    function handleSizeChange(newSize: string) {
        router.push(buildUrl(searchParams, { [pageSizeKey]: newSize, [pageKey]: '1' }));
    }

    if (total === 0) return null;

    const pageLabel = labels.pageOf
        .replace('{page}', String(page))
        .replace('{total}', String(totalPages));
    const totalLabel = labels.total.replace('{n}', String(total));

    return (
        <div
            className='flex items-center justify-between flex-wrap gap-3 px-1 pt-3 text-sm'
            data-testid='pagination'>
            <p className='text-xs text-muted-foreground'>{totalLabel}</p>
            <div className='flex items-center gap-3'>
                <div className='flex items-center gap-1.5'>
                    <span className='text-xs text-muted-foreground'>{labels.perPage}</span>
                    <select
                        value={pageSize === 'all' ? 'all' : String(pageSize)}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        data-testid='page-size-select'
                        className='h-7 border border-input rounded-md px-2 text-xs bg-background'>
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                        <option value='all'>{labels.showAll}</option>
                    </select>
                </div>
                {pageSize !== 'all' && (
                    <div className='flex items-center gap-1.5'>
                        {prevUrl ? (
                            <Link
                                href={prevUrl}
                                aria-label={labels.previous}
                                data-testid='pagination-prev'
                                className='h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted text-muted-foreground transition-colors'>
                                <ChevronLeft className='w-4 h-4' />
                            </Link>
                        ) : (
                            <span
                                aria-disabled='true'
                                className='h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground/30 cursor-not-allowed'>
                                <ChevronLeft className='w-4 h-4' />
                            </span>
                        )}
                        <span
                            className='text-xs text-muted-foreground tabular-nums'
                            data-testid='pagination-info'>
                            {pageLabel}
                        </span>
                        {nextUrl ? (
                            <Link
                                href={nextUrl}
                                aria-label={labels.next}
                                data-testid='pagination-next'
                                className='h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background hover:bg-muted text-muted-foreground transition-colors'>
                                <ChevronRight className='w-4 h-4' />
                            </Link>
                        ) : (
                            <span
                                aria-disabled='true'
                                className='h-7 w-7 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground/30 cursor-not-allowed'>
                                <ChevronRight className='w-4 h-4' />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


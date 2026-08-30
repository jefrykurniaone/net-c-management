'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import type { RawSearchParams } from '@/lib/table-params';

export type { RawSearchParams };

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Shared box for the prev/next arrows. `shrink-0` is load-bearing: without it the
 * 28px square collapses under flex pressure while the 16px chevron inside keeps its
 * intrinsic size, so the icon spills over the neighbouring page label.
 */
const NAV_BOX_CLASS =
    'h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-input bg-background';
const NAV_ENABLED_CLASS = `${NAV_BOX_CLASS} hover:bg-muted text-muted-foreground transition-colors duration-150 motion-reduce:transition-none`;
const NAV_DISABLED_CLASS = `${NAV_BOX_CLASS} text-muted-foreground/30 cursor-not-allowed`;

interface PageNavButtonProps {
    href: string | null;
    label: string;
    testId: string;
    direction: 'prev' | 'next';
}

function PageNavButton({ href, label, testId, direction }: Readonly<PageNavButtonProps>) {
    const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
    const icon = <Icon className='w-4 h-4 shrink-0' />;

    if (!href) {
        return (
            <span aria-disabled='true' className={NAV_DISABLED_CLASS}>
                {icon}
            </span>
        );
    }

    return (
        <Link href={href} aria-label={label} data-testid={testId} className={NAV_ENABLED_CLASS}>
            {icon}
        </Link>
    );
}

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
}: Readonly<DataTablePaginationProps>) {
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
            {/* `min-w-0` lets this group wrap instead of overflowing: its children are
                `shrink-0`, so without it the default `min-width:auto` pins the group at
                max-content and the controls spill past the table edge. */}
            <div className='flex min-w-0 items-center justify-end flex-wrap gap-x-3 gap-y-2'>
                <div className='flex items-center gap-1.5'>
                    <span className='text-xs text-muted-foreground whitespace-nowrap'>
                        {labels.perPage}
                    </span>
                    <NativeSelect
                        value={pageSize === 'all' ? 'all' : String(pageSize)}
                        onChange={(e) => handleSizeChange(e.target.value)}
                        data-testid='page-size-select'
                        className='h-7 w-auto shrink-0 px-2 py-0 text-xs'>
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                        <option value='all'>{labels.showAll}</option>
                    </NativeSelect>
                </div>
                {pageSize !== 'all' && (
                    <div className='flex items-center gap-1.5'>
                        <PageNavButton
                            href={prevUrl}
                            label={labels.previous}
                            testId='pagination-prev'
                            direction='prev'
                        />
                        <span
                            className='text-xs text-muted-foreground tabular-nums whitespace-nowrap'
                            data-testid='pagination-info'>
                            {pageLabel}
                        </span>
                        <PageNavButton
                            href={nextUrl}
                            label={labels.next}
                            testId='pagination-next'
                            direction='next'
                        />
                    </div>
                )}
            </div>
        </div>
    );
}


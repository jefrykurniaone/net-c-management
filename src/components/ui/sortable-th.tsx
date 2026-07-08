'use client';

import Link from 'next/link';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { RawSearchParams } from '@/lib/table-params';

type SortDir = 'asc' | 'desc';

function buildSortUrl(sp: RawSearchParams, column: string): string {
    const current = Array.isArray(sp.sortBy) ? sp.sortBy[0] : sp.sortBy;
    const dir = (Array.isArray(sp.sortDir) ? sp.sortDir[0] : sp.sortDir) as SortDir | undefined;
    const newDir: SortDir = current === column && dir === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
        const val = Array.isArray(v) ? v[0] : v;
        if (val !== undefined && val !== '') params.set(k, val);
    }
    params.set('sortBy', column);
    params.set('sortDir', newDir);
    params.set('page', '1');
    return `?${params.toString()}`;
}

/** A table <th> that renders a clickable sort link. */
export function SortableTh({
    column,
    label,
    searchParams,
    className = '',
    align = 'left',
}: {
    column: string;
    label: string;
    searchParams: RawSearchParams;
    className?: string;
    align?: 'left' | 'center' | 'right';
}) {
    const currentCol = Array.isArray(searchParams.sortBy) ? searchParams.sortBy[0] : searchParams.sortBy;
    const currentDir = Array.isArray(searchParams.sortDir) ? searchParams.sortDir[0] : searchParams.sortDir;
    const isActive = currentCol === column;
    const href = buildSortUrl(searchParams, column);

    const alignClass =
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    const Icon = !isActive ? ChevronsUpDown : currentDir === 'asc' ? ChevronUp : ChevronDown;

    return (
        <th
            className={`px-5 py-2.5 ${alignClass} ${className}`}
            data-testid={`sort-th-${column}`}>
            <Link
                href={href}
                className='inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors'>
                {label}
                <Icon className='w-3 h-3 opacity-60' />
            </Link>
        </th>
    );
}

'use client';

import Link from 'next/link';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RawSearchParams } from '@/lib/table-params';

type SortDir = 'asc' | 'desc';
type Align = 'left' | 'center' | 'right';

const ALIGN_CLASS: Record<Align, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

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

const ICON_CLASS = 'w-3 h-3 opacity-60';

/** Which chevron the head wears: the current direction, or neither. */
function SortChevron({
    isActive,
    dir,
}: Readonly<{ isActive: boolean; dir: string | undefined }>) {
    if (!isActive) {
        return <ChevronsUpDown className={ICON_CLASS} />;
    }
    if (dir === 'asc') {
        return <ChevronUp className={ICON_CLASS} />;
    }
    return <ChevronDown className={ICON_CLASS} />;
}

interface SortableThProps {
    column: string;
    label: string;
    searchParams: RawSearchParams;
    /**
     * Extra classes for the `<th>`. Merged with `cn`, so a caller that owns its
     * own lattice — the admin register — can set the cell's padding and rules
     * without fighting the defaults below.
     */
    className?: string;
    align?: Align;
}

/**
 * A table `<th>` that renders a clickable sort link.
 *
 * The head takes **Label** from the token layer rather than restating a size:
 * a column head is the board's own furniture (DESIGN.md, *The
 * Tracked-Caps-Are-Structural Rule*), and a sortable head that letters itself
 * differently from the plain head beside it is two head appearances in one row.
 */
export function SortableTh({
    column,
    label,
    searchParams,
    className,
    align = 'left',
}: Readonly<SortableThProps>) {
    const currentCol = Array.isArray(searchParams.sortBy) ? searchParams.sortBy[0] : searchParams.sortBy;
    const currentDir = Array.isArray(searchParams.sortDir) ? searchParams.sortDir[0] : searchParams.sortDir;
    const isActive = currentCol === column;
    const href = buildSortUrl(searchParams, column);

    return (
        <th
            scope='col'
            className={cn('px-5 py-2.5', ALIGN_CLASS[align], className)}
            data-testid={`sort-th-${column}`}>
            <Link
                href={href}
                className='inline-flex items-center gap-1 type-label text-muted-foreground hover:text-foreground transition-colors'>
                {label}
                <SortChevron isActive={isActive} dir={currentDir} />
            </Link>
        </th>
    );
}

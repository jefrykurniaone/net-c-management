import { Skeleton } from '@/components/ui/skeleton';

const MEMBER_STAT_CARDS = 3;
const ADMIN_STAT_CARDS = 4;
const DEFAULT_LIST_ROWS = 4;
const DEFAULT_TABLE_ROWS = 6;
const DEFAULT_TABLE_COLS = 6;
const DEFAULT_FORM_FIELDS = 5;

const CARD = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800';

export function PageHeaderSkeleton() {
    return (
        <div className='space-y-2'>
            <Skeleton className='h-7 w-48' />
            <Skeleton className='h-4 w-32' />
        </div>
    );
}

export function StatCardsSkeleton({
    count = MEMBER_STAT_CARDS,
}: Readonly<{ count?: number }>) {
    const gridClass =
        count >= ADMIN_STAT_CARDS
            ? 'grid grid-cols-1 gap-4 lg:grid-cols-4'
            : 'grid grid-cols-1 gap-4 sm:grid-cols-3';
    return (
        <div className={gridClass}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={`${CARD} p-5 space-y-3`}>
                    <div className='flex items-center justify-between'>
                        <Skeleton className='h-4 w-24' />
                        <Skeleton className='h-4 w-4 rounded' />
                    </div>
                    <Skeleton className='h-7 w-20' />
                </div>
            ))}
        </div>
    );
}

export function ListSkeleton({
    rows = DEFAULT_LIST_ROWS,
}: Readonly<{ rows?: number }>) {
    return (
        <div className='space-y-3'>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className={`${CARD} p-4 flex items-start justify-between gap-3`}>
                    <div className='flex-1 space-y-2'>
                        <Skeleton className='h-4 w-40' />
                        <Skeleton className='h-3 w-56' />
                        <Skeleton className='h-3 w-32' />
                    </div>
                    <div className='space-y-2'>
                        <Skeleton className='h-3 w-10 ml-auto' />
                        <Skeleton className='h-5 w-16 rounded-full' />
                    </div>
                </div>
            ))}
        </div>
    );
}

function TableRow({ cols }: Readonly<{ cols: number }>) {
    return (
        <div className='p-4 flex gap-4 border-b border-gray-50 dark:border-gray-800/50 last:border-0'>
            {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className='h-4 flex-1' />
            ))}
        </div>
    );
}

export function TableSkeleton({
    rows = DEFAULT_TABLE_ROWS,
    cols = DEFAULT_TABLE_COLS,
}: Readonly<{ rows?: number; cols?: number }>) {
    return (
        <div className='space-y-6'>
            <PageHeaderSkeleton />
            <div className='flex gap-2'>
                <Skeleton className='h-9 w-full max-w-xs' />
                <Skeleton className='h-9 w-24' />
            </div>
            <div className={`${CARD} overflow-hidden`}>
                <div className='border-b border-gray-100 dark:border-gray-800 p-4 flex gap-4'>
                    {Array.from({ length: cols }).map((_, i) => (
                        <Skeleton key={i} className='h-4 flex-1' />
                    ))}
                </div>
                {Array.from({ length: rows }).map((_, r) => (
                    <TableRow key={r} cols={cols} />
                ))}
            </div>
        </div>
    );
}

export function FormSkeleton({
    fields = DEFAULT_FORM_FIELDS,
}: Readonly<{ fields?: number }>) {
    return (
        <div className='max-w-lg space-y-6'>
            <PageHeaderSkeleton />
            <div className={`${CARD} p-6 space-y-5`}>
                {Array.from({ length: fields }).map((_, i) => (
                    <div key={i} className='space-y-1.5'>
                        <Skeleton className='h-4 w-24' />
                        <Skeleton className='h-9 w-full' />
                    </div>
                ))}
                <Skeleton className='h-9 w-full' />
            </div>
        </div>
    );
}

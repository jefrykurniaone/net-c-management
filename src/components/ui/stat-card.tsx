import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard stat card (UX-DR8): shadcn Card + tracked-caps Label head + the
 * count in the Figure Lead role, so every stat carries tabular figures from the
 * ramp rather than an ad-hoc size. Optional sub-line, icon, and link to the
 * underlying list. Reused by the member + admin dashboards so a stat card is
 * never re-implemented per page (AC1).
 */
export function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    href,
}: Readonly<{
    label: ReactNode;
    value: ReactNode;
    sub?: ReactNode;
    icon?: LucideIcon;
    href?: string;
}>) {
    const card = (
        <Card className='gap-1.5'>
            <CardHeader className='flex flex-row items-center justify-between pb-0'>
                <CardTitle className='type-label text-muted-foreground'>
                    {label}
                </CardTitle>
                {Icon && <Icon className='w-4 h-4 text-subtle-foreground' />}
            </CardHeader>
            <CardContent>
                <p className='type-figure-lead text-foreground'>{value}</p>
                {sub && (
                    <div className='type-caption text-subtle-foreground mt-1'>
                        {sub}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return href ? (
        <Link href={href} className='block'>
            {card}
        </Link>
    ) : (
        card
    );
}

/**
 * Joined stat strip: one bordered cell block, cells sharing a single ruled line
 * between them rather than sitting in gaps. Denser than a grid of StatCards —
 * the admin dashboard/list headers use this.
 */
export function StatStrip({
    items,
}: Readonly<{
    items: ReadonlyArray<{
        label: ReactNode;
        value: ReactNode;
        sub?: ReactNode;
        valueClassName?: string;
        subClassName?: string;
    }>;
}>) {
    return (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border'>
            {items.map((item, i) => (
                <div key={i} className='flex flex-col gap-1 bg-card px-5 py-4'>
                    <p className='type-label text-muted-foreground'>
                        {item.label}
                    </p>
                    <p className='flex items-baseline gap-1.5'>
                        <span
                            className={
                                'type-figure-lead ' +
                                (item.valueClassName ?? 'text-foreground')
                            }>
                            {item.value}
                        </span>
                        {item.sub && (
                            <span
                                className={
                                    item.subClassName ??
                                    'type-caption text-subtle-foreground'
                                }>
                                {item.sub}
                            </span>
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard stat card (UX-DR8): shadcn Card + muted label + numeric value in the
 * `tabular-nums` weight-600 numeric role (UX-DR3). Optional sub-line, icon, and
 * link to the underlying list. Reused by the member + admin dashboards so a stat
 * card is never re-implemented per page (AC1).
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
                <CardTitle className='font-sans text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                    {label}
                </CardTitle>
                {Icon && <Icon className='w-4 h-4 text-subtle-foreground' />}
            </CardHeader>
            <CardContent>
                <p className='text-2xl font-bold tabular-nums text-foreground'>
                    {value}
                </p>
                {sub && (
                    <div className='text-xs text-subtle-foreground mt-1'>{sub}</div>
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
 * Joined stat strip (Club Premium admin): one bordered card, cells divided by
 * hairlines in both directions. Denser than a grid of StatCards — the admin
 * dashboard/list headers use this.
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
                    <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
                        {item.label}
                    </p>
                    <p className='flex items-baseline gap-1.5'>
                        <span
                            className={
                                'text-2xl font-bold tabular-nums ' +
                                (item.valueClassName ?? 'text-foreground')
                            }>
                            {item.value}
                        </span>
                        {item.sub && (
                            <span className={item.subClassName ?? 'text-xs text-subtle-foreground'}>
                                {item.sub}
                            </span>
                        )}
                    </p>
                </div>
            ))}
        </div>
    );
}

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
        <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                    {label}
                </CardTitle>
                {Icon && <Icon className='w-4 h-4 text-muted-foreground' />}
            </CardHeader>
            <CardContent>
                <p className='text-2xl font-bold tabular-nums text-foreground'>
                    {value}
                </p>
                {sub && <div className='text-xs text-muted-foreground mt-1'>{sub}</div>}
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

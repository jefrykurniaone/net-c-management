import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Unpaid-dues banner (UX-DR7): full-width solid `warning` banner stating the
 * outstanding period + a CTA to pay. Copy is passed in so i18n stays in the page
 * (NFR-6). Clears only when paid + confirmed — never on dismiss, so there is no
 * close affordance.
 */
export function UnpaidBanner({
    title,
    description,
    ctaLabel,
    href,
}: Readonly<{
    title: ReactNode;
    description?: ReactNode;
    ctaLabel: ReactNode;
    href: string;
}>) {
    return (
        <div className='bg-warning text-warning-foreground rounded-xl p-4 flex items-center justify-between gap-3'>
            <div>
                <p className='text-sm font-medium'>{title}</p>
                {description && (
                    <p className='text-xs mt-0.5 opacity-90'>{description}</p>
                )}
            </div>
            <Link href={href} className='shrink-0'>
                <Button size='sm' variant='secondary'>
                    {ctaLabel}
                </Button>
            </Link>
        </div>
    );
}

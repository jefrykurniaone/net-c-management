import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Unpaid-dues banner (UX-DR7): soft `warning` surface with an alert icon and a
 * solid warning CTA (Club Premium). Copy is passed in so i18n stays in the page
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
        <div className='bg-warning-soft border border-warning-soft-border rounded-xl px-3.5 py-3 flex items-center gap-3'>
            <AlertTriangle
                aria-hidden
                className='w-[18px] h-[18px] text-warning shrink-0'
            />
            <div className='flex-1 min-w-0'>
                <p className='text-[13px] font-semibold text-warning-soft-foreground'>
                    {title}
                </p>
                {description && (
                    <p className='text-xs mt-0.5 text-warning-soft-foreground/80'>
                        {description}
                    </p>
                )}
            </div>
            <Link href={href} className='shrink-0'>
                <Button
                    size='sm'
                    className='bg-warning-solid text-warning-solid-foreground hover:bg-warning-solid/90'>
                    {ctaLabel}
                </Button>
            </Link>
        </div>
    );
}

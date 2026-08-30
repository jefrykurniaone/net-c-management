'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

/**
 * Shared empty-state (UX-DR17): a card, a neutral chip and one sentence,
 * plus an optional muted icon and action (an admin "create" CTA, a member
 * "join" link). Replaces the per-page inline empties on member surfaces so
 * the pattern is consistent and theme-safe (semantic tokens only). Admin
 * table empties stay `<td colspan>`.
 *
 * The chip is fixed copy ("Empty" / "Kosong") rather than a caller prop: it
 * names the *kind* of state, not the situation, so every call site gets it
 * for free and none has to pass a new prop. It borrows the current `Badge`
 * API directly (#150 does not restyle Badge — that is #149's chip work).
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: Readonly<{
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
}>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);

    return (
        <div className='rounded-xl bg-card py-12 text-center shadow-lift'>
            {Icon && (
                <Icon
                    aria-hidden='true'
                    className='w-10 h-10 text-muted-foreground/50 mx-auto mb-3'
                />
            )}
            <Badge variant='secondary' className='mb-2'>
                {t.common.empty}
            </Badge>
            <p className='type-body text-foreground'>{title}</p>
            {description && (
                <p className='type-caption text-muted-foreground mt-1'>
                    {description}
                </p>
            )}
            {action && <div className='mt-4'>{action}</div>}
        </div>
    );
}

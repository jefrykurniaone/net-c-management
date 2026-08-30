import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Shared empty-state (UX-DR17): a card, an optional neutral chip and one
 * sentence, plus an optional muted icon and action (an admin "create" CTA, a
 * member "join" link). Replaces the per-page inline empties on member
 * surfaces so the pattern is consistent and theme-safe (semantic tokens
 * only). Admin table empties stay `<td colspan>`.
 *
 * No directive on purpose: this file is consumed from both a Server
 * Component (`dashboard/page.tsx`, `payments/page.tsx`) and a Client
 * Component (`sessions/[id]/pay/page.tsx`), each passing a `LucideIcon`
 * reference as `icon`. Lucide's icon modules carry no `'use client'` of
 * their own, so a function reference passed as a prop across an RSC
 * boundary throws ("Functions cannot be passed directly to Client
 * Components"). Marking this component `'use client'` to read the locale
 * for the chip's copy is exactly what opens that boundary and crashes the
 * two empty states this ticket touched — see `stat-card.tsx`'s `icon` for
 * the same undirected precedent this file now follows.
 *
 * `chipLabel` is optional and caller-supplied rather than fixed copy the
 * component sources itself: the string still has to come from
 * `getDictionary()`, and doing that here would need the very locale read
 * that breaks the Server Component call sites. A caller that already has
 * its dictionary in scope (all three today do) passes
 * `chipLabel={t.common.empty}`; a caller that omits it gets the card and
 * the sentence with no chip, which is not a regression — no call site
 * rendered a chip before this ticket.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    chipLabel,
}: Readonly<{
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    chipLabel?: ReactNode;
}>) {
    return (
        <div className='rounded-xl bg-card py-12 text-center shadow-lift'>
            {Icon && (
                <Icon
                    aria-hidden='true'
                    className='w-10 h-10 text-muted-foreground/50 mx-auto mb-3'
                />
            )}
            {chipLabel && (
                <Badge variant='secondary' className='mb-2'>
                    {chipLabel}
                </Badge>
            )}
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

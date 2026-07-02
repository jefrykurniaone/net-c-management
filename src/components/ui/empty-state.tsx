import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared empty-state (UX-DR17): centered card shell + muted icon + message +
 * optional action (e.g. an admin "create" CTA or a member "join" link). Replaces
 * the per-page inline empties on member surfaces so the pattern is consistent and
 * dark-mode-safe (semantic tokens only). Admin table empties stay `<td colspan>`.
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
    return (
        <div className='text-center py-12 bg-card rounded-xl border border-border'>
            {Icon && (
                <Icon className='w-10 h-10 text-muted-foreground/50 mx-auto mb-3' />
            )}
            <p className='text-sm text-muted-foreground'>{title}</p>
            {description && (
                <p className='text-xs text-muted-foreground/80 mt-1'>{description}</p>
            )}
            {action && <div className='mt-4'>{action}</div>}
        </div>
    );
}

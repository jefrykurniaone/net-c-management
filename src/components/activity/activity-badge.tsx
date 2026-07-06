import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Theme-reactive tint styles for a runtime activity hex (Club Premium chips):
 * soft tinted background over the card surface and a text color pulled toward
 * the theme foreground, so one inline style works in both light and dark mode.
 * Tailwind can't JIT a runtime DB color, so the chip tints via inline style.
 */
export function activityTintStyle(color: string): CSSProperties {
    return {
        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--card))`,
        color: `color-mix(in oklab, ${color} 55%, var(--foreground))`,
    };
}

export function ActivityDot({
    color,
    className,
}: Readonly<{ color: string; className?: string }>) {
    return (
        <span
            aria-hidden
            className={cn('inline-block size-2 rounded-full shrink-0', className)}
            style={{ backgroundColor: color }}
        />
    );
}

export function ActivityBadge({
    name,
    color,
    className,
}: Readonly<{
    name: string;
    color: string;
    icon?: string | null;
    className?: string;
}>) {
    return (
        <Badge
            className={cn('border-transparent gap-1.5', className)}
            style={activityTintStyle(color)}>
            <ActivityDot color={color} className='size-[7px]' />
            {name}
        </Badge>
    );
}

/** Square initial mark in the activity tint — list rows and activity cards. */
export function ActivityInitial({
    name,
    color,
    className,
}: Readonly<{ name: string; color: string; className?: string }>) {
    return (
        <span
            aria-hidden
            className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-xs font-bold',
                className,
            )}
            style={activityTintStyle(color)}>
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

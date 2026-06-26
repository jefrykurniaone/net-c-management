import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const HEX_LENGTH = 6;
const LUMINANCE_THRESHOLD = 0.6;
const RED_WEIGHT = 0.299;
const GREEN_WEIGHT = 0.587;
const BLUE_WEIGHT = 0.114;
const MAX_CHANNEL = 255;

/**
 * Pick a readable text color (black/white) for a given hex background.
 * Tailwind can't JIT dynamic DB colors, so the badge uses an inline style.
 */
function readableText(hex: string): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== HEX_LENGTH) return '#ffffff';
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    const luminance =
        (RED_WEIGHT * r + GREEN_WEIGHT * g + BLUE_WEIGHT * b) / MAX_CHANNEL;
    return luminance > LUMINANCE_THRESHOLD ? '#1f2937' : '#ffffff';
}

export function EkskulBadge({
    name,
    color,
    className,
}: Readonly<{ name: string; color: string; className?: string }>) {
    return (
        <Badge
            className={cn('border-transparent', className)}
            style={{ backgroundColor: color, color: readableText(color) }}>
            {name}
        </Badge>
    );
}

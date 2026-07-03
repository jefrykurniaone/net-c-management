import { createElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Shapes,
    Music,
    Dumbbell,
    Trophy,
    Volleyball,
    Bike,
    Palette,
    BookOpen,
    Mic,
    Camera,
    Gamepad2,
    Waves,
    Guitar,
    Drama,
    Footprints,
    Tent,
    Medal,
    Swords,
    Activity,
    type LucideIcon,
} from 'lucide-react';

// ─── Activity icon resolution ────────────────────────────────────────────────
// `Activity.icon` is an optional lucide icon name. It is resolved against a small
// curated, statically-imported map — no `lucide-react/dynamic` and no whole-icon
// barrel import — so this stays a server component and the bundle stays lean. An
// unset/unknown name falls back to a neutral icon (the same `Shapes` glyph the
// nav uses for "Activity"), so the chip is ALWAYS present (UX-DR4).
const DEFAULT_ACTIVITY_ICON: LucideIcon = Shapes;

const ACTIVITY_ICONS: Readonly<Record<string, LucideIcon>> = {
    shapes: Shapes,
    music: Music,
    dumbbell: Dumbbell,
    trophy: Trophy,
    volleyball: Volleyball,
    bike: Bike,
    palette: Palette,
    bookopen: BookOpen,
    mic: Mic,
    camera: Camera,
    gamepad2: Gamepad2,
    waves: Waves,
    guitar: Guitar,
    drama: Drama,
    footprints: Footprints,
    tent: Tent,
    medal: Medal,
    swords: Swords,
    activity: Activity,
};

function resolveActivityIcon(icon: string | null | undefined): LucideIcon {
    if (!icon) return DEFAULT_ACTIVITY_ICON;
    const key = icon.toLowerCase().replace(/[^a-z0-9]/g, '');
    return ACTIVITY_ICONS[key] ?? DEFAULT_ACTIVITY_ICON;
}

// ─── WCAG 2.2 contrast ────────────────────────────────────────────────────────
// Tailwind can't JIT a runtime DB color, so the badge tints via inline style and
// must pick its own readable foreground. The choice between near-black and white
// uses the true WCAG 2.2 relative-luminance contrast ratio (sRGB-linearized),
// not a perceived-brightness shortcut — whichever foreground scores higher wins.
const HEX_LENGTH = 6;
const SHORT_HEX_LENGTH = 3;
const MAX_CHANNEL = 255;
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA_EXPONENT = 2.4;
const LUMINANCE_R = 0.2126;
const LUMINANCE_G = 0.7152;
const LUMINANCE_B = 0.0722;
const CONTRAST_OFFSET = 0.05;

const FOREGROUND_LIGHT = '#ffffff';
const FOREGROUND_DARK = '#1f2937'; // gray-800

interface Rgb {
    r: number;
    g: number;
    b: number;
}

function parseHex(hex: string): Rgb | null {
    let normalized = hex.replace('#', '');
    // Expand a 3-digit shorthand (e.g. #fff) to its 6-digit form so the readable
    // foreground calc works instead of falling back to an unreadable white.
    if (normalized.length === SHORT_HEX_LENGTH) {
        normalized = normalized
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (normalized.length !== HEX_LENGTH) return null;
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
}

function linearizeChannel(channel: number): number {
    const c = channel / MAX_CHANNEL;
    if (c <= SRGB_LINEAR_THRESHOLD) return c / SRGB_LINEAR_DIVISOR;
    return ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_EXPONENT;
}

function relativeLuminance({ r, g, b }: Rgb): number {
    return (
        LUMINANCE_R * linearizeChannel(r) +
        LUMINANCE_G * linearizeChannel(g) +
        LUMINANCE_B * linearizeChannel(b)
    );
}

function contrastRatio(lumA: number, lumB: number): number {
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
}

const LIGHT_LUMINANCE = relativeLuminance({ r: 255, g: 255, b: 255 });
const DARK_LUMINANCE = relativeLuminance({ r: 31, g: 41, b: 55 });

/**
 * Pick the higher-contrast text color (near-black or white) for a hex background
 * using the WCAG 2.2 relative-luminance contrast ratio. Falls back to white for a
 * malformed hex so the badge never crashes or renders an unreadable foreground.
 */
function readableText(hex: string): string {
    const rgb = parseHex(hex);
    if (!rgb) return FOREGROUND_LIGHT;
    const bgLuminance = relativeLuminance(rgb);
    const lightRatio = contrastRatio(bgLuminance, LIGHT_LUMINANCE);
    const darkRatio = contrastRatio(bgLuminance, DARK_LUMINANCE);
    return darkRatio > lightRatio ? FOREGROUND_DARK : FOREGROUND_LIGHT;
}

export function ActivityBadge({
    name,
    color,
    icon,
    className,
}: Readonly<{
    name: string;
    color: string;
    icon?: string | null;
    className?: string;
}>) {
    return (
        <Badge
            className={cn('border-transparent', className)}
            style={{ backgroundColor: color, color: readableText(color) }}>
            {createElement(resolveActivityIcon(icon), { 'aria-hidden': true })}
            {name}
        </Badge>
    );
}

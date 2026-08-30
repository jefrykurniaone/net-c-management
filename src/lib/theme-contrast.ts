/**
 * The Rally palette as data: how the committed tokens are read back out of
 * the stylesheet, and every pair the product can put on screen with the
 * ratio it has to clear.
 *
 * The point of parsing `src/app/styles/board-materials.css` rather than
 * keeping a second copy of the hex values here is that there is then exactly
 * one source of truth. A token nudged in the stylesheet fails on a number in
 * `src/lib/__tests__/design-tokens.test.ts`, not on somebody's opinion of
 * whether it still looks all right — which is what DESIGN.md's contrast table
 * is worth nothing without.
 */

/** WCAG 2.1, "relative luminance" — the sRGB piecewise transfer function. */
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_SCALE = 1.055;
const SRGB_GAMMA_EXPONENT = 2.4;
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;

/** WCAG 2.1, "contrast ratio" — (L1 + 0.05) / (L2 + 0.05). */
const CONTRAST_OFFSET = 0.05;

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const CHANNEL_DIGITS = 2;
const CHANNEL_OFFSETS = [0, 2, 4] as const;
const RATIO_DECIMALS = 2;

/** WCAG 2.1 AA: 1.4.3 for text, 1.4.11 for a control boundary or state. */
export const AA_TEXT = 4.5;
export const AA_UI = 3;

export type ThemeName = 'light' | 'dark';
export type TokenMap = Readonly<Record<string, string>>;
export type ThemeTokens = Readonly<Record<ThemeName, TokenMap>>;

export interface ContrastPair {
    /** Token name of the ink, the rule or the ring. */
    readonly fg: string;
    /** Token name of the surface it lands on. */
    readonly bg: string;
    readonly min: number;
    readonly note: string;
}

export interface RecordedPair {
    readonly fg: string;
    readonly bg: string;
    /** Why this pair is measured and reported but not asserted. */
    readonly reason: string;
}

function channelLuminance(value: number): number {
    const c = value / CHANNEL_MAX;
    if (c <= SRGB_LINEAR_THRESHOLD) {
        return c / SRGB_LINEAR_DIVISOR;
    }
    return ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA_EXPONENT;
}

/** `#RRGGBB` to its three 0–255 channels. */
export function hexChannels(hex: string): readonly number[] {
    const body = hex.replace('#', '');
    return CHANNEL_OFFSETS.map((offset) =>
        parseInt(body.slice(offset, offset + CHANNEL_DIGITS), HEX_RADIX),
    );
}

export function relativeLuminance(hex: string): number {
    const [red, green, blue] = hexChannels(hex).map(channelLuminance);
    return LUMA_RED * red + LUMA_GREEN * green + LUMA_BLUE * blue;
}

/** The WCAG contrast ratio between two `#RRGGBB` colours, rounded to 2dp. */
export function contrastRatio(a: string, b: string): number {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
        (x, y) => y - x,
    );
    const raw =
        (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
    const scale = 10 ** RATIO_DECIMALS;
    return Math.round(raw * scale) / scale;
}

const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const DECLARATION_PATTERN = /--([a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g;

function blockBody(css: string, selector: string): string {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) {
        throw new Error(`No \`${selector}\` block in the token stylesheet.`);
    }
    const end = css.indexOf('}', start);
    if (end === -1) {
        throw new Error(`Unterminated \`${selector}\` block.`);
    }
    return css.slice(start, end);
}

function declarationsIn(body: string): Record<string, string> {
    const found: Record<string, string> = {};
    for (const [, name, value] of body.matchAll(DECLARATION_PATTERN)) {
        found[name] = value.toUpperCase();
    }
    return found;
}

/**
 * Both themes' hex tokens, read out of the token stylesheet. Comments are
 * stripped first: the file documents its own palette in prose, hex values and
 * all, and those are not declarations.
 *
 * `.dark` overrides `:root` rather than replacing it, which is what the
 * cascade does, so a token the dark theme does not restate keeps its light
 * value here too.
 */
export function parseThemeTokens(css: string): ThemeTokens {
    const clean = css.replace(COMMENT_PATTERN, '');
    const light = declarationsIn(blockBody(clean, ':root'));
    const dark = declarationsIn(blockBody(clean, '.dark'));
    return { light, dark: { ...light, ...dark } };
}

const textPair = (fg: string, bg: string, note: string): ContrastPair => ({
    fg,
    bg,
    min: AA_TEXT,
    note,
});

const uiPair = (fg: string, bg: string, note: string): ContrastPair => ({
    fg,
    bg,
    min: AA_UI,
    note,
});

/**
 * Every pair the shipped surfaces can produce, in both themes.
 *
 * Derived from a sweep of the `text-*` / `bg-*` / `border-*` / `ring-*`
 * utilities in `src/`, not from the shape of the token file: a pair is here
 * because some component puts those two colours together, and the ones that
 * only look plausible are absent.
 */
export const AA_PAIRS: readonly ContrastPair[] = [
    textPair('foreground', 'background', 'body ink on the page ground'),
    textPair('foreground', 'card', 'body ink on a card'),
    textPair('card-foreground', 'card', 'card ink on a card'),
    textPair('popover-foreground', 'popover', 'menu and dialog ink'),
    textPair('foreground', 'muted', 'ink on a muted fill'),
    textPair('foreground', 'secondary', 'ink on a secondary fill'),
    textPair('secondary-foreground', 'background', 'supporting ink on the ground'),
    textPair('secondary-foreground', 'card', 'supporting ink on a card'),
    textPair('secondary-foreground', 'secondary', 'secondary button label'),
    textPair('muted-foreground', 'background', 'muted ink on the ground'),
    textPair('muted-foreground', 'card', 'muted ink on a card'),
    textPair('muted-foreground', 'muted', 'neutral chip, avatar fallback, tab list'),
    textPair('muted-foreground', 'popover', 'menu label and shortcut'),
    textPair('subtle-foreground', 'background', 'quiet ink on the ground'),
    textPair('subtle-foreground', 'card', 'quiet ink on a card'),
    textPair('accent-foreground', 'accent', 'active navigation, menu focus'),
    textPair('foreground', 'accent', 'selected option label'),
    textPair('primary', 'accent', 'link on an accent hover'),
    textPair('primary', 'background', 'link on the ground'),
    textPair('primary', 'card', 'link on a card'),
    textPair('primary', 'primary-soft', 'info chip, link on its own wash'),
    textPair('primary-foreground', 'primary', 'checkbox tick, avatar badge'),
    textPair('primary-solid-foreground', 'primary-solid', 'the primary action'),
    textPair('success', 'background', 'settled ink on the ground'),
    textPair('success', 'card', 'settled ink on a card'),
    textPair('success-foreground', 'success', 'ink on a settled fill'),
    textPair('success-soft-foreground', 'success-soft', 'settled chip'),
    textPair('warning', 'background', 'provisional ink on the ground'),
    textPair('warning', 'card', 'provisional ink on a card'),
    textPair('warning-foreground', 'warning', 'count badge on a provisional fill'),
    textPair('warning-solid-foreground', 'warning-solid', 'dues-banner action'),
    textPair('warning-soft-foreground', 'warning-soft', 'provisional chip'),
    textPair('destructive', 'background', 'void ink on the ground'),
    textPair('destructive', 'card', 'void ink on a card'),
    textPair('destructive', 'destructive-soft', 'void chip'),
    textPair('destructive-foreground', 'destructive', 'ink on a void fill'),
    textPair('destructive-solid-foreground', 'destructive-solid', 'destructive action'),
    textPair('muted-foreground', 'destructive-soft', 'the value beside a void chip'),
    uiPair('border', 'background', 'rule and input edge on the ground'),
    uiPair('border', 'card', 'rule and input edge on a card'),
    uiPair('border', 'muted', 'neutral chip edge, rule on a muted fill'),
    uiPair('border', 'accent', 'rule on an accent fill'),
    uiPair('border', 'primary-soft', 'rule on the link wash'),
    uiPair('border', 'success-soft', 'rule on the settled wash'),
    uiPair('border', 'warning-soft', 'rule on the provisional wash'),
    uiPair('border', 'destructive-soft', 'rule on the void wash'),
    uiPair('ring', 'background', 'focus ring on the ground'),
    uiPair('ring', 'card', 'focus ring on a card'),
    uiPair('primary-soft-border', 'primary-soft', 'info chip edge, link wash edge'),
    uiPair('primary-soft-border', 'card', 'link wash edge on a card'),
    uiPair('success-soft-border', 'success-soft', 'settled chip edge'),
    uiPair('warning-soft-border', 'warning-soft', 'provisional chip edge'),
    uiPair('destructive-soft-border', 'destructive-soft', 'void chip edge'),
    uiPair('destructive-soft-border', 'card', 'destructive outline button edge'),
];

/**
 * Measured and published, deliberately not asserted. None of the three is a
 * WCAG pairing: 1.4.11 asks that a control and its state be identifiable, and
 * each of these is identified by something the assertions above already cover
 * — the card by its `--border` and its shadow, the action by an 8.74:1 label
 * and its shadow, the accent fill by the 3:1 rule that can be drawn on it and
 * by the weight the navigation sets. Darkening PBP Green until the *fill*
 * cleared 3:1 on white would land back on the court green Rally retired.
 */
export const RECORDED_PAIRS: readonly RecordedPair[] = [
    {
        fg: 'card',
        bg: 'background',
        reason: 'tonal step; the card is bounded by --border and --shadow-lift',
    },
    {
        fg: 'primary-solid',
        bg: 'card',
        reason: 'action fill; the control is identified by its label and shadow',
    },
    {
        fg: 'accent',
        bg: 'background',
        reason: 'highlight fill; a hue step, bounded by --border where drawn',
    },
];

/** Every token name either table names, for an existence check. */
export function referencedTokens(): readonly string[] {
    const names = new Set<string>();
    for (const { fg, bg } of AA_PAIRS) {
        names.add(fg);
        names.add(bg);
    }
    for (const { fg, bg } of RECORDED_PAIRS) {
        names.add(fg);
        names.add(bg);
    }
    return [...names];
}

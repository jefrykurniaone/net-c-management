/**
 * Shared contract for the four decorative pattern primitives (#151). None of
 * them carries information, so their only inputs are a size and a colour from
 * the Rally token layer (`src/app/styles/colors.css`) — never a hardcoded hex.
 * `PatternColorToken` is a closed union rather than `string` on purpose: a
 * pattern is decoration behind content, so it may only draw from tokens this app
 * already measured for contrast.
 */

export type PatternColorToken =
    | 'border'
    | 'muted-foreground'
    | 'accent'
    | 'primary'
    | 'success'
    | 'warning'
    | 'destructive';

/** Square footprint most patterns render at when a caller does not size them. */
export const DEFAULT_PATTERN_SIZE_PX = 240;

/**
 * Fixed low opacity so a pattern never competes with the content in front of
 * it. Chosen so that even where a pattern's line sits directly behind a
 * headline glyph, the blended ground still clears the 4.5:1 text floor in
 * `src/lib/theme-contrast.ts` by a wide margin (measured ~12.3:1 against a
 * ~14.2:1 baseline in both themes for the grid pattern behind the hero
 * headline).
 */
export const PATTERN_OPACITY = 0.14;

export interface PatternProps {
    /** Footprint in pixels. Meaning is per-pattern: see each component's doc. */
    readonly size?: number;
    /** Token the pattern's lines resolve their colour from. Defaults to `border`. */
    readonly colorToken?: PatternColorToken;
    readonly className?: string;
}

/** A pattern's colour prop resolved to the CSS custom property it names. */
export function resolvePatternColor(token: PatternColorToken): string {
    return `var(--${token})`;
}

/** Shared attributes every pattern primitive renders with, spread onto its root node. */
export const PATTERN_ROOT_ATTRIBUTES = {
    'aria-hidden': 'true',
} as const;

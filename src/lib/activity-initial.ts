/**
 * The Activity's livery is a magnet tile bearing its initial — no colour.
 * Deriving that initial is where the edge cases live: a name may be blank,
 * may start outside the Latin alphabet, and may upper-case into more
 * characters than it started with (German ß becomes SS). This module is the
 * one place that reasoning lives, so the tile itself stays presentational.
 */

/** Shown when an Activity has no usable name, so a tile is never empty. */
export const ACTIVITY_INITIAL_PLACEHOLDER = '?';

/**
 * Lazily built: constructing a Segmenter is not free, and it is only needed
 * on runtimes that have one. Node 18+ and every current browser do.
 */
let segmenter: Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter | null {
    if (typeof Intl.Segmenter !== 'function') return null;
    segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return segmenter;
}

/**
 * First user-perceived character — a grapheme cluster, so a letter keeps its
 * combining marks and an astral character is never split into a lone
 * surrogate. Falls back to code-point iteration where Intl.Segmenter is absent.
 */
function firstGrapheme(value: string): string {
    const active = getSegmenter();
    if (active === null) return Array.from(value)[0] ?? '';
    for (const { segment } of active.segment(value)) return segment;
    return '';
}

/**
 * The single character an Activity's magnet tile carries. Locale-aware casing
 * keeps Turkish dotted i correct; scripts without case (Han, Arabic) pass
 * through untouched.
 */
export function activityInitial(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) return ACTIVITY_INITIAL_PLACEHOLDER;

    const upper = firstGrapheme(trimmed).toLocaleUpperCase();
    const initial = firstGrapheme(upper);
    return initial.length === 0 ? ACTIVITY_INITIAL_PLACEHOLDER : initial;
}

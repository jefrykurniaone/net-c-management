import {
    DEFAULT_PATTERN_SIZE_PX,
    PATTERN_OPACITY,
    PATTERN_ROOT_ATTRIBUTES,
    resolvePatternColor,
    type PatternProps,
} from './pattern-tokens';

/** Spacing between grid lines, in pixels. */
const GRID_PITCH_PX = 32;
/** Line thickness, in pixels — thin by design, never a boundary. */
const GRID_LINE_WIDTH_PX = 1;

/** The stretched footprint: whatever box the positioned ancestor gives it. */
const FILL_EXTENT = '100%';

export type GridPatternProps = Readonly<
    PatternProps & {
        /**
         * Fill the nearest positioned ancestor instead of drawing a fixed
         * `size` square, for a band-sized backdrop such as the public hero's.
         *
         * It is a prop rather than a caller's class because the footprint is
         * an inline style here — this pattern is a `div` with a background
         * image, not an SVG with overridable `width`/`height` attributes — so
         * a class cannot reach it without `!important`. The pitch is
         * unchanged either way, so the lattice tiles across whatever box it
         * gets. `PATTERN_OPACITY` stays fixed and stays not a prop.
         */
        isStretched?: boolean;
    }
>;

/**
 * Thin grid lines behind content. `size` is the square footprint in pixels;
 * the lines repeat at `GRID_PITCH_PX` inside it, so the pattern tiles cleanly
 * when the caller sizes it larger than one pitch. `isStretched` replaces that
 * square with the ancestor's own box.
 *
 * Rendered as a CSS background rather than SVG: a repeating two-axis
 * gradient is the cheapest way to draw a lattice of hairlines, and there is
 * no geometry here an SVG would express more simply.
 */
export function GridPattern({
    size = DEFAULT_PATTERN_SIZE_PX,
    colorToken = 'border',
    className,
    isStretched = false,
}: GridPatternProps) {
    const color = resolvePatternColor(colorToken);
    const backgroundImage = [
        `linear-gradient(to right, ${color} ${GRID_LINE_WIDTH_PX}px, transparent ${GRID_LINE_WIDTH_PX}px)`,
        `linear-gradient(to bottom, ${color} ${GRID_LINE_WIDTH_PX}px, transparent ${GRID_LINE_WIDTH_PX}px)`,
    ].join(', ');
    const extent = isStretched ? FILL_EXTENT : size;

    return (
        <div
            {...PATTERN_ROOT_ATTRIBUTES}
            className={`pointer-events-none select-none ${className ?? ''}`}
            style={{
                width: extent,
                height: extent,
                backgroundImage,
                backgroundSize: `${GRID_PITCH_PX}px ${GRID_PITCH_PX}px`,
                opacity: PATTERN_OPACITY,
            }}
        />
    );
}

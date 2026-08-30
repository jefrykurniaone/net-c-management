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

/**
 * Thin grid lines behind content. `size` is the square footprint in pixels;
 * the lines repeat at `GRID_PITCH_PX` inside it, so the pattern tiles cleanly
 * when the caller sizes it larger than one pitch.
 *
 * Rendered as a CSS background rather than SVG: a repeating two-axis
 * gradient is the cheapest way to draw a lattice of hairlines, and there is
 * no geometry here an SVG would express more simply.
 */
export function GridPattern({
    size = DEFAULT_PATTERN_SIZE_PX,
    colorToken = 'border',
    className,
}: Readonly<PatternProps>) {
    const color = resolvePatternColor(colorToken);
    const backgroundImage = [
        `linear-gradient(to right, ${color} ${GRID_LINE_WIDTH_PX}px, transparent ${GRID_LINE_WIDTH_PX}px)`,
        `linear-gradient(to bottom, ${color} ${GRID_LINE_WIDTH_PX}px, transparent ${GRID_LINE_WIDTH_PX}px)`,
    ].join(', ');

    return (
        <div
            {...PATTERN_ROOT_ATTRIBUTES}
            className={`pointer-events-none select-none ${className ?? ''}`}
            style={{
                width: size,
                height: size,
                backgroundImage,
                backgroundSize: `${GRID_PITCH_PX}px ${GRID_PITCH_PX}px`,
                opacity: PATTERN_OPACITY,
            }}
        />
    );
}

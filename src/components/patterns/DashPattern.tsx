import {
    DEFAULT_PATTERN_SIZE_PX,
    PATTERN_OPACITY,
    PATTERN_ROOT_ATTRIBUTES,
    resolvePatternColor,
    type PatternProps,
} from './pattern-tokens';

/** How many diagonal dashed lines to draw across the square footprint. */
const DASH_LINE_COUNT = 6;
/** Horizontal spacing between the parallel diagonal lines, in pixels. */
const DASH_LINE_GAP_PX = 20;
/** Line thickness, in pixels. */
const DASH_STROKE_WIDTH_PX = 1;
/** Dash length and gap, in pixels, as an SVG `stroke-dasharray`. */
const DASH_LENGTH_PX = 4;
const DASH_GAP_PX = 4;

/**
 * Diagonal dashed lines behind content. `size` is the square SVG viewport in
 * pixels; each line runs bottom-left to top-right at 45 degrees, offset from
 * its neighbour by `DASH_LINE_GAP_PX` so the set reads as one repeating
 * diagonal texture rather than isolated strokes.
 */
export function DashPattern({
    size = DEFAULT_PATTERN_SIZE_PX,
    colorToken = 'border',
    className,
}: Readonly<PatternProps>) {
    const color = resolvePatternColor(colorToken);
    const offsets = Array.from({ length: DASH_LINE_COUNT }, (_, index) => index * DASH_LINE_GAP_PX);

    return (
        <svg
            {...PATTERN_ROOT_ATTRIBUTES}
            className={`pointer-events-none select-none ${className ?? ''}`}
            width={size}
            height={size}
            style={{ opacity: PATTERN_OPACITY }}>
            {offsets.map((offset) => (
                <line
                    key={offset}
                    x1={offset - size}
                    y1={size}
                    x2={offset}
                    y2={0}
                    stroke={color}
                    strokeWidth={DASH_STROKE_WIDTH_PX}
                    strokeDasharray={`${DASH_LENGTH_PX} ${DASH_GAP_PX}`}
                />
            ))}
        </svg>
    );
}

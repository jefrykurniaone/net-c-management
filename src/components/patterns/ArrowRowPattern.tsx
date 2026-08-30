import {
    PATTERN_OPACITY,
    PATTERN_ROOT_ATTRIBUTES,
    resolvePatternColor,
    type PatternProps,
} from './pattern-tokens';

/** How many arrows sit in the row. */
const ARROW_COUNT = 5;
/** Each arrow's footprint (width and height), in pixels. */
const ARROW_SIZE_PX = 16;
/** Horizontal gap between arrows, in pixels. */
const ARROW_GAP_PX = 12;
/** Line thickness, in pixels. */
const ARROW_STROKE_WIDTH_PX = 1;
/** The row's own footprint, ignoring a caller-supplied `size`. */
const ROW_WIDTH_PX = ARROW_COUNT * (ARROW_SIZE_PX + ARROW_GAP_PX);

/**
 * A row of thin chevron arrows behind content. Unlike the other three
 * patterns, `size` names the row's total width in pixels rather than a
 * square footprint — the shape is inherently wide and short — and defaults
 * to fitting exactly `ARROW_COUNT` arrows.
 */
export function ArrowRowPattern({
    size = ROW_WIDTH_PX,
    colorToken = 'border',
    className,
}: Readonly<PatternProps>) {
    const color = resolvePatternColor(colorToken);
    const positions = Array.from({ length: ARROW_COUNT }, (_, index) => index * (ARROW_SIZE_PX + ARROW_GAP_PX));

    return (
        <svg
            {...PATTERN_ROOT_ATTRIBUTES}
            className={`pointer-events-none select-none ${className ?? ''}`}
            width={size}
            height={ARROW_SIZE_PX}
            style={{ opacity: PATTERN_OPACITY }}>
            {positions.map((x) => (
                <polyline
                    key={x}
                    points={`${x},${ARROW_SIZE_PX} ${x + ARROW_SIZE_PX / 2},0 ${x + ARROW_SIZE_PX},${ARROW_SIZE_PX}`}
                    fill='none'
                    stroke={color}
                    strokeWidth={ARROW_STROKE_WIDTH_PX}
                />
            ))}
        </svg>
    );
}

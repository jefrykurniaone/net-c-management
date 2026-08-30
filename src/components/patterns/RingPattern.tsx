import {
    DEFAULT_PATTERN_SIZE_PX,
    PATTERN_OPACITY,
    PATTERN_ROOT_ATTRIBUTES,
    resolvePatternColor,
    type PatternProps,
} from './pattern-tokens';

/** How many concentric rings to draw. */
const RING_COUNT = 4;
/** Radial spacing between rings, in pixels. */
const RING_GAP_PX = 18;
/** Ring line thickness, in pixels. */
const RING_STROKE_WIDTH_PX = 1;

/**
 * Concentric rings behind content — the reference's ball outlines replaced
 * with plain rings, per the spec's "no sport-specific shape" rule. `size` is
 * the square SVG viewport in pixels; rings nest inward from it at
 * `RING_GAP_PX` until they run out of room.
 */
export function RingPattern({
    size = DEFAULT_PATTERN_SIZE_PX,
    colorToken = 'border',
    className,
}: Readonly<PatternProps>) {
    const color = resolvePatternColor(colorToken);
    const center = size / 2;
    const radii = Array.from({ length: RING_COUNT }, (_, index) => center - index * RING_GAP_PX).filter(
        (radius) => radius > RING_STROKE_WIDTH_PX,
    );

    return (
        <svg
            {...PATTERN_ROOT_ATTRIBUTES}
            className={`pointer-events-none select-none ${className ?? ''}`}
            width={size}
            height={size}
            style={{ opacity: PATTERN_OPACITY }}>
            {radii.map((radius) => (
                <circle
                    key={radius}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill='none'
                    stroke={color}
                    strokeWidth={RING_STROKE_WIDTH_PX}
                />
            ))}
        </svg>
    );
}

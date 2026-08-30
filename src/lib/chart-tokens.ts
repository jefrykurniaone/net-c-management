/**
 * Rally chart series colours (DESIGN.md, Colours; tokens landed by #148).
 * `board-materials.css` defines `--chart-1` through `--chart-5` for both
 * themes, and `globals.css`'s `@theme inline` block re-exposes them as
 * Tailwind's `--color-chart-*`. A chart component names one of these five
 * instead of a hex, so both themes stay correct without a component ever
 * knowing a colour value.
 */
export const CHART_COLORS = [
    'var(--color-chart-1)', // PBP Green
    'var(--color-chart-2)', // Purple
    'var(--color-chart-3)', // Orange
    'var(--color-chart-4)', // Dark Red
    'var(--color-chart-5)', // Black Green (light theme) / Lime (dark theme)
] as const;

/** The Nth chart colour, cycling back to the first past the fifth series. */
export function chartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
}

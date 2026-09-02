'use client';

import type { ComponentProps } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartFigure } from '@/components/charts/chart-figure';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { chartColor } from '@/lib/chart-tokens';
import type { SeatsFilledChartView } from '@/lib/seats-filled-view';

/**
 * Seats held over capacity, eight weeks of one line (#171).
 *
 * Draws only. Every figure and every string arrives finished in
 * {@link SeatsFilledChartView} — this component never sees a Session, an
 * Attendance row or the dictionary, so a wrong number is a resolver test's
 * failure rather than something an Admin finds. It composes onto #169's
 * {@link ChartFigure}, which carries the title, the caption and the text list
 * of the same figures; a series is never drawn straight onto the page ground,
 * where the chart colours do not clear 3:1 (DESIGN.md, Chart series).
 *
 * **A week with no Sessions is drawn as a gap.** The resolver answers `null`
 * for it, and `connectNulls` is pinned `false` — Recharts' own default, pinned
 * rather than assumed, because the whole point of the point is that it is
 * missing. Bridging the gap would draw a line through a week that never
 * happened, and interpolate a fill rate for it. Dots stay on, so a single week
 * between two quiet ones is still visible with no segment to sit on.
 *
 * **The line is straight between weeks, not curved.** A week is a discrete
 * measurement; a spline would invent a Tuesday value between two Mondays.
 *
 * **Purple, not the green beside it.** `--chart-2` clears 5.34:1 light and
 * 6.80:1 dark against the card — a one-pixel stroke has the least area of any
 * mark to carry its contrast, so it takes one of the stronger pairs — and it is
 * neither the green the Dues chart spends on collected money nor the
 * Orange-to-Dark-Red the donut spends on Activities, so nothing on this
 * dashboard reads as the same series twice.
 *
 * Motion: Recharts 3.8 defaults `isAnimationActive` to `'auto'`, which respects
 * `prefers-reduced-motion` and disables the draw-in during SSR. Left at the
 * default rather than pinned, so the honouring cannot be switched off by
 * accident.
 */

/** Purple. See the note above for why this series is not the palette's first. */
const FILL_COLOR = chartColor(1);

const Y_AXIS_WIDTH = 44;
const TICK_MARGIN = 8;
const LINE_WIDTH = 2;
const DOT_RADIUS = 3;
const ACTIVE_DOT_RADIUS = 5;

type TooltipItemFormatter = NonNullable<
    ComponentProps<typeof ChartTooltipContent>['formatter']
>;

/**
 * The tooltip row. Written here rather than left to the default for two
 * reasons: the default prints a bare number where this series is a percentage,
 * and it would render a gap as an empty row instead of saying no Sessions ran.
 * Both readings come off the point's own `display`, which the view finished, so
 * the tooltip cannot phrase a figure differently from the text list.
 */
const formatPercentRow: TooltipItemFormatter = (_value, name, item) => (
    <div className='flex w-full items-center gap-2'>
        <span
            aria-hidden='true'
            className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
            style={{ backgroundColor: item.color }}
        />
        <span className='text-muted-foreground'>{name}</span>
        <span className='ml-auto font-mono font-medium text-foreground tabular-nums'>
            {item.payload?.display ?? ''}
        </span>
    </div>
);

export function SeatsFilledChart({
    view,
}: Readonly<{ view: SeatsFilledChartView }>) {
    const config = {
        percent: { label: view.seriesLabel, color: FILL_COLOR },
    } satisfies ChartConfig;

    return (
        <ChartFigure
            title={view.title}
            caption={view.caption}
            values={view.values}
            valuesToggleLabel={view.valuesToggleLabel}
            valuesListLabel={view.valuesListLabel}
            emptyChipLabel={view.emptyChipLabel}
            emptyMessage={view.emptyMessage}>
            <ChartContainer
                config={config}
                className='aspect-auto h-56 w-full rounded-md focus-within:ring-2 focus-within:ring-ring'>
                <LineChart accessibilityLayer data={[...view.dots]}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey='label'
                        tickLine={false}
                        axisLine={false}
                        tickMargin={TICK_MARGIN}
                        // Eight dated ticks do not fit 390px. The first and the
                        // last are the window, so they are kept and the middle
                        // thins out; the text list carries all eight regardless.
                        interval='preserveStartEnd'
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={Y_AXIS_WIDTH}
                        tickMargin={TICK_MARGIN}
                        domain={[0, view.axisMax]}
                        tickFormatter={(value: number) =>
                            view.axisPercentTemplate.replace('{n}', String(value))
                        }
                    />
                    <ChartTooltip
                        content={
                            <ChartTooltipContent formatter={formatPercentRow} />
                        }
                    />
                    <Line
                        dataKey='percent'
                        name={view.seriesLabel}
                        type='linear'
                        stroke='var(--color-percent)'
                        strokeWidth={LINE_WIDTH}
                        dot={{ r: DOT_RADIUS }}
                        activeDot={{ r: ACTIVE_DOT_RADIUS }}
                        connectNulls={false}
                    />
                </LineChart>
            </ChartContainer>
        </ChartFigure>
    );
}

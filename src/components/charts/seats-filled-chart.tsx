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
 * Draws only: every figure and string arrives finished in
 * {@link SeatsFilledChartView}. The gap for a week with no Sessions, the
 * straight segments and the purple series are settled in
 * `docs/adr/0013-rally-charts-draw-only.md`.
 */

/** Purple, not the green beside it — ADR 0013 allocates colour across a page. */
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

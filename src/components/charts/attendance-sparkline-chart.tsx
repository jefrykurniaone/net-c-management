'use client';

import type { ComponentProps } from 'react';
import { Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartFigure } from '@/components/charts/chart-figure';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import type { AttendanceSparklineView } from '@/lib/attendance-sparkline-view';
import { chartColor } from '@/lib/chart-tokens';

/**
 * The member's own attendance, eight weeks of one small line (#172).
 *
 * Draws only: every figure and string arrives finished in
 * {@link AttendanceSparklineView}. The hidden axes, the `type-figure-lead`
 * headline and `chartColor(0)` are settled in
 * `docs/adr/0013-rally-charts-draw-only.md`.
 */

const LINE_COLOR = chartColor(0);

const CHART_HEIGHT_PX = 64;
const LINE_WIDTH = 2;
const DOT_RADIUS = 2;
const ACTIVE_DOT_RADIUS = 4;

type TooltipItemFormatter = NonNullable<
    ComponentProps<typeof ChartTooltipContent>['formatter']
>;

/**
 * The tooltip row. Written here rather than left to the default so the
 * hovered figure reads exactly as the text list does — both come off the
 * point's own `display`, which the view finished.
 */
const formatCountRow: TooltipItemFormatter = (_value, name, item) => (
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

export function AttendanceSparklineChart({
    view,
}: Readonly<{ view: AttendanceSparklineView }>) {
    const config = {
        count: { label: view.seriesLabel, color: LINE_COLOR },
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
            <div className='flex items-baseline gap-2'>
                <span className='type-figure-lead text-foreground tabular-nums'>
                    {view.headlineCount}
                </span>
                <span className='type-caption text-muted-foreground'>
                    {view.headlineLabel}
                </span>
            </div>
            <ChartContainer
                config={config}
                className='mt-2 aspect-auto w-full rounded-md focus-within:ring-2 focus-within:ring-ring'
                style={{ height: CHART_HEIGHT_PX }}>
                <LineChart accessibilityLayer data={[...view.dots]}>
                    <XAxis dataKey='label' hide />
                    <YAxis hide />
                    <ChartTooltip
                        content={<ChartTooltipContent formatter={formatCountRow} />}
                    />
                    <Line
                        dataKey='count'
                        name={view.seriesLabel}
                        type='linear'
                        stroke='var(--color-count)'
                        strokeWidth={LINE_WIDTH}
                        dot={{ r: DOT_RADIUS }}
                        activeDot={{ r: ACTIVE_DOT_RADIUS }}
                    />
                </LineChart>
            </ChartContainer>
        </ChartFigure>
    );
}

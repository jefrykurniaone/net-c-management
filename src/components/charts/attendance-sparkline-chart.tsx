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
 * Draws only. Every figure and every string arrives finished in
 * {@link AttendanceSparklineView} — this component never sees an Attendance
 * row or the dictionary, so a wrong number is a resolver test's failure
 * rather than something a member finds. It composes onto #169's
 * {@link ChartFigure} exactly as `SeatsFilledChart` does.
 *
 * **No visible axes.** This card sits inside the dashboard's stats area
 * (`src/app/(main)/dashboard/page.tsx`) rather than the admin insights
 * region, so it draws as a true sparkline: `hide` on both axes drops the tick
 * labels and the reserved axis gutter, leaving only the line and its dots in
 * a 64px-tall strip. The eight-week detail is not lost — it is exactly what
 * the text list and the tooltip carry, same accessibility contract as every
 * other Rally chart.
 *
 * **The headline number is drawn here, not resolved here.** `headlineCount`
 * is the current week's Present count, restated in `type-figure-lead`
 * (the same figure type-scale step `StatCard` uses) above the line, so the
 * one number the acceptance criterion asks for ("the current week's count")
 * reads immediately rather than waiting on the toggled text list.
 *
 * **PBP Green, `chartColor(0)`.** The strongest-contrast pair in the ramp
 * (6.56:1 light / 7.54:1 dark, DESIGN.md § Chart series) and the brand's
 * primary colour — safe to spend here because this is the only chart on the
 * member dashboard, so there is no adjacent series on the same page for it to
 * be confused with (unlike the admin dashboard's three charts, which is why
 * #171 avoided it there).
 *
 * Motion: Recharts 3.8 defaults `isAnimationActive` to `'auto'`, which
 * respects `prefers-reduced-motion`. Left at the default, same as
 * `SeatsFilledChart`.
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

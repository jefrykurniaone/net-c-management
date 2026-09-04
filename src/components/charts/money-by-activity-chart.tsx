'use client';

import type { ComponentProps } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartFigure } from '@/components/charts/chart-figure';
import {
    ChartContainer,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
    type ChartLegendItem,
} from '@/components/ui/chart';
import { rupiah } from '@/lib/dues-collection-view';
import type { MoneyByActivityChartView } from '@/lib/money-by-activity-view';

/**
 * This Billing Period's money grouped by Activity, as a donut with the total in
 * its centre (#171).
 *
 * Draws only: every figure, colour and string arrives finished in
 * {@link MoneyByActivityChartView}. The HTML centre total and the explicitly
 * given `ChartLegendContent` items (#215) are settled in
 * `docs/adr/0013-rally-charts-draw-only.md`.
 */

/** The hole, wide enough for a seven-digit Rupiah total at `type-figure`. */
const DONUT_INNER_RADIUS = 68;
const DONUT_OUTER_RADIUS = 98;
/** A hairline of card between neighbouring arcs, in degrees. */
const SEGMENT_GAP_DEGREES = 2;
/** One arc is a whole ring; a gap in it would read as a missing segment. */
const NO_GAP = 0;

type TooltipItemFormatter = NonNullable<
    ComponentProps<typeof ChartTooltipContent>['formatter']
>;

/**
 * The tooltip row, written here rather than left to the default so a money
 * figure carries its currency: the shared content renders a bare
 * `toLocaleString()`, which would print an amount with no `Rp` and with
 * whatever grouping the reader's browser prefers. Mirrors the same formatter in
 * `dues-collection-chart.tsx`.
 */
const formatMoneyRow: TooltipItemFormatter = (value, name, item) => (
    <div className='flex w-full items-center gap-2'>
        <span
            aria-hidden='true'
            className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
            style={{ backgroundColor: item.payload?.color ?? item.color }}
        />
        <span className='text-muted-foreground'>{name}</span>
        <span className='ml-auto font-mono font-medium text-foreground tabular-nums'>
            {typeof value === 'number' ? rupiah(value) : ''}
        </span>
    </div>
);

/** The figure in the hole: what the whole ring adds up to. */
function DonutTotal({
    label,
    value,
}: Readonly<{ label: string; value: string }>) {
    return (
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center'>
            <span className='type-label text-muted-foreground'>{label}</span>
            <span className='type-figure text-foreground'>{value}</span>
        </div>
    );
}

export function MoneyByActivityChart({
    view,
}: Readonly<{ view: MoneyByActivityChartView }>) {
    // Labels only, deliberately no `color`: a config entry carrying one makes
    // `ChartStyle` emit `--color-<key>` into a `<style>` block, and these keys
    // are Activity names an Admin types. The arcs take their fill from `Cell`.
    const config: ChartConfig = Object.fromEntries(
        view.segments.map((segment) => [segment.label, { label: segment.label }]),
    );

    return (
        <ChartFigure
            title={view.title}
            caption={view.caption}
            values={view.values}
            valuesToggleLabel={view.valuesToggleLabel}
            valuesListLabel={view.valuesListLabel}
            emptyChipLabel={view.emptyChipLabel}
            emptyMessage={view.emptyMessage}>
            <div className='relative'>
                <ChartContainer
                    config={config}
                    className='aspect-auto h-56 w-full rounded-md focus-within:ring-2 focus-within:ring-ring'>
                    <PieChart accessibilityLayer>
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    hideLabel
                                    nameKey='label'
                                    formatter={formatMoneyRow}
                                />
                            }
                        />
                        <Pie
                            data={[...view.segments]}
                            dataKey='amount'
                            nameKey='label'
                            innerRadius={DONUT_INNER_RADIUS}
                            outerRadius={DONUT_OUTER_RADIUS}
                            paddingAngle={
                                view.segments.length > 1
                                    ? SEGMENT_GAP_DEGREES
                                    : NO_GAP
                            }
                            strokeWidth={NO_GAP}>
                            {view.segments.map((segment) => (
                                <Cell key={segment.key} fill={segment.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <DonutTotal label={view.totalLabel} value={view.totalValue} />
            </div>
            <ChartLegendContent
                items={view.segments.map(
                    (segment): ChartLegendItem => ({
                        key: segment.key,
                        label: segment.label,
                        color: segment.color,
                    }),
                )}
                hideIcon
                aria-label={view.keyLabel}
                className='type-caption text-muted-foreground'
            />
        </ChartFigure>
    );
}

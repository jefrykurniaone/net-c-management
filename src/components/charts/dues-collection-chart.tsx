'use client';

import type { ComponentProps } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartFigure } from '@/components/charts/chart-figure';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    duesLegendItems,
    rupiah,
    type DuesCollectionChartView,
} from '@/lib/dues-collection-view';

/**
 * Dues collected against Dues owed, six Billing Periods of grouped bars (#170).
 *
 * Draws only. Every figure and every string arrives finished in
 * {@link DuesCollectionChartView} — this component never sees a Payment, a
 * Dues Rate or the dictionary, so a wrong number is a resolver test's failure
 * rather than something an Admin finds. It composes onto #169's
 * {@link ChartFigure}, which carries the title, the caption and the text list
 * of the same values; a series is never drawn straight onto the page ground,
 * where the chart colours do not clear 3:1 (DESIGN.md, Chart series).
 *
 * Motion: Recharts 3.8 defaults `isAnimationActive` to `'auto'`, which respects
 * `prefers-reduced-motion` and disables the grow-in during SSR. Left at the
 * default rather than pinned, so the honouring cannot be switched off by
 * accident.
 *
 * **The legend takes `duesLegendItems(view)`, not Recharts' own legend
 * payload** (#224). Recharts 3.8 reorders that payload by each Bar's
 * translated `name`, so `id`'s legend read Owed before Collected even though
 * the JSX below always declares `collected` first; `items` is the
 * explicit-order interface #215 added to `ChartLegendContent` for exactly this
 * case, and `duesLegendItems` pins Collected before Owed by array order —
 * unaffected by which name string is longer or sorts first in either locale.
 */

const MILLION = 1_000_000;
const THOUSAND = 1_000;
/** "1.4M" — one decimal keeps a million-scale tick readable without lying. */
const MILLION_DECIMALS = 1;
const BAR_RADIUS = 4;
const Y_AXIS_WIDTH = 52;
const TICK_MARGIN = 8;

type TooltipItemFormatter = NonNullable<
    ComponentProps<typeof ChartTooltipContent>['formatter']
>;

/**
 * The tooltip row, written here rather than left to the default so a money
 * figure carries its currency: the shared content renders a bare
 * `toLocaleString()`, which would print an amount with no `Rp` and with
 * whatever grouping the reader's browser prefers.
 */
const formatMoneyRow: TooltipItemFormatter = (value, name, item) => (
    <div className='flex w-full items-center gap-2'>
        <span
            aria-hidden='true'
            className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
            style={{ backgroundColor: item.color }}
        />
        <span className='text-muted-foreground'>{name}</span>
        <span className='ml-auto font-mono font-medium text-foreground tabular-nums'>
            {typeof value === 'number' ? rupiah(value) : ''}
        </span>
    </div>
);

/**
 * An axis tick, shortened. A Rupiah total runs to seven digits and six of them
 * side by side do not fit 390px, so the axis carries the magnitude and the text
 * list carries the exact figure.
 */
function axisTick(value: number, view: DuesCollectionChartView): string {
    if (value >= MILLION) {
        return view.axisMillionTemplate.replace(
            '{n}',
            (value / MILLION).toFixed(MILLION_DECIMALS),
        );
    }
    if (value >= THOUSAND) {
        return view.axisThousandTemplate.replace(
            '{n}',
            String(Math.round(value / THOUSAND)),
        );
    }
    return String(value);
}

export function DuesCollectionChart({
    view,
}: Readonly<{ view: DuesCollectionChartView }>) {
    const config = {
        collected: { label: view.collectedLabel, color: view.collectedColor },
        owed: { label: view.owedLabel, color: view.owedColor },
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
                <BarChart accessibilityLayer data={[...view.bars]}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey='label'
                        tickLine={false}
                        axisLine={false}
                        tickMargin={TICK_MARGIN}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={Y_AXIS_WIDTH}
                        tickMargin={TICK_MARGIN}
                        tickFormatter={(value: number) => axisTick(value, view)}
                    />
                    <ChartTooltip
                        content={<ChartTooltipContent formatter={formatMoneyRow} />}
                    />
                    <ChartLegend
                        content={<ChartLegendContent items={duesLegendItems(view)} />}
                    />
                    <Bar
                        dataKey='collected'
                        name={view.collectedLabel}
                        fill='var(--color-collected)'
                        radius={BAR_RADIUS}
                    />
                    <Bar
                        dataKey='owed'
                        name={view.owedLabel}
                        fill='var(--color-owed)'
                        radius={BAR_RADIUS}
                    />
                </BarChart>
            </ChartContainer>
        </ChartFigure>
    );
}

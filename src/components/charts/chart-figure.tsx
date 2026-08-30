import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';

export interface ChartFigureValue {
    /** The value's own label — a Period, a week, an Activity name. */
    readonly label: string;
    /** Pre-formatted for display (Rupiah, a percentage, a count) — the wrapper never formats a number itself. */
    readonly value: string;
}

export interface ChartFigureProps {
    readonly title: ReactNode;
    readonly caption?: ReactNode;
    /**
     * Every plotted value, in draw order. This is the accessibility contract
     * (spec #146, DESIGN.md): a chart is never the only representation of
     * its numbers, and an empty array is what tips the figure into its
     * empty state — a caller never passes a separate `isEmpty` flag that
     * could disagree with what it actually plotted.
     */
    readonly values: readonly ChartFigureValue[];
    /** Disclosure summary text for the text list. */
    readonly valuesToggleLabel: string;
    /** `aria-label` read before the list itself. */
    readonly valuesListLabel: string;
    /** Chip label shown in place of the chart when `values` is empty. */
    readonly emptyChipLabel: string;
    /** The one sentence shown beside the chip. */
    readonly emptyMessage: string;
    /**
     * The drawn chart — a `<ChartContainer>` around a Recharts `BarChart`,
     * `PieChart` or `LineChart`. Never rendered when `values` is empty, so a
     * caller does not have to guard its own series against an empty array.
     */
    readonly children: ReactNode;
    readonly className?: string;
}

/**
 * The one figure shape every Rally chart composes onto (#169): a card
 * carrying a title, the drawn chart, a caption, and a text list of the
 * plotted values that carries the numbers to assistive technology. #170,
 * #171 and #172 draw the bars, donut and line inside `children` and resolve
 * their own `values` — this component never reaches into a resolver or a
 * dictionary.
 */
export function ChartFigure({
    title,
    caption,
    values,
    valuesToggleLabel,
    valuesListLabel,
    emptyChipLabel,
    emptyMessage,
    children,
    className,
}: Readonly<ChartFigureProps>) {
    const isEmpty = values.length === 0;

    return (
        <figure className={cn('m-0', className)}>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isEmpty ? (
                        <ChartEmptyState chipLabel={emptyChipLabel} message={emptyMessage} />
                    ) : (
                        <>
                            {children}
                            <ChartValuesList
                                values={values}
                                toggleLabel={valuesToggleLabel}
                                listLabel={valuesListLabel}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
            {caption && (
                <figcaption className='type-caption text-muted-foreground mt-2 px-1'>
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}

function ChartEmptyState({
    chipLabel,
    message,
}: Readonly<{ chipLabel: string; message: string }>) {
    return (
        <div className='flex flex-col items-center gap-2 py-8 text-center'>
            <Chip variant='neutral' label={chipLabel} />
            <p className='type-caption text-muted-foreground'>{message}</p>
        </div>
    );
}

function ChartValuesList({
    values,
    toggleLabel,
    listLabel,
}: Readonly<{
    values: readonly ChartFigureValue[];
    toggleLabel: string;
    listLabel: string;
}>) {
    return (
        <details className='mt-3'>
            <summary className='type-caption text-muted-foreground cursor-pointer select-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                {toggleLabel}
            </summary>
            <ul
                aria-label={listLabel}
                className='mt-2 space-y-1 type-caption text-muted-foreground'>
                {values.map((row) => (
                    <li
                        key={row.label}
                        className='flex justify-between gap-4 tabular-nums'>
                        <span>{row.label}</span>
                        <span className='text-foreground'>{row.value}</span>
                    </li>
                ))}
            </ul>
        </details>
    );
}

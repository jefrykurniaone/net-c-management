import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import {
    resolveStatusMark,
    type DomainState,
    type MarkKind,
    type MarkLabelKey,
} from '@/lib/status-mark';

/**
 * The six marks. Each is distinguished by **form first** — remove all colour
 * and the six are still tellable apart:
 *
 * - **ink** — filled rectangle, hard border. Settled and true.
 * - **tape** — filled rectangle with a torn right edge. Provisional and held.
 * - **strike** — filled rectangle whose label is struck through, and which
 *   strikes the value it marks (see {@link MarkedValue}). Void.
 * - **erased** — flat, ground-coloured, no wash and no border. Withdrawn.
 * - **blank** — 1px dashed outline, no fill. Nobody has placed it yet.
 * - **hollow** — 2px dashed outline in the void colour, no fill. It should
 *   have happened and didn't.
 *
 * Every text/wash pair below clears WCAG AA on both board materials, measured:
 * ink 6.31 / 5.40, tape 5.36 / 6.20, strike 5.97 / 5.45, erased 5.41 / 6.19,
 * blank 5.41 / 5.45 worst case, hollow 5.73 / 5.04 worst case.
 */
const markVariants = cva(
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-[2px] px-2 py-[3px] type-label whitespace-nowrap',
    {
        variants: {
            kind: {
                ink: 'border border-success-soft-border bg-success-soft text-success-soft-foreground',
                tape: 'mark-torn pr-3.5 bg-warning-soft text-warning-soft-foreground',
                strike: 'border border-destructive-soft-border bg-destructive-soft text-destructive line-through decoration-[1.5px]',
                erased: 'border border-transparent bg-board text-muted-foreground',
                blank: 'border border-dashed border-rule text-muted-foreground',
                hollow: 'border-2 border-dashed border-destructive text-destructive',
            } satisfies Record<MarkKind, string>,
        },
        defaultVariants: {
            kind: 'blank',
        },
    },
);

/**
 * A single mark. Prefer {@link StateMark} where a domain state is in hand —
 * no surface should pick its own mark kind — and reach for this directly only
 * where the thing being marked has no stored state, such as a Seat nobody has
 * claimed.
 */
function Mark({
    className,
    kind,
    ...props
}: Readonly<
    React.ComponentProps<'span'> & VariantProps<typeof markVariants>
>) {
    return (
        <span
            data-slot='mark'
            data-mark={kind ?? 'blank'}
            className={cn(markVariants({ kind }), className)}
            {...props}
        />
    );
}

/**
 * The mark for a domain state, resolved through the one seam and labelled from
 * the dictionary. `labels` is `t.marks`, so a label can only be one that ships
 * in both English and Indonesian.
 */
function StateMark({
    state,
    labels,
    className,
}: Readonly<{
    state: DomainState;
    labels: Readonly<Record<MarkLabelKey, string>>;
    className?: string;
}>) {
    const { kind, labelKey } = resolveStatusMark(state);
    return (
        <Mark kind={kind} className={className}>
            {labels[labelKey]}
        </Mark>
    );
}

/**
 * The value a mark applies to — a Session's title, a Payment's amount. A void
 * state draws a real line through it, because striking only the mark's own
 * label leaves the struck-out thing reading as though it still stands.
 */
function MarkedValue({
    state,
    className,
    ...props
}: Readonly<React.ComponentProps<'span'> & { state: DomainState }>) {
    const { kind } = resolveStatusMark(state);
    return (
        <span
            className={cn(
                kind === 'strike' &&
                    'line-through decoration-destructive decoration-[1.5px]',
                className,
            )}
            {...props}
        />
    );
}

export { Mark, StateMark, MarkedValue, markVariants };

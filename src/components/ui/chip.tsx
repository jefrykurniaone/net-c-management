import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import {
    resolveStatusChip,
    type ChipLabelKey,
    type ChipVariant,
    type DomainState,
} from '@/lib/status-chip';

/**
 * The status chip. One pill, a tinted wash, a small filled dot in the chip's
 * own ink, and a written label — DESIGN.md, Chips.
 *
 * Five variants by semantic, each pair measured on both board materials
 * (light / dark) by `src/lib/__tests__/design-tokens.test.ts`, which reads the
 * committed tokens rather than these class names:
 *
 * - **settled** — PBP Green family. Confirmed Payment, Present Participant, a
 *   posted Session. 5.59 / 7.06.
 * - **provisional** — Orange. Pending Payment, a Seat held on money not yet
 *   verified. 6.00 / 6.73.
 * - **void** — Dark Red. Rejected Payment, cancelled Session, No-Show.
 *   6.04 / 5.88.
 * - **neutral** — Shells. Opted Out, withdrawn, nothing placed yet.
 *   5.90 / 7.03.
 * - **info** — Purple. Informational. 6.93 / 7.14.
 *
 * The dot takes `bg-current`, so it is the label's own ink and cannot drift
 * away from a measured pair. It is `aria-hidden`: the label is the channel.
 */
const chipVariants = cva(
    'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 type-label tabular-nums whitespace-nowrap',
    {
        variants: {
            variant: {
                settled:
                    'border-success-soft-border bg-success-soft text-success-soft-foreground',
                provisional:
                    'border-warning-soft-border bg-warning-soft text-warning-soft-foreground',
                void: 'border-destructive-soft-border bg-destructive-soft text-destructive',
                neutral: 'border-border bg-muted text-muted-foreground',
                info: 'border-primary-soft-border bg-primary-soft text-primary',
            } satisfies Record<ChipVariant, string>,
        },
        defaultVariants: {
            variant: 'neutral',
        },
    },
);

/**
 * A chip cannot render without a label: `label` is required and `children` is
 * removed, so there is no second way to put text inside one and no way to put
 * none. That is what makes it legitimate to have dropped the six mark forms —
 * see The Label Rule.
 */
export type ChipProps = Readonly<
    Omit<React.ComponentProps<'span'>, 'children'> &
        VariantProps<typeof chipVariants> & { label: string }
>;

const DEFAULT_VARIANT: ChipVariant = 'neutral';

/**
 * A single chip. Prefer {@link StatusChip} where a domain state is in hand — no
 * surface should pick its own variant — and reach for this directly only where
 * the thing being labelled has no stored state, such as a Seat nobody has
 * claimed or a register with no rows in it.
 */
function Chip({ className, variant, label, ...props }: ChipProps) {
    return (
        <span
            data-slot='chip'
            data-variant={variant ?? DEFAULT_VARIANT}
            className={cn(chipVariants({ variant }), className)}
            {...props}>
            <span
                aria-hidden='true'
                className='size-1.5 shrink-0 rounded-full bg-current'
            />
            {label}
        </span>
    );
}

/**
 * The chip for a domain state, resolved through the one seam and labelled from
 * the dictionary. `labels` is `t.chips`, so a label can only be one that ships
 * in both English and Indonesian.
 */
function StatusChip({
    state,
    labels,
    className,
}: Readonly<{
    state: DomainState;
    labels: Readonly<Record<ChipLabelKey, string>>;
    className?: string;
}>) {
    const { variant, labelKey } = resolveStatusChip(state);
    return <Chip variant={variant} label={labels[labelKey]} className={className} />;
}

/**
 * How a void state renders the value it labels: the value recedes to the muted
 * ink. Nothing is struck through anywhere — the chip beside it says "cancelled"
 * or "rejected" in words, and a line drawn through a row's own title reads as
 * damage to the row rather than as a state.
 *
 * Applied *after* the caller's own classes so it wins over a base text colour.
 */
const VOID_VALUE_CLASS = 'text-muted-foreground';

/**
 * The value a status applies to — a Session's title, a Payment's amount. Under
 * a void state it is de-emphasised, never struck: the chip carries the state.
 */
function StatusValue({
    state,
    className,
    ...props
}: Readonly<React.ComponentProps<'span'> & { state: DomainState }>) {
    const { variant } = resolveStatusChip(state);
    return (
        <span
            className={cn(className, variant === 'void' && VOID_VALUE_CLASS)}
            {...props}
        />
    );
}

export { Chip, StatusChip, StatusValue, chipVariants };

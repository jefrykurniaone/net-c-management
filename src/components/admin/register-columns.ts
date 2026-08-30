import type { ReactNode } from 'react';

/**
 * What one column of a register holds. The kind is the *only* thing a caller
 * says about how the lattice is drawn: alignment, type role and collapse
 * behaviour are derived from it and never passed in, so two registers cannot
 * set the same kind of value two different ways.
 *
 * - `text` — a name, a venue, the Activities somebody picked.
 * - `figure` — a count, a capacity, an instant. Tabular, hard right.
 * - `amount` — a Rupiah amount. Tabular, hard right, and never broken across
 *   two lines, because half an amount is a different number.
 * - `standing` — one chip from the resolver and nothing else, on the register's
 *   shared right edge, so every chip on the surface lands on one line.
 * - `actions` — the row's own controls, on that same edge.
 */
export const REGISTER_COLUMN_KINDS = [
    'text',
    'figure',
    'amount',
    'standing',
    'actions',
] as const;

export type RegisterColumnKind = (typeof REGISTER_COLUMN_KINDS)[number];

/** Every row names itself; the register keys its rows on that id. */
export type RegisterRow = Readonly<{ id: string }>;

/**
 * One column, described as data.
 *
 * `render` is the sanctioned escape for a **value** — a Proof thumbnail and a
 * Rupiah amount are different kinds of thing and the register cannot know how
 * to draw either. It is the only escape there is: no `children`, no slot prop,
 * no ordering prop and no per-cell class name, because a caller that can pass a
 * node can reorder the lattice, and a lattice that reorders is a register whose
 * whole point — the same fact in the same place down forty rows — is gone.
 */
export type RegisterColumn<Row extends RegisterRow> = Readonly<{
    /** Stable identity for this column, and its React key. */
    key: string;
    /**
     * The column head, already translated. It is also the label this column's
     * cell carries when the register collapses by axis.
     */
    head: string;
    /** Defaults to `text`. */
    kind?: RegisterColumnKind;
    /**
     * The `sortBy` value this column sorts on, handed to the shared sort
     * control. Omitted where the column does not sort.
     */
    sortKey?: string;
    render: (row: Row) => ReactNode;
}>;

const DEFAULT_KIND: RegisterColumnKind = 'text';

/** The kinds that sit on the register's shared right edge at full width. */
const RIGHT_EDGE_KINDS: readonly RegisterColumnKind[] = [
    'figure',
    'amount',
    'standing',
    'actions',
];

/** Whether this kind's head and value belong on the shared right edge. */
export function isRightEdge(kind: RegisterColumnKind = DEFAULT_KIND): boolean {
    return RIGHT_EDGE_KINDS.includes(kind);
}

/**
 * Alignment is a property of the kind *and* of the width. Collapsed, every cell
 * reads left under its own label: a value set hard right of a label it is
 * stacked beneath has nothing left to line up with.
 */
export function alignClassFor(kind?: RegisterColumnKind): string {
    return isRightEdge(kind) ? 'md:text-right' : 'text-left';
}

/**
 * How each kind's value sits in its cell. Chips and controls carry their own
 * lettering, so those two kinds set only the box that holds them — and that box
 * is a flex row, because text alignment does not move a flex child.
 */
const VALUE_CLASS: Record<RegisterColumnKind, string> = {
    text: 'block type-body',
    figure: 'block type-figure',
    amount: 'block type-figure whitespace-nowrap',
    standing: 'flex flex-wrap items-center gap-cell md:justify-end',
    actions: 'flex flex-wrap items-center gap-cell md:justify-end',
};

export function valueClassFor(kind: RegisterColumnKind = DEFAULT_KIND): string {
    return VALUE_CLASS[kind];
}

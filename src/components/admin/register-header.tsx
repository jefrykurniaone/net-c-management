import type { ReactNode } from 'react';
import { CardHeader } from '@/components/ui/card';

/**
 * The card header every register wears: what the rows are, how many there are,
 * and the one thing an Admin comes to this surface to do.
 *
 * **Three things, in a fixed order, and no fourth.** The title says what the
 * register is; the count says how much of it there is; the action is the
 * surface's own primary control. A register cannot add a fifth field, move the
 * count above the title, or put a second control on the trailing edge, because
 * none of those is expressible in `RegisterHeader` — the same reason the
 * lattice takes columns as data rather than nodes.
 *
 * **`action` is a node, and that is not the lattice escape being reopened.** A
 * "post a Session" button is a link, "add an Activity" opens a dialog and the
 * attendance register's action submits a form, so the register cannot build any
 * of them; what it can do is fix where the control lands and how many there
 * are. The node has one slot, on the trailing edge, and cannot reach the rows.
 *
 * **The header is required.** A register with no title is a table floating on a
 * card face, which is what the count and the action exist to prevent — the
 * Admin should not have to read the first row to learn what they are looking at.
 */
export type RegisterHeader = Readonly<{
    /** Names the rows, already translated. Drawn as the card's `<h2>`. */
    title: string;
    /**
     * How many rows there are, as a sentence from the dictionary with `{n}`
     * already filled in — `40 payments`, `3 waiting for a decision`. A worded
     * count rather than a bare figure, because a number alone beside a title is
     * ambiguous the moment a register is filtered.
     */
    count: string;
    /** The register's one primary control, on the header's trailing edge. */
    action?: ReactNode;
}>;

/**
 * A wrapping flex row rather than `CardHeader`'s own grid: the action has to
 * drop below the title on a phone, and `grid-cols-[1fr_auto]` cannot wrap. Both
 * the `display` utility and the one that depends on it are passed, because
 * `tailwind-merge` resolves `flex` against the base `grid` but would silently
 * drop a lone `flex-row` (DESIGN.md, *Components*).
 */
const HEADER_CLASS =
    'flex flex-row flex-wrap items-start justify-between gap-cell py-block';

/** `min-w-0` lets a long community-configured title wrap instead of overflowing. */
const TITLE_BOX_CLASS = 'min-w-0';

const COUNT_CLASS = 'mt-hair type-caption text-muted-foreground tabular-nums';

const ACTION_BOX_CLASS = 'flex flex-wrap items-center gap-cell';

export function RegisterCardHeader({
    header,
}: Readonly<{ header: RegisterHeader }>) {
    return (
        <CardHeader className={HEADER_CLASS}>
            <div className={TITLE_BOX_CLASS}>
                <h2 className='type-title text-foreground'>{header.title}</h2>
                <p className={COUNT_CLASS}>{header.count}</p>
            </div>
            {header.action !== undefined && (
                <div className={ACTION_BOX_CLASS}>{header.action}</div>
            )}
        </CardHeader>
    );
}

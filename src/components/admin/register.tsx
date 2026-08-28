import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Mark } from '@/components/ui/mark';
import { SortableTh } from '@/components/ui/sortable-th';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { RawSearchParams } from '@/lib/table-params';
import { cn } from '@/lib/utils';
import {
    alignClassFor,
    isRightEdge,
    valueClassFor,
    type RegisterColumn,
    type RegisterRow,
} from './register-columns';

/**
 * The Register — one row per thing, read at a desk, and the single seam for
 * drawing an admin table anywhere in this app. It is the admin side's
 * counterpart to the Slot Cell, and it exists for the same reason: six
 * hand-rolled tables drift into six idioms the way two card renderings would.
 *
 * It owns the lattice and hands none of it out. Shared 1px rules between rows
 * and between columns rather than gaps between floating panels; tabular figures
 * down every column of numbers; a standing column carrying one mark and nothing
 * else; a designed empty row; and the axis collapse below `768px`.
 *
 * **Data, never nodes.** A caller describes columns and rows. There is no
 * `children`, no slot prop, no ordering prop and no per-cell class name — see
 * `register-columns.ts` for the one escape there is, a per-column `render` for
 * the *value* a cell holds.
 *
 * **The collapse is by axis, not by flattening.** At `md` and up this is a real
 * `<table>`: `<th scope="col">` heads, native header association, one shared
 * rule between neighbours. Below `md` the table's parts are set to
 * `display: block`, each row stays a rule-bounded row, and its cells stack
 * inside it under the column's own tracked-caps label. It never becomes an
 * unruled card list; losing the rules loses the world.
 *
 * **Exactly one label source is live at any width.** Setting the parts to
 * `display: block` drops the table role, and `<th scope>` association goes with
 * it, so each cell carries its column's label as real text immediately before
 * its value. That label is `md:hidden` at full width, where the `<thead>` does
 * the work, and the `<thead>` is `hidden` below it, where the inline label
 * does. Nothing is announced twice, and the DOM order is the reading order at
 * both widths.
 */

/** Sort and pagination stay the controls every admin list page already uses. */
export type RegisterPagination = Readonly<{
    total: number;
    page: number;
    pageSize: number | 'all';
    labels: Dictionary['table']['pagination'];
}>;

type RegisterProps<Row extends RegisterRow> = Readonly<{
    columns: readonly RegisterColumn<Row>[];
    rows: readonly Row[];
    /** Names the register for a screen reader. Never drawn on screen. */
    caption: string;
    /** The raw query, so a sort link keeps the rest of it. */
    searchParams: RawSearchParams;
    /** The designed empty row: a Blank mark and one sentence. */
    empty: Readonly<{ mark: string; text: string }>;
    pagination?: RegisterPagination;
}>;

/** The frame. One rule around the whole register, rows ruled inside it. */
const FRAME_CLASS = 'border border-rule bg-tile';

const TABLE_CLASS = 'block w-full md:table';

/**
 * Column rules live on the cells and row rules live on the cells too, each
 * drawn once on one side only — so no internal rule is ever two lines thick,
 * whether the table collapses its borders or not.
 */
const CELL_RULES = 'md:border-r md:border-b md:border-rule md:last:border-r-0';

const HEAD_CELL_CLASS = `bg-board px-block py-cell align-bottom ${CELL_RULES}`;

const BODY_CELL_CLASS = `block px-block py-cell align-top md:table-cell ${CELL_RULES}`;

/**
 * Below `md` the row itself is what the rule bounds; above it the cells carry
 * their own, and the last row hands its bottom edge to the frame.
 */
const ROW_CLASS =
    'block border-b border-rule last:border-b-0 md:table-row md:border-b-0';

const BODY_CLASS =
    'block md:table-row-group md:[&>tr:last-child>td]:border-b-0';

/** The column head, repeated inside each cell for the collapsed arrangement. */
const CELL_LABEL_CLASS = 'mb-hair block type-label text-muted-foreground md:hidden';

function RegisterHeadCell<Row extends RegisterRow>({
    column,
    searchParams,
}: Readonly<{ column: RegisterColumn<Row>; searchParams: RawSearchParams }>) {
    const align = isRightEdge(column.kind) ? 'right' : 'left';
    if (column.sortKey === undefined) {
        return (
            <th
                scope='col'
                className={cn(
                    HEAD_CELL_CLASS,
                    align === 'right' && 'text-right',
                )}>
                {column.head}
            </th>
        );
    }
    return (
        <SortableTh
            column={column.sortKey}
            label={column.head}
            searchParams={searchParams}
            align={align}
            className={HEAD_CELL_CLASS}
        />
    );
}

function RegisterCell<Row extends RegisterRow>({
    column,
    row,
}: Readonly<{ column: RegisterColumn<Row>; row: Row }>) {
    return (
        <td className={cn(BODY_CELL_CLASS, alignClassFor(column.kind))}>
            <span className={CELL_LABEL_CLASS}>{column.head}</span>
            <span className={valueClassFor(column.kind)}>
                {column.render(row)}
            </span>
        </td>
    );
}

function RegisterRowCells<Row extends RegisterRow>({
    columns,
    row,
}: Readonly<{ columns: readonly RegisterColumn<Row>[]; row: Row }>) {
    return (
        <tr className={ROW_CLASS}>
            {columns.map((column) => (
                <RegisterCell key={column.key} column={column} row={row} />
            ))}
        </tr>
    );
}

/**
 * Nothing to show is still a register: a ruled row carrying a **Blank** mark —
 * *expected but not yet placed* — and one sentence saying what is missing.
 * A blank panel would say nothing at all.
 */
function RegisterEmptyRow({
    span,
    empty,
}: Readonly<{ span: number; empty: Readonly<{ mark: string; text: string }> }>) {
    return (
        <tr className={ROW_CLASS}>
            <td colSpan={span} className={BODY_CELL_CLASS}>
                <span className='flex flex-wrap items-center gap-cell'>
                    <Mark kind='blank'>{empty.mark}</Mark>
                    <span className='type-caption text-muted-foreground'>
                        {empty.text}
                    </span>
                </span>
            </td>
        </tr>
    );
}

export function Register<Row extends RegisterRow>({
    columns,
    rows,
    caption,
    searchParams,
    empty,
    pagination,
}: Readonly<RegisterProps<Row>>) {
    return (
        <div className={FRAME_CLASS}>
            <div className='md:overflow-x-auto'>
                <table className={TABLE_CLASS}>
                    <caption className='sr-only'>{caption}</caption>
                    <thead className='hidden md:table-header-group'>
                        <tr>
                            {columns.map((column) => (
                                <RegisterHeadCell
                                    key={column.key}
                                    column={column}
                                    searchParams={searchParams}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody className={BODY_CLASS}>
                        {rows.length === 0 && (
                            <RegisterEmptyRow
                                span={columns.length}
                                empty={empty}
                            />
                        )}
                        {rows.map((row) => (
                            <RegisterRowCells
                                key={row.id}
                                columns={columns}
                                row={row}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            {pagination && pagination.total > 0 && (
                <div className='border-t border-rule px-block'>
                    <DataTablePagination
                        total={pagination.total}
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        searchParams={searchParams}
                        labels={pagination.labels}
                    />
                </div>
            )}
        </div>
    );
}

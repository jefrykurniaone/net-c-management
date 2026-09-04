import { Card } from '@/components/ui/card';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Chip } from '@/components/ui/chip';
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
import { RegisterCardHeader, type RegisterHeader } from './register-header';

/**
 * The Register — one row per thing, read at a desk, and the single seam for
 * drawing an admin table anywhere in this app. The card treatment, the
 * data-never-nodes contract and the collapse-by-axis arrangement are argued in
 * `docs/adr/0015-register-collapses-by-axis.md`.
 *
 * **Exactly one label source is live at any width, and nothing enforces it.**
 * `CELL_LABEL_CLASS` is `md:hidden` and the `<thead>` is
 * `hidden md:table-header-group` — complements. Break the pair and every cell is
 * announced twice, or loses its column label below `md`.
 */

/** Sort and pagination stay the controls every admin list page already uses. */
export type RegisterPagination = Readonly<{
    total: number;
    page: number;
    pageSize: number | 'all';
    labels: Dictionary['table']['pagination'];
}>;

/** Everything the lattice itself needs, and nothing about the card around it. */
type RegisterTableProps<Row extends RegisterRow> = Readonly<{
    columns: readonly RegisterColumn<Row>[];
    rows: readonly Row[];
    /** Names the register for a screen reader. Never drawn on screen. */
    caption: string;
    /** The raw query, so a sort link keeps the rest of it. */
    searchParams: RawSearchParams;
    /** The designed empty row: a neutral chip and one sentence. */
    empty: Readonly<{ mark: string; text: string }>;
}>;

type RegisterProps<Row extends RegisterRow> = RegisterTableProps<Row> &
    Readonly<{
        /** Title, row count and the surface's primary action. Never optional. */
        header: RegisterHeader;
        pagination?: RegisterPagination;
    }>;

/** The table fills the card: the card's own vertical padding and gap go. */
const CARD_CLASS = 'gap-0 py-0';

const TABLE_CLASS = 'block w-full md:table';

/**
 * One rule under each row, drawn on the cells rather than on the `<tr>` because
 * a row border does not render while a table's borders are separate. Nothing is
 * drawn between columns.
 */
const CELL_RULES = 'md:border-b md:border-border';

const HEAD_CELL_CLASS = `bg-muted px-block py-cell align-bottom ${CELL_RULES}`;

const BODY_CELL_CLASS = `block px-block py-cell align-top md:table-cell ${CELL_RULES}`;

/**
 * Below `md` the row itself is what the rule bounds; above it the cells carry
 * their own, and the last row hands its bottom edge to the card.
 */
const ROW_CLASS =
    'block border-b border-border last:border-b-0 md:table-row md:border-b-0';

const BODY_CLASS =
    'block md:table-row-group md:[&>tr:last-child>td]:border-b-0';

/**
 * The rule between the card header and the register. It sits here rather than
 * on the header because below `md` the `<thead>` that would otherwise draw it
 * is hidden, and a header running straight into the first row loses the edge.
 */
const TABLE_WRAP_CLASS = 'border-t border-border md:overflow-x-auto';

const PAGINATION_CLASS = 'border-t border-border px-block pb-cell';

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
 * Nothing to show is still a register: a ruled row carrying a **neutral** chip
 * — *expected but not yet placed* — and one sentence saying what is missing.
 * An empty card would say nothing at all.
 */
function RegisterEmptyRow({
    span,
    empty,
}: Readonly<{ span: number; empty: Readonly<{ mark: string; text: string }> }>) {
    return (
        <tr className={ROW_CLASS}>
            <td colSpan={span} className={BODY_CELL_CLASS}>
                <span className='flex flex-wrap items-center gap-cell'>
                    <Chip variant='neutral' label={empty.mark} />
                    <span className='type-caption text-muted-foreground'>
                        {empty.text}
                    </span>
                </span>
            </td>
        </tr>
    );
}

/** The lattice, and only the lattice. */
function RegisterTable<Row extends RegisterRow>({
    columns,
    rows,
    caption,
    searchParams,
    empty,
}: RegisterTableProps<Row>) {
    return (
        <div className={TABLE_WRAP_CLASS}>
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
    );
}

export function Register<Row extends RegisterRow>({
    header,
    pagination,
    ...table
}: RegisterProps<Row>) {
    return (
        <Card className={CARD_CLASS}>
            <RegisterCardHeader header={header} />
            <RegisterTable {...table} />
            {pagination && pagination.total > 0 && (
                <div className={PAGINATION_CLASS}>
                    <DataTablePagination
                        total={pagination.total}
                        page={pagination.page}
                        pageSize={pagination.pageSize}
                        searchParams={table.searchParams}
                        labels={pagination.labels}
                    />
                </div>
            )}
        </Card>
    );
}

import { Mark } from '@/components/ui/mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { SlotCell, type SlotCellData } from './slot-cell';

/**
 * The sessions board: every day of the displayed range, none skipped. Skipping
 * empty days turns the board into a short list of cards, which is the
 * arrangement this world exists to refuse — and it is also what makes a quiet
 * community look broken rather than merely quiet.
 *
 * **One DOM, two layouts, collapsed by axis.** The same `gap-px` + rule-coloured
 * ground draws every rule in both, so the cells share their rules with their
 * neighbours rather than sitting in gaps:
 *
 * - at and above `md`, seven columns with tracked-caps column heads;
 * - below it, one column of ruled day rows, where each day keeps its
 *   rule-bounded row and the column head becomes the row's own tracked-caps
 *   label. It never becomes an unruled card list; losing the rules loses the
 *   world.
 *
 * The day heading is the same element in both: visible as the row label below
 * the breakpoint, `sr-only` above it, where the column head is what a sighted
 * reader sees. So the heading order is the same at every viewport.
 *
 * **The column floor, and the collision it settles.** A seven-column week
 * cannot fit the day, the date and a tracked-caps mark on one line inside the
 * member container — the top line wraps, which breaks the fixed-position
 * promise for every cell at once. The columns therefore carry a **floor**
 * (`minmax(11rem, 1fr)`), and where seven floors do not fit, the week scrolls
 * horizontally instead of the cells reflowing. See DESIGN.md, *Signature
 * Component: the Slot Cell*, for the two routes this was chosen over.
 *
 * Below the breakpoint the single column has no floor and nothing scrolls
 * sideways — the collapse is the answer there, not the rail.
 */

/** Seven columns, each with a floor. Written out because Tailwind scans text. */
const LATTICE_COLUMNS =
    'md:[grid-template-columns:repeat(7,minmax(11rem,1fr))]';

const HEAD_CLASS =
    'hidden bg-tile px-cell py-cell type-label text-muted-foreground md:block';

/** One cell and its identity. Keys stay out of the Slot Cell's own contract. */
export type BoardSlotView = Readonly<{ key: string; cell: SlotCellData }>;

export type BoardDayView = Readonly<{
    key: string;
    /** "Monday 18 August" — the row label below `md`, `sr-only` above it. */
    heading: string;
    slots: readonly BoardSlotView[];
}>;

/**
 * A Blank-marked strip. A community with nothing posted keeps its board and
 * says so here: Blank means *expected but not yet placed*, which is the honest
 * state of a community that has just been set up.
 */
export function BoardNotice({
    label,
    body,
}: Readonly<{ label: string; body: string }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell border border-rule bg-tile px-block py-cell'>
            <Mark kind='blank'>{label}</Mark>
            <p className='type-caption text-secondary-foreground'>{body}</p>
        </div>
    );
}

/** A day with nothing planned and nothing posted. It keeps its cell. */
function EmptyDay({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='flex flex-1 flex-wrap items-center gap-cell bg-tile p-cell'>
            <Mark kind='blank'>{t.marks.unposted}</Mark>
            <p className='type-caption text-muted-foreground'>
                {t.sessions.boardNothingOnDay}
            </p>
        </div>
    );
}

function BoardDay({
    day,
    t,
}: Readonly<{ day: BoardDayView; t: Dictionary }>) {
    return (
        <div className='flex flex-col gap-px bg-rule'>
            <h2 className='bg-tile px-cell pt-cell type-label text-muted-foreground md:sr-only'>
                {day.heading}
            </h2>
            {day.slots.length === 0 ? (
                <EmptyDay t={t} />
            ) : (
                day.slots.map((slot) => (
                    <SlotCell key={slot.key} data={slot.cell} t={t} />
                ))
            )}
        </div>
    );
}

export function SessionsBoard({
    days,
    weekdayHeads,
    t,
}: Readonly<{
    days: readonly BoardDayView[];
    weekdayHeads: readonly string[];
    t: Dictionary;
}>) {
    return (
        /* The rail takes a tab stop of its own: a keyboard user has to be able
           to scroll it (WCAG 2.1.1), and a week whose far columns are all
           unposted holds no focusable cell to reach instead. */
        <section
            aria-label={t.sessions.boardLabel}
            tabIndex={0}
            /* Seven 11rem floors are 77rem, and the member layout caps its
               column at 42rem — so inside that column the week would scroll at
               every desktop width, not only narrow ones (see DESIGN.md, the
               settled decision). From `md` up the rail escapes the column and
               takes the lattice's own measure, capped at 77rem so it completes
               at desktop width; where the viewport is narrower than the lattice
               it still scrolls, which is the cost the decision already names.
               Below `md` the board is one column and keeps the column's width,
               so it stays flush with the heading and filters above it. */
            className='overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring focus-visible:[outline-offset:-2px] md:relative md:left-1/2 md:w-[min(100vw-3rem,77rem)] md:-translate-x-1/2'>
            <div
                className={`grid grid-cols-1 gap-px rounded-sm border border-rule bg-rule ${LATTICE_COLUMNS}`}>
                {weekdayHeads.map((head) => (
                    <span key={head} className={HEAD_CLASS}>
                        {head}
                    </span>
                ))}
                {days.map((day) => (
                    <BoardDay key={day.key} day={day} t={t} />
                ))}
            </div>
        </section>
    );
}

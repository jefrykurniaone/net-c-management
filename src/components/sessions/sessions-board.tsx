import { Chip } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { SlotCell, type SlotCellData } from './slot-cell';

/**
 * The sessions board: every day of the displayed range, none skipped. Skipping
 * empty days turns the board into a short list of cards, which is the
 * arrangement this world exists to refuse — and it is also what makes a quiet
 * community look broken rather than merely quiet.
 *
 * **One column of ruled day rows, at every width.** The week reads top to
 * bottom: one row per day, each keeping its rule-bounded cell, with the day's
 * own tracked-caps label at its head. The `gap-px` over a rule-coloured ground
 * is what draws the rules, so cells share them with their neighbours rather
 * than sitting in gaps — it never becomes an unruled card list; losing the
 * rules loses the world.
 *
 * This replaces the seven-column week lattice. That arrangement put a whole
 * week on one screen, but it bought that by making every cell live inside a
 * 12.5rem column — which meant a column floor, a horizontally scrolling rail,
 * and a board far wider than the heading and filters above it. Reading a week
 * down the page needs none of that, so the floor, the rail and the board's
 * extra-wide measure are all gone with it. See DESIGN.md, *Signature Component:
 * the Slot Cell*.
 */

/** One cell and its identity. Keys stay out of the Slot Cell's own contract. */
export type BoardSlotView = Readonly<{ key: string; cell: SlotCellData }>;

export type BoardDayView = Readonly<{
    key: string;
    /** "Monday 18 August" — the row label below `md`, `sr-only` above it. */
    heading: string;
    slots: readonly BoardSlotView[];
}>;

/**
 * A neutral-chipped strip. A community with nothing posted keeps its board and
 * says so here: neutral means *expected but not yet placed*, which is the
 * honest state of a community that has just been set up.
 */
export function BoardNotice({
    label,
    body,
}: Readonly<{ label: string; body: string }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell border border-rule bg-tile px-block py-cell'>
            <Chip variant='neutral' label={label} />
            <p className='type-caption text-secondary-foreground'>{body}</p>
        </div>
    );
}

/**
 * A day with nothing planned and nothing posted. It keeps its cell, and it
 * takes a neutral chip like an unposted day — but not the *same label*. Unposted
 * means an Admin owed a Session here and has not put one up; this day was never
 * a day anybody was going to play. Labelling both "Unposted" tells a member the
 * Admin is behind on a day nothing was ever planned for.
 */
function EmptyDay({ t }: Readonly<{ t: Dictionary }>) {
    return (
        /* An empty day takes the Session column too, so its sentence starts on
           the same left edge as every title above and below it. */
        <div className='grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-cell bg-tile p-cell'>
            <span aria-hidden='true' />
            <span className='flex flex-wrap items-center gap-cell'>
                <Chip variant='neutral' label={t.sessions.boardNothingMark} />
                <span className='type-caption text-muted-foreground'>
                    {t.sessions.boardNothingOnDay}
                </span>
            </span>
        </div>
    );
}

function BoardDay({
    day,
    t,
}: Readonly<{ day: BoardDayView; t: Dictionary }>) {
    return (
        <div className='flex flex-col gap-px bg-rule'>
            {/* The day band. It owns the date for every row beneath it, which is
                why the rows themselves carry only a time. */}
            <h2 className='bg-board px-cell py-hair type-label text-muted-foreground'>
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
    t,
}: Readonly<{ days: readonly BoardDayView[]; t: Dictionary }>) {
    return (
        /* No tab stop and no scroll rail: the week runs down the page, so there
           is nothing to scroll sideways and every cell is reached in reading
           order. Each day names itself, so the board needs no column heads. */
        <section aria-label={t.sessions.boardLabel}>
            <div className='grid grid-cols-1 gap-px rounded-sm border border-rule bg-rule'>
                {days.map((day) => (
                    <BoardDay key={day.key} day={day} t={t} />
                ))}
            </div>
        </section>
    );
}

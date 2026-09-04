import { DashPattern } from '@/components/patterns/DashPattern';
import { Chip } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { WeekSessionCard } from './week-session-card';
import type { WeekStripDayView } from './week-strip-view';

/**
 * The week strip: the chosen week as seven day columns on a wide screen, one
 * column of day headings and cards on a phone. Every day is here, none skipped —
 * `docs/adr/0014-member-session-card-conventions.md` argues why.
 *
 * `STRIP_MEASURE` is what sizes the columns to hold a card; see the note on it
 * in `src/components/layout/measure.ts`.
 */

/**
 * The dashed slot's texture. Deliberately larger than the slot it sits in and
 * clipped by it: `DashPattern` draws a fixed 100px-wide diagonal band whatever
 * its `size`, so a size below the slot's own height would leave a bare corner.
 */
const EMPTY_SLOT_PATTERN_PX = 160;

/**
 * A day with nothing planned and nothing posted.
 *
 * It takes a neutral chip like an unposted slot, but **not the same label**.
 * Unposted means an Admin owed a Session here and has not put one up; this day
 * was never a day anybody was going to play. Labelling both "Unposted" tells a
 * member the Admin is behind on a day nothing was ever planned for.
 */
function EmptyDaySlot({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='relative flex min-h-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card p-cell'>
            <DashPattern
                size={EMPTY_SLOT_PATTERN_PX}
                className='absolute -top-6 left-0'
            />
            <Chip
                variant='neutral'
                label={t.sessions.boardNothingMark}
                className='relative max-w-full justify-start whitespace-normal text-left'
            />
        </div>
    );
}

/**
 * One day column: its heading, then its cards in start order.
 *
 * The heading's two visible parts are `aria-hidden` and one `sr-only` line
 * carries the whole date, so a screen reader hears "Monday 18 August" once
 * rather than "Monday" and a bare number.
 */
function StripDay({
    day,
    t,
}: Readonly<{ day: WeekStripDayView; t: Dictionary }>) {
    return (
        <div className='flex flex-col gap-cell'>
            <h2 className='flex items-baseline gap-cell'>
                <span aria-hidden='true' className='type-label text-muted-foreground'>
                    {day.weekdayLabel}
                </span>
                <span aria-hidden='true' className='type-figure-lead text-foreground'>
                    {day.dayOfMonth}
                </span>
                <span className='sr-only'>{day.heading}</span>
            </h2>
            {day.slots.length === 0 ? (
                <EmptyDaySlot t={t} />
            ) : (
                day.slots.map((slot) => (
                    <WeekSessionCard key={slot.key} card={slot.card} t={t} />
                ))
            )}
        </div>
    );
}

/**
 * The strip's own designed notice — a card with a neutral chip and one
 * sentence. Neutral means *expected but not yet placed*, which is the honest
 * state of a community that has just been set up; a dropped surface would read
 * as broken rather than as quiet, so the strip below it still draws every day.
 */
export function StripNotice({
    label,
    body,
}: Readonly<{ label: string; body: string }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell rounded-xl bg-card p-block shadow-lift'>
            <Chip variant='neutral' label={label} />
            <p className='type-caption text-secondary-foreground'>{body}</p>
        </div>
    );
}

export function WeekStrip({
    days,
    t,
}: Readonly<{ days: readonly WeekStripDayView[]; t: Dictionary }>) {
    return (
        /* No tab stop and no scroll rail: every card is reached in reading
           order, column by column. Each day names itself, so the strip needs no
           separate row of column heads. */
        <section aria-label={t.sessions.boardLabel}>
            <div className='grid grid-cols-1 items-start gap-bay lg:grid-cols-7 lg:gap-cell'>
                {days.map((day) => (
                    <StripDay key={day.key} day={day} t={t} />
                ))}
            </div>
        </section>
    );
}

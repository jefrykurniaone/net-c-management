import { Chip } from '@/components/ui/chip';
import { SlotCell } from '@/components/sessions/slot-cell';
import type { BoardDay, BoardSlot } from '@/lib/board-days';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { dashboardSlotCell, type DashboardSlotContext } from './dashboard-slot-data';

/**
 * One Activity's own small board on the dashboard: every day of its range,
 * empty ones included, each carrying its own date since there is no day band
 * above these rows to carry it instead (see `SlotCellData.day`). A day with a
 * Session — posted, or the standing weekly slot with nothing posted yet —
 * renders through the Slot Cell, exactly as the sessions board draws it; a
 * day with neither takes a neutral chip, the same state an unposted day takes,
 * just with no Activity to name.
 *
 * `gap-px` over a rule-coloured ground draws the lattice's shared rules, the
 * same device `SessionsBoard` uses — so this stays a ruled column of day
 * cells rather than an unruled list of floating cards, at every width.
 */

/** A day with nothing posted and nothing planned. Still keeps its own date. */
function EmptyDayCell({
    day,
    t,
}: Readonly<{ day: BoardDay; t: Dictionary }>) {
    return (
        <div className='grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-cell bg-tile p-cell'>
            <span className='flex flex-col gap-hair'>
                <span className='type-label text-muted-foreground'>
                    {t.sessions.boardDaysShort[day.weekday]}
                </span>
                <span className='type-figure-lead text-foreground'>
                    {day.dayOfMonth}
                </span>
            </span>
            <span className='flex flex-wrap items-center gap-cell'>
                <Chip variant='neutral' label={t.sessions.boardNothingMark} />
                <span className='type-caption text-muted-foreground'>
                    {t.sessions.boardNothingOnDay}
                </span>
            </span>
        </div>
    );
}

/**
 * The board's own key rule. A posted Session is identified by its own id: two
 * Sessions of the same Activity on the same day are ordinary — an early and a
 * late slot — and keying both by day and Activity would collide. A standing
 * slot has no Session to name it, so the day and the Activity do.
 */
function slotKey(day: BoardDay, slot: BoardSlot): string {
    if (slot.kind === 'posted') return slot.session.id;
    return `${day.dayKey}:${slot.activity.id}`;
}

export function ActivityDayCells({
    days,
    context,
}: Readonly<{ days: readonly BoardDay[]; context: DashboardSlotContext }>) {
    return (
        <div className='grid grid-cols-1 gap-px rounded-sm border border-rule bg-rule'>
            {days.flatMap((day) =>
                day.slots.length === 0
                    ? [<EmptyDayCell key={day.dayKey} day={day} t={context.t} />]
                    : day.slots.map((slot) => (
                          <SlotCell
                              key={slotKey(day, slot)}
                              data={dashboardSlotCell(slot, day, context)}
                              t={context.t}
                          />
                      )),
            )}
        </div>
    );
}

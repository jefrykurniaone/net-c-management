import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { StatusValue } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { sessionState } from '@/lib/status-chip';
import type { SessionRegisterRow } from './session-rows';

/**
 * The values one Session row holds. The register owns where each of these lands
 * and how it rules; these components own only what a single value looks like.
 *
 * Two of them are figures a reader has to be told the sense of: `6/16` does not
 * say which number is the capacity, and `2/6` does not say which is the floor.
 * Each carries the figure for the eye and a spoken sentence beside it for a
 * screen reader, rather than an `aria-label` on a `<span>`, which carries no
 * role to hang one on.
 */

const DATE_FORMAT = 'd MMM yyyy';

/** An en dash between two times, never a hyphen: this is a range. */
const TIME_RANGE_DASH = '–';

/** When it is. The date leads, the slot reads beneath it. */
export function SessionWhen({
    session,
    dateLocale,
}: Readonly<{ session: SessionRegisterRow; dateLocale: DateFnsLocale }>) {
    return (
        <span className='flex flex-col gap-hair'>
            <span className='whitespace-nowrap tabular-nums text-foreground'>
                {format(session.date, DATE_FORMAT, { locale: dateLocale })}
            </span>
            <span className='type-caption whitespace-nowrap tabular-nums text-muted-foreground'>
                {session.startTime}
                {TIME_RANGE_DASH}
                {session.endTime}
            </span>
        </span>
    );
}

/**
 * What it is. A cancelled Session's title is drawn through `StatusValue`, which
 * recedes the value and leaves the word "Cancelled" to the void chip in the
 * standing column. Nothing is struck: a line through the title would read as
 * damage to the row rather than as a state.
 */
export function SessionTitle({
    session,
}: Readonly<{ session: SessionRegisterRow }>) {
    return (
        <StatusValue
            state={sessionState(session.status)}
            className='type-title text-foreground'>
            {session.title}
        </StatusValue>
    );
}

/** Which Activity it belongs to: the initial tile, and the name beside it. */
export function SessionActivity({
    session,
}: Readonly<{ session: SessionRegisterRow }>) {
    return (
        <ActivityBadge name={session.activityName} icon={session.activityIcon} />
    );
}

/** Held Seats over the capacity they are held against. */
export function SessionCapacity({
    session,
    t,
}: Readonly<{ session: SessionRegisterRow; t: Dictionary }>) {
    const spoken = t.admin.seatsHeldSpoken
        .replace('{n}', String(session.heldSeats))
        .replace('{max}', String(session.maxPlayers));
    return (
        <span>
            <span aria-hidden>
                {session.heldSeats}/{session.maxPlayers}
            </span>
            <span className='sr-only'>{spoken}</span>
        </span>
    );
}

/**
 * The cost-sharing floor: what has been committed against what the Activity
 * needs for this Session to pay for itself. A Session short of its floor says
 * so **in words** — the Admin deciding whether to cancel before the day is not
 * asked to compare two colours, or to work out which figure is which.
 */
export function SessionFloorCell({
    session,
    t,
}: Readonly<{ session: SessionRegisterRow; t: Dictionary }>) {
    const { floor } = session;
    if (floor === null) {
        return (
            <span className='type-caption text-muted-foreground'>
                {t.admin.floorNone}
            </span>
        );
    }
    const spoken = t.admin.floorSpoken
        .replace('{n}', String(floor.committed))
        .replace('{needed}', String(floor.needed));
    return (
        <span className='flex flex-col items-start gap-hair md:items-end'>
            <span>
                <span aria-hidden>
                    {floor.committed}/{floor.needed}
                </span>
                <span className='sr-only'>{spoken}</span>
            </span>
            {!floor.isMet && (
                <span className='type-caption text-muted-foreground'>
                    {t.admin.floorShort}
                </span>
            )}
        </span>
    );
}

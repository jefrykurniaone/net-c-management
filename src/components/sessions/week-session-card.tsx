import Link from 'next/link';
import { ActivityTile } from '@/components/activity/activity-tile';
import { Chip, StatusValue } from '@/components/ui/chip';
import { sessionState, type ChipVariant } from '@/lib/status-chip';
import type { SessionStanding } from '@/lib/session-standing';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { wibClockLabel } from '@/lib/wib';
import { cn } from '@/lib/utils';
import { SeatAction } from './seat-action';
import type { WeekCardData } from './week-strip-view';

/**
 * One Session as a card in the week strip.
 *
 * **This card is the week strip's own, deliberately.** ADR 0003 retired the one
 * shared Slot Cell: each member surface composes its own card markup, and what
 * stays shared is the *deciding* — `resolveSessionStanding` for the state and
 * `slotActionFor` for the action, both already resolved into
 * {@link WeekCardData} before this component is reached. Nothing here works out
 * a colour, a label or a permission.
 *
 * **The conventions every other member Session card mirrors** (#160 dashboard,
 * #161 detail, #162 pay), settled here because this is the first of them:
 *
 * 1. **Information order, top to bottom, always:** start–end time as Figure;
 *    the Activity tile beside the Session title; the venue as Caption; at most
 *    one note under it; then the footer.
 * 2. **The chip sits at the footer's leading edge.** One chip, never two, and
 *    the free-Seat figure stands in its place where the standing is a number.
 * 3. **The action sits at the footer's trailing edge**, and is a **sibling** of
 *    the card's link, never a child of it. A control nested inside a link is
 *    invalid markup, unreachable in the tab order some of the time, and
 *    activated differently by different browsers. Card link and action are two
 *    tab stops, in that order.
 * 4. **The card stacks; it never puts a chip beside a figure on one line.** A
 *    day column is ~174px wide (`STRIP_MEASURE`), and the longest chip label
 *    this product sets is most of it.
 *
 * The whole information area is the link. The footer is not: it holds the chip,
 * which is a state rather than a destination, and the action, which is a button.
 */

/** A void Session dims its title. Nothing is ever struck through — DESIGN.md. */
const TITLE_CLASS = 'type-title break-words text-card-foreground';

/**
 * The card's face. No border: a Rally card is bounded by its own face and its
 * shadow, and the footer's `border-t` is a divider inside it rather than an edge
 * around it.
 */
const CARD_CLASS = 'flex flex-col rounded-xl bg-card shadow-lift';

/** A card that opens something lifts under a pointer. One that does not, does not. */
const CARD_LINKED = 'transition-rally hover:shadow-lift-hover';

/**
 * The information area. The focus ring is drawn 2px *inside* its own edge and
 * takes the card's top corners, so it reads as the card being focused rather
 * than as a rectangle laid over it.
 */
const BODY_CLASS = [
    'flex flex-col gap-hair rounded-t-xl p-cell',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:[outline-offset:-2px]',
].join(' ');

/** The footer, on the card's own muted wash — the same treatment `Card` gives it. */
const FOOTER_CLASS = [
    'flex flex-wrap items-center justify-between gap-cell',
    'rounded-b-xl border-t border-border bg-muted/50 px-cell py-cell',
].join(' ');

/**
 * A chip label may be longer than the column is wide — the Indonesian *Belum
 * Dipasang* is most of a 154px content width on its own — so a chip on this
 * surface wraps rather than running out of its card.
 */
const CHIP_WRAP = 'max-w-full justify-start whitespace-normal text-left';

interface StandingCopy {
    /** `null` where the standing is the seat figure rather than a chip. */
    readonly chip: Readonly<{ variant: ChipVariant; label: string }> | null;
    /** The one line under a chip: a held Seat's payment deadline. */
    readonly caption: string | null;
    /** The standing in full, for the card's own accessible name. */
    readonly spoken: string;
}

function seatsSpoken(
    seats: Readonly<{ free: number; max: number }>,
    t: Dictionary,
): string {
    return t.sessions.boardSeatsAria
        .replace('{n}', String(seats.free))
        .replace('{max}', String(seats.max));
}

/** The words for one resolved standing. The variant is the resolver's, never this file's. */
function standingCopy(standing: SessionStanding, t: Dictionary): StandingCopy {
    if (standing.kind === 'seats') {
        return {
            chip: null,
            caption: null,
            spoken: seatsSpoken(standing.seats, t),
        };
    }
    if (standing.kind === 'full') {
        const label = t.sessions.full;
        return { chip: { variant: standing.variant, label }, caption: null, spoken: label };
    }
    if (standing.kind === 'held') {
        const label = t.sessions.weekSeatHeld;
        const caption = t.sessions.weekHoldPayBy.replace(
            '{time}',
            wibClockLabel(standing.holdExpiresAt),
        );
        return {
            chip: { variant: standing.variant, label },
            caption,
            spoken: `${label}, ${caption}`,
        };
    }
    const label = t.chips[standing.labelKey];
    return { chip: { variant: standing.variant, label }, caption: null, spoken: label };
}

/** Free Seats spelled out, with the spoken form beside it for a screen reader. */
function SeatsFigure({
    seats,
    t,
}: Readonly<{ seats: Readonly<{ free: number; max: number }>; t: Dictionary }>) {
    return (
        <span className='type-figure text-foreground'>
            <span aria-hidden='true'>
                {t.sessions.weekSeatsFigure
                    .replace('{n}', String(seats.free))
                    .replace('{max}', String(seats.max))}
            </span>
            <span className='sr-only'>{seatsSpoken(seats, t)}</span>
        </span>
    );
}

/** The footer's leading edge: exactly one chip, or the figure in its place. */
function CardStanding({
    standing,
    copy,
    t,
}: Readonly<{ standing: SessionStanding; copy: StandingCopy; t: Dictionary }>) {
    if (standing.kind === 'seats') {
        return <SeatsFigure seats={standing.seats} t={t} />;
    }
    if (copy.chip === null) return null;
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <Chip
                variant={copy.chip.variant}
                label={copy.chip.label}
                className={CHIP_WRAP}
            />
            {copy.caption !== null && (
                <span className='type-caption tabular-nums text-muted-foreground'>
                    {copy.caption}
                </span>
            )}
        </span>
    );
}

/** The Session title, dimmed where the Session is void rather than struck through. */
function CardTitleLine({ card }: Readonly<{ card: WeekCardData }>) {
    if (card.status === null) {
        return <h3 className={TITLE_CLASS}>{card.title}</h3>;
    }
    return (
        <h3>
            <StatusValue state={sessionState(card.status)} className={TITLE_CLASS}>
                {card.title}
            </StatusValue>
        </h3>
    );
}

const NOTE_COPY = {
    unposted: (t: Dictionary) => t.sessions.boardNotPosted,
    optedOut: (t: Dictionary) => t.sessions.boardOptedOut,
} as const;

/** The information area's own contents. Identical whether or not it is a link. */
function CardBody({
    card,
    t,
}: Readonly<{ card: WeekCardData; t: Dictionary }>) {
    const note = card.note === null ? null : NOTE_COPY[card.note](t);
    return (
        <>
            <span className='type-figure text-foreground'>
                {card.startTime}–{card.endTime}
            </span>
            {/* The Activity's name is not visible text on this card — the tile
                is what identifies it, so the tile is labelled and titled rather
                than decorative, and the card's own accessible name says it in
                words as well. */}
            <div className='flex items-start gap-cell'>
                <ActivityTile
                    name={card.activityName}
                    icon={card.activityIcon}
                    size='row'
                />
                <CardTitleLine card={card} />
            </div>
            <span className='type-caption break-words text-secondary-foreground'>
                {card.location}
            </span>
            {note !== null && (
                <span className='type-caption text-muted-foreground'>{note}</span>
            )}
        </>
    );
}

export function WeekSessionCard({
    card,
    t,
}: Readonly<{ card: WeekCardData; t: Dictionary }>) {
    const copy = standingCopy(card.standing, t);
    const aria = t.sessions.weekCardAria
        .replace('{day}', card.dayLabel)
        .replace('{time}', `${card.startTime}–${card.endTime}`)
        .replace('{activity}', card.activityName)
        .replace('{title}', card.title)
        .replace('{venue}', card.location)
        .replace('{status}', copy.spoken);

    return (
        <article className={cn(CARD_CLASS, card.href !== null && CARD_LINKED)}>
            {card.href === null ? (
                <div className={BODY_CLASS}>
                    <CardBody card={card} t={t} />
                </div>
            ) : (
                <Link href={card.href} aria-label={aria} className={BODY_CLASS}>
                    <CardBody card={card} t={t} />
                </Link>
            )}
            <div className={FOOTER_CLASS}>
                <CardStanding standing={card.standing} copy={copy} t={t} />
                {card.action !== null && (
                    <SeatAction action={card.action} title={card.title} />
                )}
            </div>
        </article>
    );
}

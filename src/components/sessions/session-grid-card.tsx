import Link from 'next/link';
import type { SessionStatus } from '@prisma/client';
import { Chip, StatusValue } from '@/components/ui/chip';
import { sessionState, type ChipVariant } from '@/lib/status-chip';
import type { SeatFigure, SessionStanding } from '@/lib/session-standing';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { wibClockLabel } from '@/lib/wib';
import { SeatAction } from './seat-action';
import type { SlotCellAction } from './slot-cell-data';

/**
 * One Session as a card in an Activity section's grid, on a sessions page that
 * is no longer a week.
 *
 * Its cell is about 380px rather than the week strip's 174px day column, and the
 * section header above it already draws the Activity's name and icon tile, so
 * the date leads and the Activity is not repeated. What it still does exactly as
 * every other member card does: it decides no state, no colour, no label and no
 * permitted action — {@link SessionGridCardData} arrives resolved. Both halves
 * are argued in `docs/adr/0018-session-cards-outside-a-week.md`, which supersedes
 * the parts of `docs/adr/0014-member-session-card-conventions.md` this surface
 * removes the premises of.
 *
 * {@link SessionGridCardData} is declared here rather than in a `-view` module
 * (`docs/adr/0006-view-modules.md`) because the view that builds it is the
 * sessions page's own, wired in #333; the type moves there with no change to
 * this file's props if that page prefers to own it.
 */

/** A void Session dims its date. Nothing is ever struck through — DESIGN.md. */
const DATE_CLASS = 'type-title break-words text-card-foreground';

/**
 * The card's face. No border: a Rally card is bounded by its own face and its
 * shadow, and the footer's `border-t` is a divider inside it rather than an edge
 * around it. Every card here opens its Session, so the lift is unconditional.
 */
const CARD_CLASS = [
    'flex flex-col rounded-xl bg-card shadow-lift',
    'transition-rally hover:shadow-lift-hover',
].join(' ');

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
 * The one sentence a card may carry under its fill line. `unposted` is absent by
 * construction: this page draws posted Sessions only, so a card here always has
 * a Session to open and a status to be in.
 */
export type SessionGridCardNote = 'optedOut' | null;

/** Everything one grid card draws. Data only — the card takes no nodes. */
export type SessionGridCardData = Readonly<{
    /** "Tue 18 Aug" — weekday and date, and the card's own heading. */
    dateLabel: string;
    /** "Tuesday 18 August" — spoken into the card's own accessible name. */
    dayLabel: string;
    startTime: string;
    endTime: string;
    location: string;
    /** Free Seats and capacity. Drawn on every card, whatever the standing. */
    seats: SeatFigure;
    /** Spoken, never drawn: the Session's title names the card to a screen reader
     *  and names the Seat control it sits beside. */
    title: string;
    /** Spoken, never drawn: the section header above the grid draws the Activity. */
    activityName: string;
    href: string;
    status: SessionStatus;
    standing: SessionStanding;
    note: SessionGridCardNote;
    /** The claim or withdraw control, where the resolver offered one. */
    action: SlotCellAction | null;
}>;

interface StandingCopy {
    /** `null` where the standing is the seat figure the body already draws. */
    readonly chip: Readonly<{ variant: ChipVariant; label: string }> | null;
    /** The one line under a chip: a held Seat's payment deadline. */
    readonly caption: string | null;
    /** The standing in full, for the card's own accessible name. */
    readonly spoken: string;
}

function seatsSpoken(seats: SeatFigure, t: Dictionary): string {
    return t.sessions.boardSeatsAria
        .replace('{n}', String(seats.free))
        .replace('{max}', String(seats.max));
}

/** The words for one resolved standing. The variant is the resolver's, never this file's. */
function standingCopy(standing: SessionStanding, t: Dictionary): StandingCopy {
    if (standing.kind === 'seats') {
        return { chip: null, caption: null, spoken: seatsSpoken(standing.seats, t) };
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

/**
 * How full the Session is, on the card itself rather than standing in the chip's
 * place: the cell is wide enough to say both, and a member deciding from the
 * grid needs the number whatever their own Seat says.
 */
function CardFill({ seats, t }: Readonly<{ seats: SeatFigure; t: Dictionary }>) {
    return (
        <span className='type-figure text-foreground'>
            {t.sessions.weekSeatsFigure
                .replace('{n}', String(seats.free))
                .replace('{max}', String(seats.max))}
        </span>
    );
}

/** The information area's own contents, in the order the card is read. */
function CardBody({
    card,
    t,
}: Readonly<{ card: SessionGridCardData; t: Dictionary }>) {
    return (
        <>
            <h3>
                <StatusValue state={sessionState(card.status)} className={DATE_CLASS}>
                    {card.dateLabel}
                </StatusValue>
            </h3>
            <span className='type-figure text-foreground'>
                {card.startTime}–{card.endTime}
            </span>
            <span className='type-caption break-words text-secondary-foreground'>
                {card.location}
            </span>
            <CardFill seats={card.seats} t={t} />
            {card.note !== null && (
                <span className='type-caption text-muted-foreground'>
                    {t.sessions.boardOptedOut}
                </span>
            )}
        </>
    );
}

/**
 * One chip at the leading edge, the Seat control at the trailing edge, and
 * nothing at all where the standing is the fill figure and no action is offered
 * — an empty bar under every card would read as a control that failed to draw.
 */
function CardFooter({
    card,
    copy,
}: Readonly<{ card: SessionGridCardData; copy: StandingCopy }>) {
    if (copy.chip === null && card.action === null) {
        return null;
    }
    return (
        <div className={FOOTER_CLASS}>
            {copy.chip !== null && (
                <span className='flex min-w-0 flex-col gap-hair'>
                    <Chip variant={copy.chip.variant} label={copy.chip.label} />
                    {copy.caption !== null && (
                        <span className='type-caption tabular-nums text-muted-foreground'>
                            {copy.caption}
                        </span>
                    )}
                </span>
            )}
            {card.action !== null && (
                <span className='ms-auto'>
                    <SeatAction action={card.action} title={card.title} />
                </span>
            )}
        </div>
    );
}

export function SessionGridCard({
    card,
    t,
}: Readonly<{ card: SessionGridCardData; t: Dictionary }>) {
    const copy = standingCopy(card.standing, t);
    const aria = t.sessions.weekCardAria
        .replace('{day}', card.dayLabel)
        .replace('{time}', `${card.startTime}–${card.endTime}`)
        .replace('{activity}', card.activityName)
        .replace('{title}', card.title)
        .replace('{venue}', card.location)
        .replace('{status}', copy.spoken);

    return (
        <article className={CARD_CLASS}>
            <Link href={card.href} aria-label={aria} className={BODY_CLASS}>
                <CardBody card={card} t={t} />
            </Link>
            <CardFooter card={card} copy={copy} />
        </article>
    );
}

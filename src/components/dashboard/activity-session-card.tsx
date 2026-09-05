import Link from 'next/link';
import { ActivityTile } from '@/components/activity/activity-tile';
import { Chip, StatusValue } from '@/components/ui/chip';
import { sessionState, type ChipVariant } from '@/lib/status-chip';
import type { SessionStanding } from '@/lib/session-standing';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { wibClockLabel } from '@/lib/wib';
import { cn } from '@/lib/utils';
import { SeatAction } from '@/components/sessions/seat-action';
import type { DashboardCardData } from './activity-card-view';

/**
 * One Session as a compact card inside an Activity's dashboard body — the
 * dashboard's own card, mirroring #159's conventions with one addition, the
 * card's own date on the time line.
 *
 * The conventions, the shared resolvers behind {@link DashboardCardData} and
 * why the date is added here are in
 * `docs/adr/0014-member-session-card-conventions.md`.
 */

const TITLE_CLASS = 'type-title break-words text-card-foreground';
const CARD_CLASS = 'flex flex-col rounded-xl bg-card shadow-lift';
const CARD_LINKED = 'transition-rally hover:shadow-lift-hover';
const BODY_CLASS = [
    'flex flex-col gap-hair rounded-t-xl p-cell',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:[outline-offset:-2px]',
].join(' ');
const FOOTER_CLASS = [
    'flex flex-wrap items-center justify-between gap-cell',
    'rounded-b-xl border-t border-border bg-muted/50 px-cell py-cell',
].join(' ');
const CHIP_WRAP = 'max-w-full justify-start whitespace-normal text-left';

interface StandingCopy {
    readonly chip: Readonly<{ variant: ChipVariant; label: string }> | null;
    readonly caption: string | null;
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
            <Chip variant={copy.chip.variant} label={copy.chip.label} className={CHIP_WRAP} />
            {copy.caption !== null && (
                <span className='type-caption tabular-nums text-muted-foreground'>
                    {copy.caption}
                </span>
            )}
        </span>
    );
}

function CardTitleLine({ card }: Readonly<{ card: DashboardCardData }>) {
    return (
        <h3>
            <StatusValue state={sessionState(card.status)} className={TITLE_CLASS}>
                {card.title}
            </StatusValue>
        </h3>
    );
}

const NOTE_COPY = {
    optedOut: (t: Dictionary) => t.sessions.boardOptedOut,
} as const;

function CardBody({ card, t }: Readonly<{ card: DashboardCardData; t: Dictionary }>) {
    const note = card.note === null ? null : NOTE_COPY[card.note](t);
    return (
        <>
            <div className='flex items-baseline gap-cell'>
                <span className='type-label text-muted-foreground'>{card.dateLabel}</span>
                <span className='type-figure text-foreground'>
                    {card.startTime}–{card.endTime}
                </span>
            </div>
            <div className='flex items-start gap-cell'>
                <ActivityTile name={card.activityName} icon={card.activityIcon} size='row' />
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

export function ActivitySessionCard({
    card,
    t,
}: Readonly<{ card: DashboardCardData; t: Dictionary }>) {
    const copy = standingCopy(card.standing, t);
    const aria = t.sessions.weekCardAria
        .replace('{day}', card.dayLabel)
        .replace('{time}', `${card.startTime}–${card.endTime}`)
        .replace('{activity}', card.activityName)
        .replace('{title}', card.title)
        .replace('{venue}', card.location)
        .replace('{status}', copy.spoken);

    return (
        <article className={cn(CARD_CLASS, CARD_LINKED)}>
            <Link href={card.href} aria-label={aria} className={BODY_CLASS}>
                <CardBody card={card} t={t} />
            </Link>
            <div className={FOOTER_CLASS}>
                <CardStanding standing={card.standing} copy={copy} t={t} />
                {card.action !== null && (
                    <SeatAction action={card.action} title={card.title} />
                )}
            </div>
        </article>
    );
}

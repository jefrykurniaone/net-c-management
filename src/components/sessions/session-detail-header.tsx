import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import { ActivityTile } from '@/components/activity/activity-tile';
import { Chip, StatusChip, StatusValue } from '@/components/ui/chip';
import {
    attendanceState,
    sessionState,
    type ChipVariant,
} from '@/lib/status-chip';
import {
    resolveSessionStanding,
    type SeatFigure,
    type SessionStanding,
} from '@/lib/session-standing';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellQuota } from './slot-cell-data';

/**
 * The session detail page's own header card, mirroring #159's conventions.
 *
 * It carries no action row and is not passed `holdExpiresAt`, so a Seat held on
 * unverified money reads here as a plain Registered chip; the RSVP card below is
 * where the deadline is surfaced. Both are sanctioned deviations, argued in
 * `docs/adr/0014-member-session-card-conventions.md`.
 */

const CARD_CLASS = 'flex flex-col rounded-xl bg-card shadow-lift';
const BODY_CLASS = 'flex flex-col gap-hair p-cell';
const FOOTER_CLASS = [
    'flex items-center justify-between gap-cell',
    'rounded-b-xl border-t border-border bg-muted/50 px-cell py-cell',
].join(' ');
const TITLE_CLASS = 'type-title break-words text-card-foreground';
const CHIP_WRAP = 'max-w-full justify-start whitespace-normal text-left';

export interface SessionDetailHeaderData {
    readonly title: string;
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly startTime: string;
    readonly endTime: string;
    readonly location: string;
    readonly activityName: string;
    /** `Activity.icon` as stored, or null for the initial tile. */
    readonly activityIcon: string | null;
    readonly status: SessionStatus;
    /** The reader's own Seat state, including a withdrawal (`ABSENT`). */
    readonly ownStatus: AttendanceStatus | null;
    readonly seats: Readonly<{ free: number; max: number }>;
    readonly quota: SlotCellQuota | null;
}

function seatsSpoken(seats: SeatFigure, t: Dictionary): string {
    return t.sessions.boardSeatsAria
        .replace('{n}', String(seats.free))
        .replace('{max}', String(seats.max));
}

/** Free Seats as `n/max`, in tabular figures, with the spoken form beside it. */
function SeatsFigure({
    seats,
    t,
}: Readonly<{ seats: SeatFigure; t: Dictionary }>) {
    return (
        <span className='type-figure text-foreground'>
            <span aria-hidden='true'>
                {seats.free}/{seats.max}
            </span>
            <span className='sr-only'>{seatsSpoken(seats, t)}</span>
        </span>
    );
}

/** The footer's leading edge: exactly one chip, or the figure in its place. */
function HeaderStanding({
    standing,
    t,
}: Readonly<{ standing: SessionStanding; t: Dictionary }>) {
    if (standing.kind === 'seats') {
        return <SeatsFigure seats={standing.seats} t={t} />;
    }
    if (standing.kind === 'full') {
        return <Chip variant={standing.variant} label={t.sessions.full} />;
    }
    if (standing.kind === 'held') {
        return (
            <Chip variant={standing.variant} label={t.sessions.weekSeatHeld} />
        );
    }
    return <Chip variant={standing.variant} label={t.chips[standing.labelKey]} />;
}

interface QuotaCopy {
    readonly variant: ChipVariant;
    readonly label: string;
}

function quotaCopy(quota: SlotCellQuota, t: Dictionary): QuotaCopy {
    const said = quota.isMet
        ? t.sessions.quotaMet
        : t.sessions.quotaNeedMore.replace(
              '{n}',
              String(quota.needed - quota.committed),
          );
    return {
        variant: quota.isMet ? 'settled' : 'provisional',
        label: `${said} (${quota.committed}/${quota.needed})`,
    };
}

/**
 * One note under the venue line, never two — mirrors the retired Slot Cell's
 * `SlotNote` precedence, minus the unposted branch a live Session never
 * reaches here: the reader's own withdrawal outranks the Activity's viability
 * quota because it is about them.
 */
function HeaderNote({
    ownStatus,
    quota,
    t,
}: Readonly<{
    ownStatus: AttendanceStatus | null;
    quota: SlotCellQuota | null;
    t: Dictionary;
}>) {
    if (ownStatus === 'ABSENT') {
        return (
            <span className='flex flex-wrap items-center gap-hair'>
                <StatusChip state={attendanceState('ABSENT')} labels={t.chips} />
                <span className='type-caption text-muted-foreground'>
                    {t.sessions.boardOptedOut}
                </span>
            </span>
        );
    }
    if (quota === null || quota.needed <= 0) return null;
    const copy = quotaCopy(quota, t);
    return (
        <Chip variant={copy.variant} label={copy.label} className={CHIP_WRAP} />
    );
}

/** The card's own body: the time, the Activity tile beside the title, the
 *  venue, and at most one note — identical order to #159's `WeekSessionCard`. */
function HeaderBody({
    session,
    t,
}: Readonly<{ session: SessionDetailHeaderData; t: Dictionary }>) {
    return (
        <>
            <span className='flex items-baseline gap-cell'>
                <span className='type-label text-muted-foreground'>
                    {t.days[session.date.getUTCDay()]} {session.date.getUTCDate()}
                </span>
                <span className='type-figure text-foreground'>
                    {session.startTime}–{session.endTime}
                </span>
            </span>
            <div className='flex items-start gap-cell'>
                <ActivityTile
                    name={session.activityName}
                    icon={session.activityIcon}
                    size='row'
                />
                <h3>
                    <StatusValue
                        state={sessionState(session.status)}
                        className={TITLE_CLASS}>
                        {session.title}
                    </StatusValue>
                </h3>
            </div>
            <span className='type-caption break-words text-secondary-foreground'>
                {session.location}
            </span>
            <HeaderNote
                ownStatus={session.ownStatus}
                quota={session.quota}
                t={t}
            />
        </>
    );
}

export function SessionDetailHeader({
    session,
    t,
}: Readonly<{ session: SessionDetailHeaderData; t: Dictionary }>) {
    const standing = resolveSessionStanding({
        status: session.status,
        ownStatus: session.ownStatus,
        seats: session.seats,
    });
    return (
        <article className={CARD_CLASS}>
            <div className={BODY_CLASS}>
                <HeaderBody session={session} t={t} />
            </div>
            <div className={FOOTER_CLASS}>
                <HeaderStanding standing={standing} t={t} />
            </div>
        </article>
    );
}

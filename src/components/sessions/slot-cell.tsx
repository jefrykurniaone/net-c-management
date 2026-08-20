import Link from 'next/link';
import type { AttendanceStatus, SessionStatus } from '@prisma/client';
import { ActivityTile } from '@/components/activity/activity-badge';
import { Mark, MarkedValue, StateMark } from '@/components/ui/mark';
import { attendanceState, sessionState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { cn } from '@/lib/utils';

/**
 * The Slot Cell — one Session on the board, and the single seam for rendering
 * one anywhere in the app. The dashboard, the sessions board and the session
 * detail header compose from this rather than each inventing their own card.
 *
 * **A row of three columns, in fixed positions, always:**
 *
 * 1. **when** — the start time as Figure, in a fixed-width leading column, so
 *    times line up down the whole week. Where the caller has no day band above
 *    the row to carry the date, {@link SlotCellData.day} puts it in this same
 *    column above the time; the board leaves it out because its band owns it.
 * 2. **what** — the Session title as Title, on the first line; then venue and
 *    the Activity's livery as Caption on the second.
 * 3. **standing** — free Seats as `n/max` in Figure **or** a mark, hard right of
 *    the first line, so every mark on the surface sits on one edge.
 *
 * The unposted sentence and the quota share the second column below the venue —
 * only one of them can ever apply.
 *
 * The positions are non-negotiable: a member reads any row in two seconds
 * because everything is always in the same place, and one row that reflows
 * under pressure breaks that promise for every row. So this component takes
 * **data, never nodes** — there is no `children`, no slot props and no ordering
 * prop, because a caller that can pass a node can reorder the row.
 *
 * Livery is a magnet tile bearing the Activity's initial, with no colour
 * ({@link ActivityTile}) — never a coloured square and never an edge stripe.
 *
 * Every state here comes from the mark resolver. The two direct {@link Mark}
 * uses are the two things on this surface with no stored state: a day nobody
 * has posted a Session on, and a Seat nobody has claimed.
 */

export type SlotCellSeats = Readonly<{
    /** Free Seats — capacity minus the seat-holding rows. */
    free: number;
    max: number;
}>;

/** `getSessionQuotas`' result for one Session. `needed <= 0` means no quota. */
export type SlotCellQuota = Readonly<{
    committed: number;
    needed: number;
    isMet: boolean;
}>;

export type SlotCellData = Readonly<{
    /**
     * The date, for a caller with no day band above the row to carry it — the
     * dashboard, a detail header. `null` on the sessions board, whose band says
     * the date once for every row under it.
     */
    day: Readonly<{ label: string; dayOfMonth: number }> | null;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    activityName: string;
    /** `null` where there is nothing to open — an unposted standing slot. */
    href: string | null;
    /** `null` means unposted: a standing weekly slot with no Session on it. */
    status: SessionStatus | null;
    /** The reader's own Seat state in this Session, where they have one. */
    ownStatus: AttendanceStatus | null;
    seats: SlotCellSeats | null;
    quota: SlotCellQuota | null;
}>;

/**
 * The own-Seat states worth preempting the seat figure with. `ABSENT` — Opted
 * Out — is deliberately absent: the member released that Seat, so the free-Seat
 * figure is the fact they now need, and their own withdrawal is on the Session
 * itself. Nothing produces a No-Show, so nothing here draws Hollow.
 */
const OWN_STATES_MARKED: readonly AttendanceStatus[] = [
    'REGISTERED',
    'PRESENT',
    'MAYBE',
];

/**
 * Three columns: the fixed-width `when` rail, the Session, and the standing
 * hard right. `items-baseline` sets the time on the title's baseline rather
 * than its box, so the two read as one line.
 */
const CELL_CLASS = [
    'grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline',
    'gap-x-cell gap-y-hair bg-tile p-cell',
].join(' ');

/* An offset ring would be clipped by the lattice's own `overflow-hidden`, so
   the focus ring is drawn 2px *inside* the cell edge instead. */
const CELL_INTERACTIVE = cn(
    'transition-colors hover:bg-board active:shadow-tile-pressed',
    'focus-visible:outline-2 focus-visible:outline-ring',
    'focus-visible:[outline-offset:-2px]',
);

/** Free Seats as `n/max`, in tabular figures under a tracked-caps label. */
function FreeSeats({
    seats,
    t,
}: Readonly<{ seats: SlotCellSeats; t: Dictionary }>) {
    const spoken = t.sessions.boardSeatsAria
        .replace('{n}', String(seats.free))
        .replace('{max}', String(seats.max));
    return (
        <span className='flex flex-col items-end gap-hair'>
            <span className='type-label text-muted-foreground'>
                {t.sessions.boardSeatsFree}
            </span>
            <span className='type-figure text-foreground'>
                <span aria-hidden='true'>
                    {seats.free}/{seats.max}
                </span>
                <span className='sr-only'>{spoken}</span>
            </span>
        </span>
    );
}

/**
 * The top-right slot, which holds exactly one thing. A cancelled Session
 * overrides the reader's own Seat, their own Seat overrides the Session's point
 * in its life, and the seat figure is what a live Session with Seats left shows.
 */
function TopRight({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    if (data.status === null) {
        return <Mark kind='blank'>{t.marks.unposted}</Mark>;
    }
    if (data.status === 'CANCELLED') {
        return <StateMark state={sessionState(data.status)} labels={t.marks} />;
    }
    if (data.ownStatus !== null && OWN_STATES_MARKED.includes(data.ownStatus)) {
        return (
            <StateMark state={attendanceState(data.ownStatus)} labels={t.marks} />
        );
    }
    if (data.status !== 'SCHEDULED') {
        return <StateMark state={sessionState(data.status)} labels={t.marks} />;
    }
    if (data.seats === null) {
        return <Mark kind='blank'>{t.marks.unposted}</Mark>;
    }
    if (data.seats.free <= 0) {
        return <Mark kind='blank'>{t.sessions.full}</Mark>;
    }
    return <FreeSeats seats={data.seats} t={t} />;
}

const TITLE_CLASS = 'type-title text-card-foreground';

/**
 * A void Session dims its title rather than striking it — the strike lives on
 * the mark's own label, where one line through two words reads as a stamp
 * instead of as damage to the cell.
 */
function SlotTitle({ data }: Readonly<{ data: SlotCellData }>) {
    if (data.status === null) {
        return <h3 className={TITLE_CLASS}>{data.title}</h3>;
    }
    return (
        <h3>
            <MarkedValue
                state={sessionState(data.status)}
                className={TITLE_CLASS}>
                {data.title}
            </MarkedValue>
        </h3>
    );
}

/**
 * The Activity's minimum-members viability floor, per Session, from
 * `getSessionQuotas`. It wraps rather than running out of the cell: a mark that
 * overflows would be clipped by the lattice.
 */
function QuotaLine({
    quota,
    t,
}: Readonly<{ quota: SlotCellQuota; t: Dictionary }>) {
    const label = quota.isMet
        ? t.sessions.quotaMet
        : t.sessions.quotaNeedMore.replace(
              '{n}',
              String(quota.needed - quota.committed),
          );
    return (
        <Mark
            kind={quota.isMet ? 'ink' : 'tape'}
            className='max-w-full justify-start whitespace-normal text-left'>
            <span>{label}</span>
            <span className='tabular-nums'>
                ({quota.committed}/{quota.needed})
            </span>
        </Mark>
    );
}

/** Either the unposted sentence or the quota — never both; one is unposted. */
function SlotNote({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    if (data.status === null) {
        return (
            <p className='type-caption text-muted-foreground'>
                {t.sessions.boardNotPosted}
            </p>
        );
    }
    if (data.quota === null || data.quota.needed <= 0) return null;
    return <QuotaLine quota={data.quota} t={t} />;
}

/**
 * The `when` rail. The time is what every row shares, so it leads; the date sits
 * above it only for a caller with no band of its own (see {@link SlotCellData}).
 */
function SlotWhen({ data }: Readonly<{ data: SlotCellData }>) {
    return (
        <span className='flex flex-col gap-hair'>
            {data.day && (
                <>
                    <span className='type-label text-muted-foreground'>
                        {data.day.label}
                    </span>
                    <span className='type-figure-lead text-foreground'>
                        {data.day.dayOfMonth}
                    </span>
                </>
            )}
            <span className='type-figure text-foreground'>{data.startTime}</span>
            <span className='type-caption text-muted-foreground'>
                {data.endTime}
            </span>
        </span>
    );
}

function SlotCellBody({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    return (
        <>
            <SlotWhen data={data} />
            <SlotTitle data={data} />
            <span className='justify-self-end'>
                <TopRight data={data} t={t} />
            </span>
            {/* The venue, the livery and any note share the Session's column,
                under its title — never the `when` rail, which stays a column of
                times and nothing else. */}
            <span className='col-start-2 col-end-4 flex flex-col gap-hair'>
                <span className='flex flex-wrap items-center gap-x-cell gap-y-hair'>
                    <span className='type-caption text-secondary-foreground'>
                        {data.location}
                    </span>
                    <span className='flex items-center gap-hair'>
                        <ActivityTile name={data.activityName} />
                        <span className='type-caption truncate text-muted-foreground'>
                            {data.activityName}
                        </span>
                    </span>
                </span>
                <SlotNote data={data} t={t} />
            </span>
        </>
    );
}

export function SlotCell({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    if (data.href === null) {
        return (
            <div className={CELL_CLASS}>
                <SlotCellBody data={data} t={t} />
            </div>
        );
    }
    return (
        <Link href={data.href} className={cn(CELL_CLASS, CELL_INTERACTIVE)}>
            <SlotCellBody data={data} t={t} />
        </Link>
    );
}

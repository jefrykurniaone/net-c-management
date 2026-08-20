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
 * Six elements, in fixed positions, always:
 *
 * 1. the day as Label and 2. the date as Figure Lead, top-left;
 * 3. free Seats as `n/max` in Figure **or** a mark, top-right;
 * 4. the Session title as Title;
 * 5. time and venue as Caption;
 * 6. the Activity's livery at the bottom.
 *
 * The positions are non-negotiable: a member reads any cell in two seconds
 * because everything is always in the same place, and one cell that reflows
 * under pressure breaks that promise for every cell. So this component takes
 * **data, never nodes** — there is no `children`, no slot props and no ordering
 * prop, because a caller that can pass a node can reorder the cell. The middle
 * of the cell is the only part that varies in height, and the livery is pinned
 * to the bottom with `mt-auto` so it does not move when it does.
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
    /** The short day name — the full one is the column head. */
    dayLabel: string;
    dayOfMonth: number;
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

const CELL_CLASS = 'flex h-full flex-col gap-cell bg-tile p-cell';

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

function SlotCellBody({
    data,
    t,
}: Readonly<{ data: SlotCellData; t: Dictionary }>) {
    return (
        <>
            <div className='flex items-start justify-between gap-cell'>
                <span className='flex flex-col gap-hair'>
                    <span className='type-label text-muted-foreground'>
                        {data.dayLabel}
                    </span>
                    <span className='type-figure-lead text-foreground'>
                        {data.dayOfMonth}
                    </span>
                </span>
                <TopRight data={data} t={t} />
            </div>
            <SlotTitle data={data} />
            <p className='type-caption text-secondary-foreground'>
                {data.startTime}–{data.endTime} · {data.location}
            </p>
            <SlotNote data={data} t={t} />
            <span className='mt-auto flex items-center gap-cell pt-cell'>
                <ActivityTile name={data.activityName} />
                <span className='type-caption truncate text-muted-foreground'>
                    {data.activityName}
                </span>
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

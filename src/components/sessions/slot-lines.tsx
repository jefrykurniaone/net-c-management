import { Mark, MarkedValue, StateMark } from '@/components/ui/mark';
import { attendanceState, sessionState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { SlotCellData, SlotCellQuota } from './slot-cell-data';

/**
 * The Slot Cell's first two columns — the `when` rail, the Session's title, and
 * the one note that may sit under its venue line. Split out of `slot-cell.tsx`
 * so the cell itself stays the arrangement and nothing else.
 */

const TITLE_CLASS = 'type-title text-card-foreground';

/**
 * A void Session dims its title rather than striking it — the strike lives on
 * the mark's own label, where one line through two words reads as a stamp
 * instead of as damage to the cell.
 */
export function SlotTitle({ data }: Readonly<{ data: SlotCellData }>) {
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

/**
 * The reader's own withdrawal, said on the Session's own line rather than in the
 * standing column: that column holds exactly one thing, and the free-Seat figure
 * is the fact a member who released a Seat now needs. Erased and neutral — their
 * own choice is never dressed as a failure, and the copy says Opted Out.
 */
function OptedOutLine({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <span className='flex flex-wrap items-center gap-hair'>
            <StateMark state={attendanceState('ABSENT')} labels={t.marks} />
            <span className='type-caption text-muted-foreground'>
                {t.sessions.boardOptedOut}
            </span>
        </span>
    );
}

/**
 * One note under the venue line, never two. The unposted sentence comes first
 * because an unposted slot has no Session to have a standing in; then the
 * reader's own withdrawal, which outranks the community's quota because it is
 * about them; then the quota.
 */
export function SlotNote({
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
    if (data.ownStatus === 'ABSENT') return <OptedOutLine t={t} />;
    if (data.quota === null || data.quota.needed <= 0) return null;
    return <QuotaLine quota={data.quota} t={t} />;
}

/**
 * The `when` rail. The time is what every row shares, so it leads; the date sits
 * above it only for a caller with no band of its own (see `SlotCellData`).
 */
export function SlotWhen({ data }: Readonly<{ data: SlotCellData }>) {
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

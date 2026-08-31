import { format, type Locale as DateFnsLocale } from 'date-fns';
import { ActivityTile } from '@/components/activity/activity-tile';
import { StatusChip, StatusValue } from '@/components/ui/chip';
import type { RegisterColumn } from '@/components/admin/register-columns';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { attendanceState, paymentState } from '@/lib/status-chip';
import { modeLabel, StandingChip } from '../member-cells';
import type {
    MemberActivityRow,
    MemberAttendanceRow,
    MemberDuesRow,
} from './member-detail';

/**
 * The three registers this page is built from, described as data. The page
 * composes them; nothing here knows how a row is ruled.
 */

const SESSION_DATE_FORMAT = 'd MMM yyyy';

/** Rupiah, written the way every other surface in this app writes it. */
function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function ActivityName({
    row,
}: Readonly<{ row: MemberActivityRow }>) {
    return (
        <span className='flex items-center gap-cell'>
            <ActivityTile name={row.activityName} size='inline' />
            <span className='type-body text-foreground'>
                {row.activityName}
            </span>
        </span>
    );
}

/**
 * Each Activity the member belongs to, and what became of the Seats they held
 * on it. **No-Show** stands beside Present and Opted Out rather than replacing
 * either: Opted Out is the member's own decision, No-Show is the absence of one,
 * and the whole reason to count them separately is that the two are different
 * conversations.
 */
function countColumn(
    key: string,
    head: string,
    count: (row: MemberActivityRow) => number,
): RegisterColumn<MemberActivityRow> {
    return { key, head, kind: 'figure', render: count };
}

export function activityColumns(
    t: Dictionary,
): readonly RegisterColumn<MemberActivityRow>[] {
    return [
        {
            key: 'activity',
            head: t.admin.colActivity,
            render: (row) => <ActivityName row={row} />,
        },
        {
            key: 'mode',
            // The attendance register's own head for this column (#67). One
            // key, so two registers cannot name the same fact two ways.
            head: t.admin.colPaymentMode,
            render: (row) => (
                <span className='type-caption text-muted-foreground'>
                    {modeLabel(row.mode, t)}
                </span>
            ),
        },
        countColumn('present', t.chips.present, (row) => row.present),
        countColumn('optedOut', t.chips.optedOut, (row) => row.optedOut),
        countColumn('noShow', t.chips.noShow, (row) => row.noShow),
        {
            key: 'standing',
            head: t.admin.colStanding,
            kind: 'standing',
            render: (row) => <StandingChip standing={row.standing} t={t} />,
        },
    ];
}

/** Every Payment this member has sent, newest Billing Period first. */
export function duesColumns(
    t: Dictionary,
): readonly RegisterColumn<MemberDuesRow>[] {
    return [
        {
            key: 'period',
            // `colPeriod` is the Payments queue's head for the same fact; #68
            // removed the older `colMonth` this column first read.
            head: t.admin.colPeriod,
            render: (row) => `${t.months[row.month]} ${row.year}`,
        },
        {
            key: 'amount',
            head: t.admin.colAmount,
            kind: 'amount',
            render: (row) => (
                <StatusValue state={paymentState(row.status)}>
                    {rupiah(row.amount)}
                </StatusValue>
            ),
        },
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            render: (row) => (
                <StatusChip state={paymentState(row.status)} labels={t.chips} />
            ),
        },
    ];
}

/** The Sessions this member most recently held a Seat for. */
export function attendanceColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<MemberAttendanceRow>[] {
    return [
        {
            key: 'session',
            head: t.admin.colSession,
            render: (row) => row.title,
        },
        {
            key: 'date',
            head: t.admin.colDate,
            kind: 'figure',
            render: (row) => (
                <time dateTime={row.date.toISOString()}>
                    {format(row.date, SESSION_DATE_FORMAT, {
                        locale: dateLocale,
                    })}
                </time>
            ),
        },
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            render: (row) => (
                <StatusChip
                    state={attendanceState(row.status)}
                    labels={t.chips}
                />
            ),
        },
    ];
}

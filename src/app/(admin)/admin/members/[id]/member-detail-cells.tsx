import { format, type Locale as DateFnsLocale } from 'date-fns';
import { ActivityTile } from '@/components/activity/activity-badge';
import { MarkedValue, StateMark } from '@/components/ui/mark';
import type { RegisterColumn } from '@/components/admin/register-columns';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { attendanceState, paymentState } from '@/lib/status-mark';
import { modeLabel, StandingMark } from '../member-cells';
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
            <ActivityTile name={row.activityName} />
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
            head: t.admin.colMode,
            render: (row) => (
                <span className='type-caption text-muted-foreground'>
                    {modeLabel(row.mode, t)}
                </span>
            ),
        },
        countColumn('present', t.marks.present, (row) => row.present),
        countColumn('optedOut', t.marks.optedOut, (row) => row.optedOut),
        countColumn('noShow', t.marks.noShow, (row) => row.noShow),
        {
            key: 'standing',
            head: t.admin.colStanding,
            kind: 'standing',
            render: (row) => <StandingMark standing={row.standing} t={t} />,
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
            head: t.admin.colMonth,
            render: (row) => `${t.months[row.month]} ${row.year}`,
        },
        {
            key: 'amount',
            head: t.admin.colAmount,
            kind: 'amount',
            render: (row) => (
                <MarkedValue state={paymentState(row.status)}>
                    {rupiah(row.amount)}
                </MarkedValue>
            ),
        },
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            render: (row) => (
                <StateMark state={paymentState(row.status)} labels={t.marks} />
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
                <StateMark
                    state={attendanceState(row.status)}
                    labels={t.marks}
                />
            ),
        },
    ];
}

import type { Locale as DateFnsLocale } from 'date-fns';
import type { RegisterColumn } from '@/components/admin/register-columns';
import { StatusChip } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { sessionState } from '@/lib/status-chip';
import { SessionActions } from './session-actions';
import {
    SessionActivity,
    SessionCapacity,
    SessionFloorCell,
    SessionTitle,
    SessionWhen,
} from './session-cells';
import type { SessionRegisterRow } from './session-rows';

/**
 * The register's columns, in the order an Admin reads a week: when it is, what
 * it is, which Activity it belongs to, where it is, how full it is, whether it
 * can pay for itself, where it stands, and what can be done to it. Position,
 * rules and the collapse below `768px` are the register's; only the values are
 * described here.
 */

/** When, what, which Activity, and where. */
function factColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<SessionRegisterRow>[] {
    return [
        {
            key: 'when',
            head: t.admin.colDate,
            kind: 'figure',
            sortKey: 'date',
            render: (session) => (
                <SessionWhen session={session} dateLocale={dateLocale} />
            ),
        },
        {
            key: 'session',
            head: t.admin.colSession,
            sortKey: 'title',
            render: (session) => <SessionTitle session={session} />,
        },
        {
            key: 'activity',
            head: t.activity.label,
            render: (session) => <SessionActivity session={session} />,
        },
        {
            key: 'venue',
            head: t.admin.colLocation,
            sortKey: 'location',
            render: (session) => session.location,
        },
    ];
}

/** How full it is, and whether enough people have committed to pay for it. */
function figureColumns(
    t: Dictionary,
): readonly RegisterColumn<SessionRegisterRow>[] {
    return [
        {
            key: 'capacity',
            head: t.admin.colCapacity,
            kind: 'figure',
            render: (session) => <SessionCapacity session={session} t={t} />,
        },
        {
            key: 'floor',
            head: t.admin.colFloor,
            kind: 'figure',
            render: (session) => <SessionFloorCell session={session} t={t} />,
        },
    ];
}

/** Where it stands, and what can be done to it from the row. */
function standingColumns(
    t: Dictionary,
): readonly RegisterColumn<SessionRegisterRow>[] {
    return [
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            sortKey: 'status',
            render: (session) => (
                <StatusChip
                    state={sessionState(session.status)}
                    labels={t.chips}
                />
            ),
        },
        {
            key: 'actions',
            head: t.admin.colActions,
            kind: 'actions',
            render: (session) => (
                <SessionActions
                    session={{
                        id: session.id,
                        title: session.title,
                        isClosed: session.isClosed,
                        canReopen: session.canReopen,
                    }}
                />
            ),
        },
    ];
}

export function sessionColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<SessionRegisterRow>[] {
    return [
        ...factColumns(t, dateLocale),
        ...figureColumns(t),
        ...standingColumns(t),
    ];
}

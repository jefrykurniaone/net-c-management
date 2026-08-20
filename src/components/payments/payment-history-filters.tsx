import type { Dictionary } from '@/lib/i18n/dictionaries';

type ActivityOption = Readonly<{ id: string; name: string }>;

const SELECT_CLASS =
    'h-8 rounded-sm border border-rule bg-tile px-2.5 type-caption text-secondary-foreground';

/** Which standing to show. Its meaning is its text, never its colour. */
function StatusSelect({
    t,
    historyStatus,
}: Readonly<{ t: Dictionary; historyStatus?: string }>) {
    return (
        <select
            name='historyStatus'
            defaultValue={historyStatus ?? ''}
            data-testid='history-status-filter'
            className={SELECT_CLASS}>
            <option value=''>{t.table.filter.allStatuses}</option>
            <option value='PENDING'>{t.payments.historyStatus.PENDING}</option>
            <option value='CONFIRMED'>
                {t.payments.historyStatus.CONFIRMED}
            </option>
            <option value='REJECTED'>{t.payments.historyStatus.REJECTED}</option>
        </select>
    );
}

/** Which Activity — offered only once there is more than one to choose from. */
function ActivitySelect({
    t,
    historyActivity,
    userActivities,
}: Readonly<{
    t: Dictionary;
    historyActivity?: string;
    userActivities: readonly ActivityOption[];
}>) {
    return (
        <select
            name='historyActivity'
            defaultValue={historyActivity ?? ''}
            data-testid='history-activity-filter'
            className={SELECT_CLASS}>
            <option value=''>{t.table.filter.allActivities}</option>
            {userActivities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                    {activity.name}
                </option>
            ))}
        </select>
    );
}

/**
 * Filters over the payments history: status, and — once a member belongs to
 * more than one Activity — which one. Plain `<select>` controls, so a filter's
 * meaning is carried by its text, never by colour.
 */
export function PaymentHistoryFilters({
    t,
    historyStatus,
    historyActivity,
    userActivities,
    historyPageSize,
}: Readonly<{
    t: Dictionary;
    historyStatus?: string;
    historyActivity?: string;
    userActivities: readonly ActivityOption[];
    historyPageSize: number | 'all';
}>) {
    return (
        <form method='GET' className='flex flex-wrap gap-cell'>
            <StatusSelect t={t} historyStatus={historyStatus} />
            {userActivities.length > 1 && (
                <ActivitySelect
                    t={t}
                    historyActivity={historyActivity}
                    userActivities={userActivities}
                />
            )}
            {historyPageSize !== 10 && (
                <input
                    type='hidden'
                    name='historyPageSize'
                    value={String(historyPageSize)}
                />
            )}
            <button
                type='submit'
                className='h-8 rounded-sm border border-rule bg-tile px-3 type-caption font-semibold text-secondary-foreground transition-colors hover:bg-muted'>
                {t.table.search.btn}
            </button>
        </form>
    );
}

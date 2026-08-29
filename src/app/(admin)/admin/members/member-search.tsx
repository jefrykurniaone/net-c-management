import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The register's two filters, as a plain GET form: a name-or-email search and
 * one Activity. No client state — a submit is a navigation, so the result is
 * linkable, back-button-safe and works with scripting off.
 *
 * Sort and page size ride along as hidden fields, so filtering does not silently
 * throw away the ordering the Admin chose. Both are omitted at their defaults,
 * which keeps the resulting URL short.
 */

/** The defaults `parseSort` and `parsePagination` apply when the key is absent. */
const DEFAULT_SORT_BY = 'createdAt';
const DEFAULT_SORT_DIR = 'desc';
const DEFAULT_PAGE_SIZE = 10;

/** A cell you write in: tile ground, one rule, square corner. */
const FIELD_CLASS =
    'h-9 w-full rounded-[2px] border border-rule bg-tile px-cell type-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const LABEL_CLASS = 'type-label text-muted-foreground';

export type MemberFilters = Readonly<{
    search: string;
    activityId: string;
    sortBy: string;
    sortDir: string;
    pageSize: number | 'all';
}>;

type ActivityOption = Readonly<{ id: string; name: string }>;

function SearchField({
    value,
    t,
}: Readonly<{ value: string; t: Dictionary }>) {
    return (
        <label className='flex w-full max-w-sm flex-col gap-hair'>
            {/* Named for what is being searched, not for the act: the submit
                control beside it is already called Search. */}
            <span className={LABEL_CLASS}>{t.admin.colMember}</span>
            <input
                name='search'
                defaultValue={value}
                placeholder={t.table.search.memberPlaceholder}
                data-testid='search-input'
                className={FIELD_CLASS}
            />
        </label>
    );
}

function ActivityField({
    value,
    activities,
    t,
}: Readonly<{
    value: string;
    activities: readonly ActivityOption[];
    t: Dictionary;
}>) {
    return (
        <label className='flex w-full flex-col gap-hair sm:w-auto'>
            <span className={LABEL_CLASS}>{t.activity.label}</span>
            <select name='activityId' defaultValue={value} className={FIELD_CLASS}>
                <option value=''>{t.activity.filterAll}</option>
                {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                        {activity.name}
                    </option>
                ))}
            </select>
        </label>
    );
}

/** Whatever the Admin already chose that this form would otherwise drop. */
function PreservedParams({ filters }: Readonly<{ filters: MemberFilters }>) {
    return (
        <>
            {filters.sortBy !== DEFAULT_SORT_BY && (
                <input type='hidden' name='sortBy' value={filters.sortBy} />
            )}
            {filters.sortDir !== DEFAULT_SORT_DIR && (
                <input type='hidden' name='sortDir' value={filters.sortDir} />
            )}
            {filters.pageSize !== DEFAULT_PAGE_SIZE && (
                <input
                    type='hidden'
                    name='pageSize'
                    value={String(filters.pageSize)}
                />
            )}
        </>
    );
}

export function MemberSearch({
    filters,
    activities,
    t,
}: Readonly<{
    filters: MemberFilters;
    activities: readonly ActivityOption[];
    t: Dictionary;
}>) {
    return (
        <form method='GET' className='flex flex-wrap items-end gap-cell'>
            <SearchField value={filters.search} t={t} />
            <ActivityField
                value={filters.activityId}
                activities={activities}
                t={t}
            />
            <PreservedParams filters={filters} />
            <Button type='submit' variant='outline'>
                {t.admin.searchBtn}
            </Button>
        </form>
    );
}

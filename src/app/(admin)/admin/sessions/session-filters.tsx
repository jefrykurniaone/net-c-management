import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { FILTER_FIELD_CLASS } from '@/components/admin/filter-bar';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { DEFAULT_SORT_COL } from './session-rows';

/**
 * The two filters this surface has — a title/venue search and one Activity — as
 * a plain `GET` form, so the filtered view is a URL an Admin can bookmark and
 * hand to somebody else. The sort and page size ride along as hidden fields:
 * filtering is not a reason to throw away the column somebody sorted by.
 */

const DEFAULT_SORT_DIR = 'desc';
const DEFAULT_PAGE_SIZE = 10;

type SessionFilterView = Readonly<{
    search: string;
    activityId: string;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    pageSize: number | 'all';
}>;

type FilterActivity = Readonly<{ id: string; name: string }>;

/** The sort and page size, carried across a filter rather than thrown away. */
function CarriedState({ filters }: Readonly<{ filters: SessionFilterView }>) {
    return (
        <>
            {filters.sortBy !== DEFAULT_SORT_COL && (
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

export function SessionFilters({
    filters,
    activities,
    t,
}: Readonly<{
    filters: SessionFilterView;
    activities: readonly FilterActivity[];
    t: Dictionary;
}>) {
    return (
        <form className='flex flex-wrap items-center gap-2' method='GET'>
            <Input
                name='search'
                defaultValue={filters.search}
                placeholder={t.table.search.titlePlaceholder}
                aria-label={t.table.search.titlePlaceholder}
                data-testid='search-input'
                className={`${FILTER_FIELD_CLASS} w-full sm:w-64`}
            />
            <NativeSelect
                name='activityId'
                defaultValue={filters.activityId}
                aria-label={t.admin.filterActivityLabel}
                className={`${FILTER_FIELD_CLASS} w-full sm:w-auto`}>
                <option value=''>{t.activity.filterAll}</option>
                {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                        {activity.name}
                    </option>
                ))}
            </NativeSelect>
            <CarriedState filters={filters} />
            <Button type='submit' variant='outline' size='lg'>
                {t.admin.searchBtn}
            </Button>
        </form>
    );
}

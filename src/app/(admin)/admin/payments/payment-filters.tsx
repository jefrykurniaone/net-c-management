import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { FILTER_FIELD_CLASS } from '@/components/admin/filter-bar';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The queue's filters — month, year, standing, Activity and a member search —
 * submitted as a plain `GET` form, so every filtered view is a URL somebody can
 * keep. Each control carries an accessible name: a bare `<select>` whose only
 * text is its "all" option announces as that option, and five of them in a row
 * announce as five unlabelled controls.
 */

const MONTHS_IN_YEAR = 12;

/** The years a Payment is plausibly filed against, either side of this one. */
const YEAR_SPAN = [-1, 0, 1];

/** What `parsePagination` falls back to; only a different size is carried. */
const DEFAULT_PAGE_SIZE = 10;

/** The row's own sizing, layered onto `Input`/`NativeSelect`'s field treatment. */
const FIELD_SIZE_CLASS = `${FILTER_FIELD_CLASS} sm:w-auto`;

export type PaymentFilterValues = Readonly<{
    month: number | undefined;
    year: number | undefined;
    status: string | undefined;
    activityId: string | undefined;
    search: string;
}>;

export type FilterActivity = Readonly<{ id: string; name: string }>;

type FilterOption = Readonly<{ value: string; label: string }>;

function FilterSelect({
    name,
    label,
    allLabel,
    defaultValue,
    options,
}: Readonly<{
    name: string;
    label: string;
    allLabel: string;
    defaultValue: string;
    options: readonly FilterOption[];
}>) {
    return (
        <NativeSelect
            name={name}
            aria-label={label}
            defaultValue={defaultValue}
            className={FIELD_SIZE_CLASS}>
            <option value=''>{allLabel}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </NativeSelect>
    );
}

function monthOptions(t: Dictionary): readonly FilterOption[] {
    return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => ({
        value: String(index + 1),
        label: t.months[index + 1],
    }));
}

function yearOptions(thisYear: number): readonly FilterOption[] {
    return YEAR_SPAN.map((offset) => ({
        value: String(thisYear + offset),
        label: String(thisYear + offset),
    }));
}

function numberValue(value: number | undefined): string {
    return value === undefined ? '' : String(value);
}

/** Which Billing Period the Admin is looking at. */
function PeriodSelects({
    t,
    values,
    thisYear,
}: Readonly<{
    t: Dictionary;
    values: PaymentFilterValues;
    thisYear: number;
}>) {
    return (
        <>
            <FilterSelect
                name='month'
                label={t.admin.filterMonthLabel}
                allLabel={t.admin.allMonths}
                defaultValue={numberValue(values.month)}
                options={monthOptions(t)}
            />
            <FilterSelect
                name='year'
                label={t.admin.filterYearLabel}
                allLabel={t.admin.allYears}
                defaultValue={numberValue(values.year)}
                options={yearOptions(thisYear)}
            />
        </>
    );
}

/** Which standings, and which Activity's bank account. */
function ScopeSelects({
    t,
    values,
    activities,
}: Readonly<{
    t: Dictionary;
    values: PaymentFilterValues;
    activities: readonly FilterActivity[];
}>) {
    return (
        <>
            <FilterSelect
                name='status'
                label={t.admin.filterStatusLabel}
                allLabel={t.admin.allStatuses}
                defaultValue={values.status ?? ''}
                options={[
                    { value: 'PENDING', label: t.paymentStatus.PENDING },
                    { value: 'CONFIRMED', label: t.paymentStatus.CONFIRMED },
                    { value: 'REJECTED', label: t.paymentStatus.REJECTED },
                ]}
            />
            <FilterSelect
                name='activityId'
                label={t.admin.filterActivityLabel}
                allLabel={t.activity.filterAll}
                defaultValue={values.activityId ?? ''}
                options={activities.map((a) => ({
                    value: a.id,
                    label: a.name,
                }))}
            />
        </>
    );
}

export type CarriedTableState = Readonly<{
    sortBy: string;
    sortDir: string;
    pageSize: number | 'all';
    /** The queue's own default, which is not a column and is never carried. */
    defaultSortBy: string;
}>;

/**
 * The sort and page size the Admin is already on, so filtering does not quietly
 * throw them away. Carried only where they differ from the defaults, which
 * keeps a plain filtered view a plain URL.
 */
function CarriedState({ state }: Readonly<{ state: CarriedTableState }>) {
    return (
        <>
            {state.sortBy !== state.defaultSortBy && (
                <input type='hidden' name='sortBy' value={state.sortBy} />
            )}
            {state.sortDir !== 'desc' && (
                <input type='hidden' name='sortDir' value={state.sortDir} />
            )}
            {state.pageSize !== DEFAULT_PAGE_SIZE && (
                <input
                    type='hidden'
                    name='pageSize'
                    value={String(state.pageSize)}
                />
            )}
        </>
    );
}

export function PaymentFilters({
    t,
    values,
    activities,
    thisYear,
    carried,
}: Readonly<{
    t: Dictionary;
    values: PaymentFilterValues;
    activities: readonly FilterActivity[];
    thisYear: number;
    carried: CarriedTableState;
}>) {
    return (
        <form className='flex flex-wrap items-center gap-cell' method='GET'>
            <Input
                name='search'
                defaultValue={values.search}
                aria-label={t.admin.filterSearchLabel}
                placeholder={t.table.search.memberPlaceholder}
                data-testid='search-input'
                className={`${FILTER_FIELD_CLASS} sm:w-64`}
            />
            <PeriodSelects t={t} values={values} thisYear={thisYear} />
            <ScopeSelects t={t} values={values} activities={activities} />
            <CarriedState state={carried} />
            <Button type='submit' variant='outline' size='lg'>
                {t.admin.filterBtn}
            </Button>
        </form>
    );
}

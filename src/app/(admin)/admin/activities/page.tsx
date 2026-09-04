import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { isAdminRole } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NewActivityButton, ActivityActions } from './activity-actions';
import {
    ActivityIdentity,
    ActivityBank,
    ActivityStanding,
    activityDuesLabel,
    activityFeeLabel,
    activityModesLabel,
    activityWeeklySlotLabel,
} from './activity-cells';
import { parsePagination, parseSort, parseSearch, type RawSearchParams } from '@/lib/table-params';
import { Register } from '@/components/admin/register';
import type { RegisterColumn } from '@/components/admin/register-columns';
import { currentPeriod, type BillingPeriod } from '@/lib/billing-period';
import {
    ACTIVITY_DUES_SORT_KEY,
    fetchActivityRegister,
    type ActivityRegisterRow,
} from '@/lib/activity-register';
import type { Prisma } from '@prisma/client';

/**
 * The Activities register (#71) — one row per Activity, an audit in one read:
 * who it is, what it costs, how it's paid for, when it runs, how big it is, its
 * cost-sharing floor, its destination bank account, whether it's live, then the
 * row's own controls. Composes the shared register the way the Applicants
 * surface does.
 */

/**
 * The register's columns. The Dues column prints and sorts by the Dues Rate of
 * `period` — the current Billing Period — which is why the ordering for that one
 * key is resolved in `src/lib/activity-register.ts` rather than by an `orderBy`.
 * `nowIso` is the server's instant, handed to the edit form so its Period picker
 * offers exactly the months the route accepts.
 */
function activityColumns(
    t: Dictionary,
    period: BillingPeriod,
    nowIso: string,
): readonly RegisterColumn<ActivityRegisterRow>[] {
    return [
        {
            key: 'activity',
            head: t.admin.colActivity,
            sortKey: 'name',
            render: (a) => <ActivityIdentity activity={a} />,
        },
        {
            key: 'dues',
            head: t.admin.colDues,
            kind: 'amount',
            sortKey: ACTIVITY_DUES_SORT_KEY,
            render: (a) => activityDuesLabel(a, period, t),
        },
        {
            key: 'fee',
            head: t.admin.colFee,
            kind: 'amount',
            render: activityFeeLabel,
        },
        {
            key: 'modes',
            head: t.admin.colModes,
            render: (a) => activityModesLabel(a, t),
        },
        {
            key: 'slot',
            head: t.admin.colWeeklySlot,
            render: (a) => activityWeeklySlotLabel(a, t),
        },
        {
            key: 'capacity',
            head: t.admin.colCapacity,
            kind: 'figure',
            render: (a) => a.maxPlayers,
        },
        {
            key: 'floor',
            head: t.admin.colFloor,
            kind: 'figure',
            render: (a) => a.minMembers,
        },
        {
            key: 'bank',
            head: t.admin.colBank,
            render: (a) => <ActivityBank activity={a} />,
        },
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            sortKey: 'status',
            render: (a) => <ActivityStanding activity={a} t={t} />,
        },
        {
            key: 'actions',
            head: t.admin.colActions,
            kind: 'actions',
            render: (a) => <ActivityActions activity={a} nowIso={nowIso} />,
        },
    ];
}

/**
 * An empty register under an active search is "no matches", not the
 * cold-start "no activities yet" — same distinction the Sessions register
 * already makes. Activities has no other filter to check.
 */
function emptyRow(
    t: Dictionary,
    isFiltered: boolean,
): Readonly<{ mark: string; text: string }> {
    return {
        mark: t.admin.activitiesEmptyMark,
        text: isFiltered ? t.admin.noActivityMatch : t.admin.noActivity,
    };
}

/**
 * The page's own title. The count and the "add an Activity" action moved to the
 * register's card header with #166, so neither is said twice.
 */
function ActivitiesHeading({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div>
            <h1 className='type-display text-foreground'>
                {t.admin.activityTitle}
            </h1>
            <p className='mt-cell type-caption text-muted-foreground'>
                {t.admin.activitySubtitle}
            </p>
        </div>
    );
}

function ActivitySearchForm({
    t,
    search,
    sortBy,
    sortDir,
    pageSize,
}: Readonly<{
    t: Dictionary;
    search: string;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    pageSize: number | 'all';
}>) {
    return (
        <form className='flex flex-wrap gap-2' method='GET'>
            <Input
                name='search'
                defaultValue={search}
                placeholder={t.table.search.activityPlaceholder}
                data-testid='search-input'
                className='w-full sm:w-72'
            />
            {sortBy !== 'name' && (
                <input type='hidden' name='sortBy' value={sortBy} />
            )}
            {sortDir !== 'asc' && (
                <input type='hidden' name='sortDir' value={sortDir} />
            )}
            {pageSize !== 10 && (
                <input
                    type='hidden'
                    name='pageSize'
                    value={String(pageSize)}
                />
            )}
            <Button type='submit' variant='outline'>
                {t.table.search.btn}
            </Button>
        </form>
    );
}

export default async function AdminActivityPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }

    const t = getDictionary(locale);

    const sp = await searchParams;
    const search = parseSearch(sp);
    const { sortBy, sortDir } = parseSort(sp, 'name', 'asc');
    const { page, pageSize, skip, take } = parsePagination(sp);

    const where: Prisma.ActivityWhereInput = search
        ? {
              OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { slug: { contains: search, mode: 'insensitive' } },
              ],
          }
        : {};

    // One instant for the whole render: the Period the Dues column is about and
    // the Period picker the edit form offers are the same clock, the server's.
    const now = new Date();
    const period = currentPeriod(now);
    const { rows, total } = await fetchActivityRegister({
        where,
        sortBy,
        sortDir,
        skip,
        take,
        period,
    });

    return (
        <div className='space-y-bay'>
            <ActivitiesHeading t={t} />
            <ActivitySearchForm
                t={t}
                search={search}
                sortBy={sortBy}
                sortDir={sortDir}
                pageSize={pageSize}
            />
            <Register
                columns={activityColumns(t, period, now.toISOString())}
                rows={rows}
                caption={t.admin.activitiesCaption}
                searchParams={sp}
                header={{
                    title: t.admin.registerTitleActivities,
                    count: t.admin.registerCountActivities.replace(
                        '{n}',
                        String(total),
                    ),
                    action: <NewActivityButton />,
                }}
                empty={emptyRow(t, Boolean(search))}
                pagination={{ total, page, pageSize, labels: t.table.pagination }}
            />
        </div>
    );
}

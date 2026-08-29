import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
import type { Prisma, Activity } from '@prisma/client';

/**
 * The Activities register (ticket #71) — one row per Activity, an audit in
 * one read: who it is, what it costs, how it's paid for, when it runs, how
 * big it is, its cost-sharing floor, its destination bank account, whether
 * it's live, then the row's own controls. Composes the shared register the
 * way the Applicants surface does; the mobile cards this page used to fall
 * back to below `md` are gone with it — the register collapses by axis on
 * its own.
 */

function buildActivityOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.ActivityOrderByWithRelationInput[] {
    if (sortBy === 'monthlyFee') {
        return [{ monthlyFee: dir }, { name: 'asc' }];
    }
    if (sortBy === 'status') {
        return [{ isActive: dir === 'asc' ? 'desc' : 'asc' }, { name: 'asc' }];
    }
    return [{ isActive: 'desc' }, { name: dir }];
}

function activityColumns(t: Dictionary): readonly RegisterColumn<Activity>[] {
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
            sortKey: 'monthlyFee',
            render: activityDuesLabel,
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
            render: (a) => <ActivityActions activity={a} />,
        },
    ];
}

function emptyRow(t: Dictionary): Readonly<{ mark: string; text: string }> {
    return { mark: t.admin.activitiesEmptyMark, text: t.admin.noActivity };
}

function ActivitiesHeading({
    t,
    total,
}: Readonly<{ t: Dictionary; total: number }>) {
    return (
        <div className='flex flex-wrap items-start justify-between gap-cell'>
            <div>
                <h1 className='type-display text-foreground'>
                    {t.admin.activityTitle}
                </h1>
                <p className='mt-cell type-caption text-muted-foreground'>
                    {total} {t.admin.activityRegistered} ·{' '}
                    {t.admin.activitySubtitle}
                </p>
            </div>
            <NewActivityButton />
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

    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where,
            orderBy: buildActivityOrderBy(sortBy, sortDir),
            skip,
            take,
        }),
        prisma.activity.count({ where }),
    ]);

    return (
        <div className='space-y-bay'>
            <ActivitiesHeading t={t} total={total} />
            <ActivitySearchForm
                t={t}
                search={search}
                sortBy={sortBy}
                sortDir={sortDir}
                pageSize={pageSize}
            />
            <Register
                columns={activityColumns(t)}
                rows={activities}
                caption={t.admin.activitiesCaption}
                searchParams={sp}
                empty={emptyRow(t)}
                pagination={{ total, page, pageSize, labels: t.table.pagination }}
            />
        </div>
    );
}

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isAdminRole } from '@/lib/utils';
import { NewActivityButton, ActivityActions } from './activity-actions';
import { ActivityCards } from './activity-cards';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { parsePagination, parseSort, parseSearch } from '@/lib/table-params';
import { SortableTh } from '@/components/ui/sortable-th';
import type { Prisma } from '@prisma/client';

function buildActivityOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.ActivityOrderByWithRelationInput[] {
    if (sortBy === 'monthlyFee') return [{ monthlyFee: dir }, { name: 'asc' }];
    if (sortBy === 'status') return [{ isActive: dir === 'asc' ? 'desc' : 'asc' }, { name: 'asc' }];
    if (sortBy === 'members') return [{ memberships: { _count: dir } }, { name: 'asc' }];
    return [{ isActive: 'desc' }, { name: dir }];
}

export default async function AdminActivityPage({
    searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

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
            include: {
                _count: { select: { memberships: true, sessions: true } },
            },
        }),
        prisma.activity.count({ where }),
    ]);

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground'>
                        {t.admin.activityTitle}
                    </h1>
                    <p className='text-sm text-muted-foreground mt-1'>
                        {total} {t.admin.activityRegistered} ·{' '}
                        {t.admin.activitySubtitle}
                    </p>
                </div>
                <NewActivityButton />
            </div>

            {/* Search */}
            <form className='flex flex-wrap gap-2' method='GET'>
                <input
                    name='search'
                    defaultValue={search}
                    placeholder={t.table.search.activityPlaceholder}
                    data-testid='search-input'
                    className='h-9 border border-input rounded-lg px-3 text-sm bg-card w-full sm:w-72 placeholder:text-subtle-foreground'
                />
                {sortBy !== 'name' && <input type='hidden' name='sortBy' value={sortBy} />}
                {sortDir !== 'asc' && <input type='hidden' name='sortDir' value={sortDir} />}
                {pageSize !== 10 && <input type='hidden' name='pageSize' value={String(pageSize)} />}
                <button
                    type='submit'
                    className='h-9 border border-input rounded-lg px-4 text-sm font-semibold text-secondary-foreground bg-card hover:bg-muted transition-colors'>
                    {t.table.search.btn}
                </button>
            </form>

            {/* Mobile: stacked cards */}
            <div className='md:hidden'>
                <ActivityCards activities={activities} t={t} />
                <DataTablePagination total={total} page={page} pageSize={pageSize} searchParams={sp} labels={t.table.pagination} />
            </div>

            {/* Desktop: full table */}
            <div className='hidden md:block bg-card rounded-xl border border-border overflow-hidden'>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-muted/50 border-b border-border'>
                                <SortableTh column='name' label={t.admin.colActivity} searchParams={sp} />
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.activitySlug}
                                </th>
                                <SortableTh column='members' label={t.admin.colMembers} searchParams={sp} align='center' />
                                <SortableTh column='monthlyFee' label={t.admin.activityFee} searchParams={sp} align='right' />
                                <SortableTh column='status' label={t.admin.colStatus} searchParams={sp} align='center' />
                                <th className='text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colActions}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {activities.map((e) => (
                                <tr
                                    key={e.id}
                                    className='border-b border-border last:border-b-0 hover:bg-muted/40'>
                                    <td className='px-5 py-3'>
                                        <div className='flex items-center gap-2.5'>
                                            <ActivityInitial name={e.name} color={e.color} />
                                            <div className='min-w-0'>
                                                <p className='font-semibold text-foreground'>
                                                    {e.name}
                                                </p>
                                                {e.description && (
                                                    <p className='text-xs text-subtle-foreground max-w-xs truncate'>
                                                        {e.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className='px-5 py-3 text-muted-foreground text-xs'>
                                        {e.slug}
                                    </td>
                                    <td className='px-5 py-3 text-center text-secondary-foreground tabular-nums'>
                                        {e._count.memberships}
                                    </td>
                                    <td className='px-5 py-3 text-right text-foreground font-semibold whitespace-nowrap tabular-nums'>
                                        Rp {e.monthlyFee.toLocaleString('id-ID')}
                                    </td>
                                    <td className='px-5 py-3 text-center'>
                                        <Badge variant={e.isActive ? 'success' : 'secondary'}>
                                            {e.isActive ? t.admin.active : t.admin.inactive2}
                                        </Badge>
                                    </td>
                                    <td className='px-5 py-3'>
                                        <ActivityActions
                                            activity={{
                                                id: e.id,
                                                name: e.name,
                                                slug: e.slug,
                                                color: e.color,
                                                description: e.description,
                                                monthlyFee: e.monthlyFee,
                                                sessionFee: e.sessionFee,
                                                allowsMonthly: e.allowsMonthly,
                                                allowsPerSession: e.allowsPerSession,
                                                minMembers: e.minMembers,
                                                recurringDay: e.recurringDay,
                                                recurringStartTime: e.recurringStartTime,
                                                recurringEndTime: e.recurringEndTime,
                                                defaultLocation: e.defaultLocation,
                                                maxPlayers: e.maxPlayers,
                                                adminWhatsapp: e.adminWhatsapp,
                                                bankName: e.bankName,
                                                bankAccountNumber: e.bankAccountNumber,
                                                bankAccountHolder: e.bankAccountHolder,
                                                isActive: e.isActive,
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {activities.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className='px-4 py-8 text-center text-muted-foreground'>
                                        {t.admin.noActivity}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className='px-4 border-t border-border'>
                    <DataTablePagination total={total} page={page} pageSize={pageSize} searchParams={sp} labels={t.table.pagination} />
                </div>
            </div>
        </div>
    );
}

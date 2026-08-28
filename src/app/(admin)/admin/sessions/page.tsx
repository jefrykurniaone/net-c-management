import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';
import { StateMark, MarkedValue } from '@/components/ui/mark';
import { Button } from '@/components/ui/button';
import { ActivityBadge } from '@/components/activity/activity-badge';
import { ActivityFilter } from '@/components/activity/activity-filter';
import { SessionCards } from './session-cards';
import Link from 'next/link';
import { Plus, ExternalLink } from 'lucide-react';
import type { ActivitySession } from '@prisma/client';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getActivities } from '@/lib/activity';
import { isAdminRole } from '@/lib/utils';
import { sessionState } from '@/lib/status-mark';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { parsePagination, parseSort, parseSearch } from '@/lib/table-params';
import { SortableTh } from '@/components/ui/sortable-th';
import type { Prisma } from '@prisma/client';

type SessionRow = ActivitySession & {
    _count: { attendances: number };
    activity: { id: string; name: string };
};

function buildSessionOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.ActivitySessionOrderByWithRelationInput {
    const allowed = ['date', 'title', 'status', 'location'];
    const col = allowed.includes(sortBy) ? sortBy : 'date';
    return { [col]: dir };
}

export default async function AdminSessionsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role))
        redirect('/dashboard');

    const t = getDictionary(locale);
    const dateLocale = locale === 'id' ? localeId : enUS;

    const sp = await searchParams;
    const raw = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);

    const selected = raw('activityId') || undefined;
    const search = parseSearch(sp);
    const { sortBy, sortDir } = parseSort(sp, 'date', 'desc');
    const { page, pageSize, skip, take } = parsePagination(sp);

    const where: Prisma.ActivitySessionWhereInput = {
        ...(selected ? { activityId: selected } : {}),
        ...(search
            ? {
                  OR: [
                      { title: { contains: search, mode: 'insensitive' } },
                      { location: { contains: search, mode: 'insensitive' } },
                  ],
              }
            : {}),
    };

    const [sessions, total, activities] = await Promise.all([
        prisma.activitySession.findMany({
            where,
            orderBy: buildSessionOrderBy(sortBy, sortDir),
            skip,
            take,
            include: {
                _count: {
                    select: {
                        attendances: {
                            where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                        },
                    },
                },
                activity: {
                    select: { id: true, name: true },
                },
            },
        }),
        prisma.activitySession.count({ where }),
        getActivities(),
    ]);

    // An empty table under an active search/filter is "no matches", not the
    // cold-start "no sessions yet" — say which so it doesn't read as empty DB.
    const isFiltered = Boolean(search || selected);
    const emptyLabel = isFiltered ? t.admin.noSessionsMatch : t.admin.noSessions;

    return (
        <div className='space-y-6'>
            <div className='flex items-center justify-between flex-wrap gap-3'>
                <div>
                    <h1 className='text-2xl font-bold text-foreground'>
                        {t.admin.sessionsTitle}
                    </h1>
                    <p className='text-sm text-muted-foreground mt-1'>
                        {t.admin.sessionsSubtitle}
                    </p>
                </div>
                <div className='flex items-center gap-2'>
                    <Link href='/admin/sessions/new'>
                        <Button className='gap-2'>
                            <Plus className='w-4 h-4' />
                            {t.admin.newSession}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search + activity filter */}
            <form className='flex flex-wrap gap-2' method='GET'>
                <input
                    name='search'
                    defaultValue={search}
                    placeholder={t.table.search.titlePlaceholder}
                    data-testid='search-input'
                    className='h-9 border border-input rounded-lg px-3 text-sm bg-card w-full sm:w-64 placeholder:text-subtle-foreground'
                />
                <select
                    name='activityId'
                    defaultValue={selected ?? ''}
                    className='h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto'>
                    <option value=''>{t.activity.filterAll}</option>
                    {activities.map((e) => (
                        <option key={e.id} value={e.id}>
                            {e.name}
                        </option>
                    ))}
                </select>
                {sortBy !== 'date' && <input type='hidden' name='sortBy' value={sortBy} />}
                {sortDir !== 'desc' && <input type='hidden' name='sortDir' value={sortDir} />}
                {pageSize !== 10 && <input type='hidden' name='pageSize' value={String(pageSize)} />}
                <Button type='submit' variant='outline' size='sm' className='h-9'>
                    {t.admin.searchBtn}
                </Button>
            </form>

            {/* Mobile: stacked cards */}
            <div className='md:hidden'>
                <SessionCards sessions={sessions} t={t} locale={locale} emptyLabel={emptyLabel} />
                <DataTablePagination total={total} page={page} pageSize={pageSize} searchParams={sp} labels={t.table.pagination} />
            </div>

            {/* Desktop: full table */}
            <div className='hidden md:block bg-card rounded-xl border border-border overflow-hidden'>
                <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                        <thead>
                            <tr className='bg-muted/50 border-b border-border'>
                                <SortableTh column='title' label={t.admin.colSession} searchParams={sp} />
                                <SortableTh column='date' label={t.admin.colDate} searchParams={sp} />
                                <SortableTh column='location' label={t.admin.colLocation} searchParams={sp} />
                                <th className='text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colParticipants}
                                </th>
                                <SortableTh column='status' label={t.admin.colStatus} searchParams={sp} />
                                <th className='text-right px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t.admin.colActions}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s: SessionRow) => {
                                const fillPct = Math.min(
                                    (s._count.attendances / s.maxPlayers) * 100,
                                    100,
                                );
                                const isUnderBooked = fillPct < 60;
                                return (
                                    <tr
                                        key={s.id}
                                        className='border-b border-border last:border-b-0 hover:bg-muted/40'>
                                        <td className='px-5 py-3.5 max-w-50'>
                                            <MarkedValue
                                                state={sessionState(s.status)}
                                                className='truncate block font-semibold text-foreground'>
                                                {s.title}
                                            </MarkedValue>
                                            <ActivityBadge
                                                name={s.activity.name}
                                                className='mt-1'
                                            />
                                        </td>
                                        <td className='px-5 py-3.5 text-secondary-foreground whitespace-nowrap tabular-nums'>
                                            {format(new Date(s.date), 'd MMM yyyy', { locale: dateLocale })}
                                            <span className='text-xs text-muted-foreground block'>
                                                {s.startTime} – {s.endTime}
                                            </span>
                                        </td>
                                        <td className='px-5 py-3.5 text-muted-foreground max-w-37.5 truncate'>
                                            {s.location}
                                        </td>
                                        <td className='px-5 py-3.5'>
                                            <span className='block text-[13px] font-semibold text-foreground tabular-nums'>
                                                {s._count.attendances}/{s.maxPlayers}
                                            </span>
                                            <span className='mt-1 block h-1 w-16 overflow-hidden rounded-full bg-muted'>
                                                <span
                                                    className={
                                                        'block h-full rounded-full ' +
                                                        (isUnderBooked ? 'bg-warning-solid' : 'bg-primary')
                                                    }
                                                    style={{ width: `${fillPct}%` }}
                                                />
                                            </span>
                                        </td>
                                        <td className='px-5 py-3.5'>
                                            <StateMark
                                                state={sessionState(s.status)}
                                                labels={t.marks}
                                            />
                                        </td>
                                        <td className='px-5 py-3.5 text-right'>
                                            <div className='flex items-center justify-end gap-2.5'>
                                                <Link
                                                    href={`/sessions/${s.id}`}
                                                    className='text-xs font-semibold text-primary hover:underline flex items-center gap-1'>
                                                    <ExternalLink className='w-3 h-3' />
                                                    {t.admin.detail}
                                                </Link>
                                                <Link
                                                    href={`/admin/sessions/${s.id}/edit`}
                                                    className='text-xs font-semibold text-secondary-foreground hover:text-foreground hover:underline'>
                                                    {t.admin.edit}
                                                </Link>
                                                <a
                                                    href={`/api/sessions/${s.id}/export`}
                                                    className='text-xs font-semibold text-primary hover:underline'
                                                    download>
                                                    CSV
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {sessions.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className='px-4 py-8 text-center text-muted-foreground'>
                                        {emptyLabel}
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

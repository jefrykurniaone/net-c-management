import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Register } from '@/components/admin/register';
import { Button } from '@/components/ui/button';
import { getActivities } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { getDateFnsLocale, getLocale } from '@/lib/i18n/locale';
import {
    parsePagination,
    parseSearch,
    parseSort,
    type RawSearchParams,
} from '@/lib/table-params';
import { isAdminRole } from '@/lib/utils';
import { sessionColumns } from './session-columns';
import { SessionFilters } from './session-filters';
import { DEFAULT_SORT_COL, loadSessions } from './session-rows';

/**
 * The Sessions register (ticket #69) — one row per Session, carrying what an
 * Admin decides on: when it is, what it is, how full it is, whether enough
 * people have committed for it to pay for itself, and where it stands. Posting,
 * editing, cancelling and taking attendance all act from the row or from this
 * heading, so the common jobs are where the Admin is already looking.
 *
 * The mobile cards this page used to fall back to below `md` are gone: the
 * register collapses by axis instead, and each row stays a ruled row.
 */

/** The whole of what the query string says about this page. */
type PageQuery = ReturnType<typeof readQuery>;

function readQuery(sp: RawSearchParams) {
    const raw = sp.activityId;
    return {
        search: parseSearch(sp),
        activityId: (Array.isArray(raw) ? raw[0] : raw) ?? '',
        ...parseSort(sp, DEFAULT_SORT_COL, 'desc'),
        ...parsePagination(sp),
    };
}

function SessionsHeading({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='flex flex-wrap items-start justify-between gap-cell'>
            <div>
                <h1 className='type-display text-foreground'>
                    {t.admin.sessionsTitle}
                </h1>
                <p className='mt-cell type-caption text-muted-foreground'>
                    {t.admin.sessionsSubtitle}
                </p>
            </div>
            <Button asChild className='gap-2'>
                <Link href='/admin/sessions/new'>
                    <Plus className='w-4 h-4' />
                    {t.admin.newSession}
                </Link>
            </Button>
        </div>
    );
}

/**
 * An empty register under an active search or Activity filter is "no matches",
 * not the cold-start "no sessions yet" — the sentence says which, so it does not
 * read as an empty database.
 */
function emptyRow(
    t: Dictionary,
    query: PageQuery,
): Readonly<{ mark: string; text: string }> {
    const isFiltered = Boolean(query.search || query.activityId);
    return {
        mark: t.admin.sessionsEmptyMark,
        text: isFiltered ? t.admin.noSessionsMatch : t.admin.noSessions,
    };
}

export default async function AdminSessionsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);
    const sp = await searchParams;
    const query = readQuery(sp);
    const [{ rows, total }, activities] = await Promise.all([
        loadSessions(query),
        getActivities(),
    ]);

    return (
        <div className='space-y-bay'>
            <SessionsHeading t={t} />
            <SessionFilters filters={query} activities={activities} t={t} />
            <Register
                columns={sessionColumns(t, getDateFnsLocale(locale))}
                rows={rows}
                caption={t.admin.sessionsCaption}
                searchParams={sp}
                empty={emptyRow(t, query)}
                pagination={{
                    total,
                    page: query.page,
                    pageSize: query.pageSize,
                    labels: t.table.pagination,
                }}
            />
        </div>
    );
}

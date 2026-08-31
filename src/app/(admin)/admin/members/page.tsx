import { redirect } from 'next/navigation';
import type { Prisma, Role } from '@prisma/client';
import { Register } from '@/components/admin/register';
import type { RegisterColumn } from '@/components/admin/register-columns';
import { getActivities } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { getLocale } from '@/lib/i18n/locale';
import {
    parsePagination,
    parseSearch,
    parseSort,
    type RawSearchParams,
} from '@/lib/table-params';
import { isAdminRole } from '@/lib/utils';
import {
    MemberContact,
    MemberIdentity,
    MemberMemberships,
    MemberRole,
    MemberRowActions,
} from './member-cells';
import { loadMembers, type MemberRow } from './member-rows';
import { MemberSearch } from './member-search';

/**
 * The roster, as a register — one row per member, carrying the three things an
 * Admin is actually asked about: who they are, how to reach them, and where
 * each of their Memberships stands this Billing Period. Answering that used to
 * mean opening four screens.
 *
 * Applicants are not here. They hold Memberships picked while completing their
 * profile and none of them mean anything until an Admin lets them in, so the
 * admission queue keeps its own surface and this one selects on `admittedAt`.
 *
 * The mobile cards this page used to carry below `md` are gone: the register
 * collapses by axis instead, and each row stays a ruled row.
 */

const DEFAULT_SORT_COL = 'createdAt';

const VALID_SORT_COLS = ['name', 'role', 'createdAt', 'isActive'] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

function buildOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.UserOrderByWithRelationInput {
    const col: SortCol = (VALID_SORT_COLS as readonly string[]).includes(sortBy)
        ? (sortBy as SortCol)
        : DEFAULT_SORT_COL;
    return { [col]: dir };
}

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

/**
 * Four columns, in the order the Admin reads them: who, how to reach them, what
 * they are, and what they belong to with how each of those stands. Position,
 * rules and collapse are the register's; only the values are described here.
 */
function rosterColumns(t: Dictionary): RegisterColumn<MemberRow>[] {
    return [
        {
            key: 'member',
            head: t.admin.colName,
            sortKey: 'name',
            render: (member) => <MemberIdentity member={member} t={t} />,
        },
        {
            key: 'contact',
            head: t.admin.colContact,
            render: (member) => <MemberContact member={member} t={t} />,
        },
        {
            key: 'role',
            head: t.admin.colRole,
            sortKey: 'role',
            render: (member) => <MemberRole member={member} t={t} />,
        },
        {
            key: 'memberships',
            head: t.admin.colMemberships,
            render: (member) => <MemberMemberships member={member} t={t} />,
        },
    ];
}

/** What can be done to the account — nothing at all on an Owner row. */
function actionsColumn(
    t: Dictionary,
    currentUserId: string,
): RegisterColumn<MemberRow> {
    return {
        key: 'actions',
        head: t.admin.colActions,
        kind: 'actions',
        render: (member) => (
            <MemberRowActions
                member={member}
                currentUserId={currentUserId}
                t={t}
            />
        ),
    };
}

/**
 * The page's own title. The roster's count moved to the register's card header
 * with #166, so the subtitle that carried it is gone rather than said twice.
 */
function MembersHeading({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <h1 className='type-display text-foreground'>{t.admin.membersTitle}</h1>
    );
}

/**
 * An empty roster under an active search or Activity filter is "no matches",
 * not the cold-start "no members yet" — same distinction the Sessions
 * register already makes.
 */
function isMembersFiltered(query: PageQuery): boolean {
    return Boolean(query.search || query.activityId);
}

function MembersRegister({
    rows,
    total,
    query,
    searchParams,
    currentUserId,
    t,
}: Readonly<{
    rows: readonly MemberRow[];
    total: number;
    query: PageQuery;
    searchParams: RawSearchParams;
    currentUserId: string;
    t: Dictionary;
}>) {
    return (
        <Register
            columns={[...rosterColumns(t), actionsColumn(t, currentUserId)]}
            rows={rows}
            caption={t.admin.membersCaption}
            searchParams={searchParams}
            header={{
                title: t.admin.registerTitleMembers,
                count: t.admin.membersSubtitle.replace('{n}', String(total)),
            }}
            empty={{
                mark: t.admin.membersEmptyMark,
                text: isMembersFiltered(query)
                    ? t.admin.noMembersMatch
                    : t.admin.noMembers,
            }}
            pagination={{
                total,
                page: query.page,
                pageSize: query.pageSize,
                labels: t.table.pagination,
            }}
        />
    );
}

function loadPage(query: PageQuery, viewerRole: Role) {
    return Promise.all([
        loadMembers(
            {
                search: query.search,
                activityId: query.activityId,
                orderBy: buildOrderBy(query.sortBy, query.sortDir),
                skip: query.skip,
                take: query.take,
            },
            viewerRole,
            new Date(),
        ),
        getActivities(),
    ]);
}

export default async function AdminMembersPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);
    const sp = await searchParams;
    const query = readQuery(sp);
    const [{ rows, total }, activities] = await loadPage(
        query,
        session.user.role,
    );

    return (
        <div className='space-y-bay'>
            <MembersHeading t={t} />
            <MemberSearch
                filters={query}
                activities={activities}
                t={t}
            />
            <MembersRegister
                rows={rows}
                total={total}
                query={query}
                searchParams={sp}
                currentUserId={session.user.id}
                t={t}
            />
        </div>
    );
}

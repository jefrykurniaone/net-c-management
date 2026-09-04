import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateFnsLocale, getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { WAITING_APPLICANT_WHERE } from '@/lib/admission';
import { isAdminRole } from '@/lib/utils';
import {
    parsePagination,
    parseSort,
    type RawSearchParams,
} from '@/lib/table-params';
import { Register } from '@/components/admin/register';
import type { RegisterColumn } from '@/components/admin/register-columns';
import { ApplicantActions } from './applicant-actions';
import {
    applicantLabel,
    ApplicantAsked,
    ApplicantIdentity,
    ApplicantMemberships,
    type ApplicantRow,
} from './applicant-cells';

/**
 * The admission queue — its own surface, not a band on `/admin/members`. Letting
 * new people in should not be something you find by scrolling past a roster, and
 * it is what gives the nav badge somewhere to point; on most days it is empty,
 * so the empty state is part of the design. The roster is left alone because it
 * leads with attendance and payment counts that are always `0` for an Applicant
 * and omits `phone`, the one field the Admin actually judges on. The **Admit /
 * Decline** vocabulary and what declining does are defined in `CONTEXT.md`.
 */

/** Oldest first: a queue is fair when the longest wait is decided first. */
const DEFAULT_SORT_COL = 'createdAt';

const VALID_SORT_COLS = ['name', 'createdAt'] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

const APPLICANT_SELECT = {
    id: true,
    name: true,
    email: true,
    phone: true,
    createdAt: true,
    memberships: {
        where: { isActive: true, activity: { isActive: true } },
        select: { activity: { select: { id: true, name: true } } },
    },
} as const;

function buildOrderBy(
    sortBy: string,
    dir: 'asc' | 'desc',
): Prisma.UserOrderByWithRelationInput {
    const col: SortCol = (VALID_SORT_COLS as readonly string[]).includes(sortBy)
        ? (sortBy as SortCol)
        : DEFAULT_SORT_COL;
    return { [col]: dir };
}

/**
 * Four columns, in decision order: who they are and how to reach them, when
 * they asked, what they asked for, then the decision itself. Position, rules
 * and collapse are the register's; only the values are described here.
 */
function applicantColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<ApplicantRow>[] {
    return [
        {
            key: 'applicant',
            head: t.admin.colApplicant,
            sortKey: 'name',
            render: (a) => <ApplicantIdentity applicant={a} t={t} />,
        },
        {
            key: 'asked',
            head: t.admin.colAsked,
            kind: 'figure',
            sortKey: 'createdAt',
            render: (a) => (
                <ApplicantAsked applicant={a} t={t} dateLocale={dateLocale} />
            ),
        },
        {
            key: 'memberships',
            head: t.admin.colMembershipsPicked,
            render: (a) => <ApplicantMemberships applicant={a} />,
        },
        {
            key: 'actions',
            head: t.admin.colActions,
            kind: 'actions',
            render: (a) => (
                <ApplicantActions id={a.id} name={applicantLabel(a)} />
            ),
        },
    ];
}

function emptyRow(t: Dictionary): Readonly<{ mark: string; text: string }> {
    return { mark: t.admin.applicantsEmptyMark, text: t.admin.applicantsEmpty };
}

/**
 * The page's own title. How many are waiting moved to the register's card
 * header with #166; what the subtitle keeps is the thing the count does not
 * say — that an Applicant sees nothing until an Admin lets them in.
 */
function ApplicantsHeading({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div>
            <h1 className='type-display text-foreground'>
                {t.admin.applicantsTitle}
            </h1>
            <p className='mt-cell type-caption text-muted-foreground'>
                {t.admin.applicantsHint}
            </p>
        </div>
    );
}

function RosterLink({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <Link
            href='/admin/members'
            className='inline-flex min-h-11 items-center type-label text-primary underline underline-offset-4'>
            {t.admin.applicantsToRoster}
        </Link>
    );
}

export default async function AdminApplicantsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const t = getDictionary(locale);
    const sp = await searchParams;
    const { sortBy, sortDir } = parseSort(sp, DEFAULT_SORT_COL, 'asc');
    const { page, pageSize, skip, take } = parsePagination(sp);

    const [applicants, total] = await Promise.all([
        prisma.user.findMany({
            where: WAITING_APPLICANT_WHERE,
            orderBy: buildOrderBy(sortBy, sortDir),
            skip,
            take,
            select: APPLICANT_SELECT,
        }),
        prisma.user.count({ where: WAITING_APPLICANT_WHERE }),
    ]);

    return (
        <div className='space-y-bay'>
            <ApplicantsHeading t={t} />
            <Register
                columns={applicantColumns(t, getDateFnsLocale(locale))}
                rows={applicants}
                caption={t.admin.applicantsCaption}
                searchParams={sp}
                header={{
                    title: t.admin.registerTitleApplicants,
                    count: t.admin.applicantsSubtitle.replace(
                        '{n}',
                        String(total),
                    ),
                }}
                empty={emptyRow(t)}
                pagination={{ total, page, pageSize, labels: t.table.pagination }}
            />
            <RosterLink t={t} />
        </div>
    );
}

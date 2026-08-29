import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import type { Locale as DateFnsLocale } from 'date-fns';
import { auth } from '@/lib/auth';
import { getActivities } from '@/lib/activity';
import { getDateFnsLocale, getLocale } from '@/lib/i18n/locale';
import {
    getDictionary,
    type Dictionary,
    type Locale,
} from '@/lib/i18n/dictionaries';
import { isAdminRole } from '@/lib/utils';
import {
    parsePagination,
    parseSort,
    type RawSearchParams,
} from '@/lib/table-params';
import { Register } from '@/components/admin/register';
import { paymentColumns } from './payment-columns';
import {
    PaymentFilters,
    type FilterActivity,
    type PaymentFilterValues,
} from './payment-filters';
import {
    buildWhere,
    loadPayments,
    readFilters,
    QUEUE_SORT,
    type QueuePage,
} from './payment-queue-query';

/**
 * The Payments queue — the surface where the community's money is decided.
 *
 * It used to be a list: an Admin scanned past Confirmed and Rejected rows to
 * find the ones needing them, and confirming meant opening each Proof in a new
 * tab, deciding, coming back and finding their place again. Now the rows
 * awaiting a decision are first, the Proof is on the row at a size forty of
 * them can be scanned at, and both decisions are taken from the row through a
 * dialog that restates what is being decided.
 *
 * The reads and the ordering live in `payment-queue-query.ts`; the columns in
 * `payment-columns.tsx`; the lattice, the sort links, the pagination and the
 * collapse below `768px` belong to the shared register. This file is the
 * surface and nothing else.
 */

type TableState = Readonly<{
    sortBy: string;
    sortDir: 'asc' | 'desc';
    page: number;
    pageSize: number | 'all';
}>;

function exportHref(values: PaymentFilterValues, now: Date): string {
    const params = new URLSearchParams({
        month: String(values.month ?? now.getMonth() + 1),
        year: String(values.year ?? now.getFullYear()),
    });
    if (values.activityId) {
        params.set('activityId', values.activityId);
    }
    return `/api/payments/export?${params.toString()}`;
}

function ExportLink({ t, href }: Readonly<{ t: Dictionary; href: string }>) {
    return (
        <a
            href={href}
            download
            className='inline-flex min-h-11 items-center gap-cell border border-rule bg-tile px-block type-label text-foreground hover:bg-board focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            <Download aria-hidden className='size-4' />
            {t.admin.exportCSV}
        </a>
    );
}

/**
 * The heading says how many are waiting, because that is the number the Admin
 * came for. When nothing is, it says so in a plain sentence rather than leaving
 * a screen of decided rows to be read as work outstanding.
 */
function PaymentsHeading({
    t,
    awaitingTotal,
    href,
}: Readonly<{ t: Dictionary; awaitingTotal: number; href: string }>) {
    const waiting =
        awaitingTotal > 0
            ? t.admin.paymentsAwaiting.replace('{n}', String(awaitingTotal))
            : t.admin.paymentsNoneAwaiting;
    return (
        <div className='flex flex-wrap items-start justify-between gap-cell'>
            <div>
                <h1 className='type-display text-foreground'>
                    {t.admin.paymentsTitle}
                </h1>
                <p className='mt-cell type-caption text-muted-foreground'>
                    {t.admin.paymentsSubtitle} · {waiting}
                </p>
            </div>
            <ExportLink t={t} href={href} />
        </div>
    );
}

function PaymentsRegister({
    t,
    dateLocale,
    sp,
    queue,
    table,
}: Readonly<{
    t: Dictionary;
    dateLocale: DateFnsLocale;
    sp: RawSearchParams;
    queue: QueuePage;
    table: TableState;
}>) {
    return (
        <Register
            columns={paymentColumns(t, dateLocale)}
            rows={queue.rows}
            caption={t.admin.paymentsCaption}
            searchParams={sp}
            empty={{
                mark: t.admin.paymentsEmptyMark,
                text: t.admin.noPayments,
            }}
            pagination={{
                total: queue.total,
                page: table.page,
                pageSize: table.pageSize,
                labels: t.table.pagination,
            }}
        />
    );
}

type QueueViewProps = Readonly<{
    locale: Locale;
    sp: RawSearchParams;
    values: PaymentFilterValues;
    activities: readonly FilterActivity[];
    queue: QueuePage;
    table: TableState;
}>;

function PaymentsQueue({
    locale,
    sp,
    values,
    activities,
    queue,
    table,
}: QueueViewProps) {
    const t = getDictionary(locale);
    const now = new Date();
    return (
        <div className='space-y-bay'>
            <PaymentsHeading
                t={t}
                awaitingTotal={queue.awaitingTotal}
                href={exportHref(values, now)}
            />
            <PaymentFilters
                t={t}
                values={values}
                activities={activities}
                thisYear={now.getFullYear()}
                carried={{ ...table, defaultSortBy: QUEUE_SORT }}
            />
            <PaymentsRegister
                t={t}
                dateLocale={getDateFnsLocale(locale)}
                sp={sp}
                queue={queue}
                table={table}
            />
        </div>
    );
}

export default async function AdminPaymentsPage({
    searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
    const [session, locale] = await Promise.all([auth(), getLocale()]);
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }
    const sp = await searchParams;
    const values = readFilters(sp);
    const { sortBy, sortDir } = parseSort(sp, QUEUE_SORT, 'desc');
    const { page, pageSize, skip, take } = parsePagination(sp);

    const [queue, activities] = await Promise.all([
        loadPayments({ where: buildWhere(values), sortBy, sortDir, skip, take }),
        getActivities(),
    ]);

    return (
        <PaymentsQueue
            locale={locale}
            sp={sp}
            values={values}
            activities={activities}
            queue={queue}
            table={{ sortBy, sortDir, page, pageSize }}
        />
    );
}

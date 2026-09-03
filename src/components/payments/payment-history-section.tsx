import { CreditCard } from 'lucide-react';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { RawSearchParams } from '@/lib/table-params';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { PaymentHistoryFilters } from '@/components/payments/payment-history-filters';
import {
    PaymentHistoryList,
    type HistoryPayment,
} from '@/components/payments/payment-history-list';
import {
    HISTORY_PAGE_KEY,
    HISTORY_PAGE_SIZE_KEY,
    type PaymentHistoryQuery,
} from '@/components/payments/payment-history-query';

/** The Activities the filter offers, which are the member's own. */
interface HistoryActivityOption {
    readonly id: string;
    readonly name: string;
}

/**
 * The member's Payment submission history: the filters that write the URL, the
 * page of rows they select, and the pager. A filter that matches nothing shows
 * the empty state rather than an empty list, and keeps the filters above it so
 * the reader can widen the query again.
 *
 * Draws only — `payment-history-query.ts` has already read and validated the
 * URL, and the same key constants are used here so the pager writes the keys
 * the query reads.
 */
export function PaymentHistorySection({
    payments,
    total,
    query,
    userActivities,
    searchParams,
    dateLocale,
    t,
}: Readonly<{
    payments: readonly HistoryPayment[];
    total: number;
    query: PaymentHistoryQuery;
    userActivities: readonly HistoryActivityOption[];
    searchParams: RawSearchParams;
    dateLocale: DateFnsLocale;
    t: Dictionary;
}>) {
    return (
        <section className='space-y-3'>
            <h2 className='type-label text-muted-foreground'>
                {t.payments.historyLabel}
            </h2>

            <PaymentHistoryFilters
                t={t}
                historyStatus={query.status}
                historyActivity={query.activityId}
                userActivities={userActivities}
                historyPageSize={query.pageSize}
            />

            {payments.length === 0 ? (
                <EmptyState
                    icon={CreditCard}
                    chipLabel={t.common.empty}
                    title={t.payments.noPayments}
                />
            ) : (
                <PaymentHistoryList
                    payments={payments}
                    t={t}
                    dateLocale={dateLocale}
                />
            )}
            <DataTablePagination
                total={total}
                page={query.page}
                pageSize={query.pageSize}
                searchParams={searchParams}
                pageKey={HISTORY_PAGE_KEY}
                pageSizeKey={HISTORY_PAGE_SIZE_KEY}
                labels={t.table.pagination}
            />
        </section>
    );
}

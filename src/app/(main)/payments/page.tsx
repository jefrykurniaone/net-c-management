import { auth } from "@/lib/auth";
import { COLUMN_MEASURE } from "@/components/layout/measure";
import { redirect } from "next/navigation";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import {
  MonthlyDuesSection,
  OutstandingReservationsSection,
} from "@/components/payments/monthly-dues-cards";
import { PaymentHistorySection } from "@/components/payments/PaymentHistorySection";
import { resolvePaymentHistoryQuery } from "@/components/payments/payment-history-query";
import { loadMemberPayments } from "@/components/payments/member-payments-data";
import { resolveMonthlyDues } from "@/components/payments/monthly-dues-rows";
import { getLocale, getDateFnsLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentPeriod } from "@/lib/payment-mode";
import { releaseExpiredHolds } from "@/lib/holds";

export default async function PaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);
  const dateLocale = getDateFnsLocale(locale);
  const userId = session.user.id;
  const period = currentPeriod(new Date());

  await releaseExpiredHolds();

  const sp = await searchParams;
  const history = resolvePaymentHistoryQuery(sp, userId);
  const data = await loadMemberPayments({ userId, period, history });
  const dues = resolveMonthlyDues({
    memberships: data.memberships,
    monthPayments: data.monthPayments,
    liveHolds: data.liveHolds,
    period,
  });

  return (
    <div className={`${COLUMN_MEASURE} space-y-6`}>
      <h1 className="text-2xl font-bold text-foreground">{t.payments.title}</h1>

      {/* Unpaid dues banner */}
      {dues.firstUnpaid && (
        <UnpaidBanner
          title={t.payments.unpaidDuesTitle
            .replace("{count}", String(dues.unpaidCount))
            .replace("{month}", t.months[period.month])}
          description={`${dues.firstUnpaid.name} · Rp ${dues.firstUnpaid.duesAmount.toLocaleString("id-ID")}`}
          ctaLabel={t.payments.payNow}
          href="/payments/upload"
        />
      )}

      {/* Outstanding per-session reservations — pay before the hold lapses */}
      <OutstandingReservationsSection
        bills={data.outstandingBills}
        t={t}
        dateLocale={dateLocale}
      />

      {/* Current-month dues per activity */}
      <MonthlyDuesSection
        rows={dues.rows}
        monthLabel={`${t.months[period.month]} ${period.year}`}
        t={t}
      />

      <PaymentHistorySection
        payments={data.historyPayments}
        total={data.historyTotal}
        query={history}
        userActivities={data.userActivities}
        searchParams={sp}
        dateLocale={dateLocale}
        t={t}
      />
    </div>
  );
}

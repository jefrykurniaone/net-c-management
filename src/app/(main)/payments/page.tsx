import { auth } from "@/lib/auth";
import { COLUMN_MEASURE } from "@/components/layout/measure";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { id as localeId, enUS } from "date-fns/locale";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import {
  MonthlyDuesSection,
  OutstandingReservationsSection,
  type MonthlyDuesRow,
} from "@/components/payments/monthly-dues-cards";
import { PaymentHistoryFilters } from "@/components/payments/payment-history-filters";
import { PaymentHistoryList } from "@/components/payments/payment-history-list";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { parsePagination } from "@/lib/table-params";
import { CreditCard } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentPeriod, resolvePaymentMode } from "@/lib/payment-mode";
import { resolveDuesRate } from "@/lib/dues-rate";
import { getOutstandingSessionBills } from "@/lib/payments";
import { releaseExpiredHolds } from "@/lib/holds";
import type { Prisma } from "@prisma/client";

/** Which of the three standings a monthly Activity's Dues card draws. */
function duesStatus(paid: boolean, inReview: boolean): MonthlyDuesRow["status"] {
  if (paid) return "paid";
  if (inReview) return "inReview";
  return "unpaid";
}

export default async function PaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);
  const dateLocale = locale === "id" ? localeId : enUS;
  const userId = session.user.id;
  const { month: currentMonth, year: currentYear } = currentPeriod(new Date());

  await releaseExpiredHolds();

  // History filters from URL — validate against enum to prevent Prisma errors
  const sp = await searchParams;
  const raw = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);
  const VALID_PAYMENT_STATUSES = ["PENDING", "CONFIRMED", "REJECTED"] as const;
  type ValidStatus = (typeof VALID_PAYMENT_STATUSES)[number];
  const rawStatus = raw("historyStatus");
  const historyStatus: ValidStatus | undefined = (VALID_PAYMENT_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as ValidStatus)
    : undefined;
  const historyActivity = raw("historyActivity") || undefined;

  const { page: historyPage, pageSize: historyPageSize, skip: historySkip, take: historyTake } =
    parsePagination(sp, "historyPage", "historyPageSize");

  const historyWhere: Prisma.PaymentWhereInput = {
    userId,
    ...(historyStatus ? { status: historyStatus } : {}),
    ...(historyActivity ? { activityId: historyActivity } : {}),
  };

  const [historyPayments, historyTotal, memberships, monthPayments, outstandingBills, liveHolds, userActivities] =
    await Promise.all([
      prisma.payment.findMany({
        where: historyWhere,
        orderBy: { createdAt: "desc" },
        skip: historySkip,
        take: historyTake,
        include: {
          activity: {
            select: { id: true, name: true, adminWhatsapp: true },
          },
        },
      }),
      prisma.payment.count({ where: historyWhere }),
      prisma.membership.findMany({
        where: { userId, isActive: true, activity: { isActive: true } },
        select: {
          paymentMode: true,
          effectiveFrom: true,
          pendingMode: true,
          pendingEffectiveFrom: true,
          activity: {
            select: {
              id: true,
              name: true,
              duesRates: { select: { amount: true, effectiveFrom: true } },
              allowsMonthly: true,
              allowsPerSession: true,
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { userId, month: currentMonth, year: currentYear, type: "MONTHLY" },
        select: { activityId: true, status: true },
      }),
      getOutstandingSessionBills({ userId }),
      prisma.attendance.findMany({
        where: {
          userId,
          holdExpiresAt: { not: null },
          session: { status: { in: ["SCHEDULED", "ONGOING"] } },
        },
        select: { holdExpiresAt: true, session: { select: { activityId: true } } },
      }),
      prisma.activity.findMany({
        where: { isActive: true, memberships: { some: { userId, isActive: true } } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  // Earliest live hold per activity — a MONTHLY member's reserved seat lapses
  // at this instant unless the dues are paid, so the dues card shows it.
  const holdByActivity = new Map<string, Date>();
  for (const hold of liveHolds) {
    const current = holdByActivity.get(hold.session.activityId);
    if (!current || hold.holdExpiresAt! < current) {
      holdByActivity.set(hold.session.activityId, hold.holdExpiresAt!);
    }
  }

  // Build the payment-status map before filtering monthly activities so the
  // filter can check whether a payment record already exists this period.
  const statusByActivity = new Map(monthPayments.map((p) => [p.activityId, p.status]));

  // No rate covering the Period is a broken invariant (dues-rate.ts) — read
  // like the "no fee set" branch below, never a free Period.
  const period = { month: currentMonth, year: currentYear };
  const duesAmountByActivity = new Map(
    memberships.map((m) => [
      m.activity.id,
      resolveDuesRate(m.activity.duesRates, period) ?? 0,
    ]),
  );

  // Bill only for the mode the member actually chose: a MONTHLY membership owes
  // this month's dues; a PER_SESSION membership owes per reserved session (the
  // outstandingBills below); an unselected (null) mode owes nothing yet. Every
  // MONTHLY membership with a fee is surfaced for the period — the dashboard's
  // unpaid banner uses the same rule, so the two views stay consistent (they
  // used to diverge when a registered seat carried no live hold — BUG-04).
  const monthlyActivities = memberships
    .filter(
      (m) =>
        resolvePaymentMode(
          m,
          { allowsMonthly: m.activity.allowsMonthly, allowsPerSession: m.activity.allowsPerSession },
          currentMonth,
          currentYear,
        ) === "MONTHLY" &&
        (duesAmountByActivity.get(m.activity.id) ?? 0) > 0,
    )
    .map((m) => ({
      id: m.activity.id,
      name: m.activity.name,
      duesAmount: duesAmountByActivity.get(m.activity.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const isPaid = (activityId: string) => statusByActivity.get(activityId) === "CONFIRMED";
  // A submitted-but-unconfirmed proof is "in review": the member has acted, so
  // it neither nags in the banner nor shows as plain "Unpaid" on the card.
  const isInReview = (activityId: string) => statusByActivity.get(activityId) === "PENDING";
  const unpaidActivities = monthlyActivities.filter(
    (a) => !isPaid(a.id) && !isInReview(a.id),
  );
  const firstUnpaid = unpaidActivities[0];

  const monthLabel = `${t.months[currentMonth]} ${currentYear}`;

  // The current Billing Period's standing per Activity, already resolved —
  // the card only ever draws one of these three states, never picks one.
  const monthlyDuesRows: MonthlyDuesRow[] = monthlyActivities.map((activity) => {
    const paid = isPaid(activity.id);
    const inReview = isInReview(activity.id);
    const status = duesStatus(paid, inReview);
    return {
      id: activity.id,
      name: activity.name,
      duesAmount: activity.duesAmount,
      status,
      hold: status === "unpaid" ? holdByActivity.get(activity.id) : undefined,
    };
  });

  return (
    <div className={`${COLUMN_MEASURE} space-y-6`}>
      <h1 className="text-2xl font-bold text-foreground">{t.payments.title}</h1>

      {/* Unpaid dues banner */}
      {firstUnpaid && (
        <UnpaidBanner
          title={t.payments.unpaidDuesTitle
            .replace("{count}", String(unpaidActivities.length))
            .replace("{month}", t.months[currentMonth])}
          description={`${firstUnpaid.name} · Rp ${firstUnpaid.duesAmount.toLocaleString("id-ID")}`}
          ctaLabel={t.payments.payNow}
          href="/payments/upload"
        />
      )}

      {/* Outstanding per-session reservations — pay before the hold lapses */}
      <OutstandingReservationsSection
        bills={outstandingBills}
        t={t}
        dateLocale={dateLocale}
      />

      {/* Current-month dues per activity */}
      <MonthlyDuesSection rows={monthlyDuesRows} monthLabel={monthLabel} t={t} />

      {/* Submission history */}
      <section className="space-y-3">
        <h2 className="type-label text-muted-foreground">
          {t.payments.historyLabel}
        </h2>

        <PaymentHistoryFilters
          t={t}
          historyStatus={historyStatus}
          historyActivity={historyActivity}
          userActivities={userActivities}
          historyPageSize={historyPageSize}
        />

        {historyPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            chipLabel={t.common.empty}
            title={t.payments.noPayments}
          />
        ) : (
          <PaymentHistoryList
            payments={historyPayments}
            t={t}
            dateLocale={dateLocale}
          />
        )}
        <DataTablePagination
          total={historyTotal}
          page={historyPage}
          pageSize={historyPageSize}
          searchParams={sp}
          pageKey="historyPage"
          pageSizeKey="historyPageSize"
          labels={t.table.pagination}
        />
      </section>
    </div>
  );
}

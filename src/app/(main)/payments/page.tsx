import { auth } from "@/lib/auth";
import { COLUMN_MEASURE } from "@/components/layout/measure";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { Mark } from "@/components/ui/mark";
import { ActivityInitial } from "@/components/activity/activity-badge";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import { HoldCountdown } from "@/components/payments/hold-countdown";
import { PaymentHistoryFilters } from "@/components/payments/payment-history-filters";
import { PaymentHistoryList } from "@/components/payments/payment-history-list";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { parsePagination } from "@/lib/table-params";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentPeriod, resolvePaymentMode } from "@/lib/payment-mode";
import { resolveDuesRate } from "@/lib/dues-rate";
import { getOutstandingSessionBills } from "@/lib/payments";
import { releaseExpiredHolds } from "@/lib/holds";
import type { Prisma } from "@prisma/client";

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
      {outstandingBills.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t.payments.outstandingReservations}
          </p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {outstandingBills.map((bill) => (
              <Link
                key={bill.sessionId}
                href={`/sessions/${bill.sessionId}/pay`}
                className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
              >
                <ActivityInitial name={bill.activity.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{bill.title}</p>
                  {/* The Activity name rides the caption line: the tile alone
                      cannot tell apart two Activities sharing an initial. */}
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {bill.activity.name} · Rp {bill.fee.toLocaleString("id-ID")} ·{" "}
                    {format(new Date(bill.date), "d MMM", { locale: dateLocale })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {/* A Seat held on money not yet sent is provisional — tape. */}
                  <Mark kind="tape">{t.payments.payNow}</Mark>
                  <p className="text-[11px] text-warning tabular-nums">
                    <HoldCountdown
                      iso={new Date(bill.holdExpiresAt).toISOString()}
                      template={t.payments.payWithin}
                      expiredLabel={t.sessions.holdExpired}
                    />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Current-month dues per activity */}
      {monthlyActivities.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {monthLabel}
          </p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {monthlyActivities.map((activity) => {
              const paid = isPaid(activity.id);
              const inReview = isInReview(activity.id);
              const hold = paid || inReview ? undefined : holdByActivity.get(activity.id);
              return (
                <div key={activity.id} className="flex items-center gap-3 p-4">
                  <ActivityInitial name={activity.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{activity.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Rp {activity.duesAmount.toLocaleString("id-ID")} {t.payments.perMonth}
                    </p>
                  </div>
                  {paid ? (
                    <Mark kind="ink">{t.payments.paid}</Mark>
                  ) : inReview ? (
                    <Mark kind="tape">{t.payments.inReview}</Mark>
                  ) : (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Link href="/payments/upload">
                        {/* Dues nobody has paid yet: expected, not yet placed. */}
                        <Mark kind="blank">{t.payments.unpaid}</Mark>
                      </Link>
                      {hold && (
                        <p className="text-[11px] text-warning tabular-nums">
                          <HoldCountdown
                            iso={hold.toISOString()}
                            template={t.payments.payWithin}
                            expiredLabel={t.sessions.holdExpired}
                          />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Submission history */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t.payments.historyLabel}
        </p>

        <PaymentHistoryFilters
          t={t}
          historyStatus={historyStatus}
          historyActivity={historyActivity}
          userActivities={userActivities}
          historyPageSize={historyPageSize}
        />

        {historyPayments.length === 0 ? (
          <EmptyState icon={CreditCard} title={t.payments.noPayments} />
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

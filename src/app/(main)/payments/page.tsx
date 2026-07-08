import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ActivityInitial } from "@/components/activity/activity-badge";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import { HoldCountdown } from "@/components/payments/hold-countdown";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { parsePagination } from "@/lib/table-params";
import Link from "next/link";
import { CreditCard, ExternalLink, MessageCircle } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { currentPeriod, resolvePaymentMode } from "@/lib/payment-mode";
import { getOutstandingSessionBills } from "@/lib/payments";
import { releaseExpiredHolds } from "@/lib/holds";
import { paymentStatusVariant } from "@/lib/utils";
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
            select: { id: true, name: true, color: true, icon: true, adminWhatsapp: true },
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
              color: true,
              monthlyFee: true,
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

  // Bill only for the mode the member actually chose: a MONTHLY membership owes
  // this month's dues; a PER_SESSION membership owes per reserved session (the
  // outstandingBills below); an unselected (null) mode owes nothing yet.
  // Only surface the dues entry once the member has triggered a bill — either
  // by reserving a session (live hold) or by having a payment record this period.
  // Merely switching the payment-mode preference without registering owes nothing.
  const monthlyActivities = memberships
    .filter(
      (m) =>
        resolvePaymentMode(
          m,
          { allowsMonthly: m.activity.allowsMonthly, allowsPerSession: m.activity.allowsPerSession },
          currentMonth,
          currentYear,
        ) === "MONTHLY" &&
        m.activity.monthlyFee > 0 &&
        (statusByActivity.has(m.activity.id) || holdByActivity.has(m.activity.id)),
    )
    .map((m) => m.activity)
    .sort((a, b) => a.name.localeCompare(b.name));
  const isPaid = (activityId: string) => statusByActivity.get(activityId) === "CONFIRMED";
  const unpaidActivities = monthlyActivities.filter((a) => !isPaid(a.id));
  const firstUnpaid = unpaidActivities[0];

  const monthLabel = `${t.months[currentMonth]} ${currentYear}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t.payments.title}</h1>

      {/* Unpaid dues banner */}
      {firstUnpaid && (
        <UnpaidBanner
          title={t.payments.unpaidDuesTitle
            .replace("{count}", String(unpaidActivities.length))
            .replace("{month}", t.months[currentMonth])}
          description={`${firstUnpaid.name} · Rp ${firstUnpaid.monthlyFee.toLocaleString("id-ID")}`}
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
                <ActivityInitial name={bill.activity.name} color={bill.activity.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{bill.title}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Rp {bill.fee.toLocaleString("id-ID")} ·{" "}
                    {format(new Date(bill.date), "d MMM", { locale: dateLocale })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="warning">{t.payments.payNow}</Badge>
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
              const hold = paid ? undefined : holdByActivity.get(activity.id);
              return (
                <div key={activity.id} className="flex items-center gap-3 p-4">
                  <ActivityInitial name={activity.name} color={activity.color} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{activity.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Rp {activity.monthlyFee.toLocaleString("id-ID")} {t.payments.perMonth}
                    </p>
                  </div>
                  {paid ? (
                    <Badge variant="success">{t.payments.paid}</Badge>
                  ) : (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Link href="/payments/upload">
                        <Badge variant="warning">{t.payments.unpaid}</Badge>
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

        {/* History filters */}
        <form method="GET" className="flex flex-wrap gap-2">
          <select
            name="historyStatus"
            defaultValue={historyStatus ?? ""}
            data-testid="history-status-filter"
            className="h-8 border border-input rounded-lg px-2.5 text-xs font-medium text-secondary-foreground bg-card">
            <option value="">{t.table.filter.allStatuses}</option>
            <option value="PENDING">{t.payments.historyStatus.PENDING}</option>
            <option value="CONFIRMED">{t.payments.historyStatus.CONFIRMED}</option>
            <option value="REJECTED">{t.payments.historyStatus.REJECTED}</option>
          </select>
          {userActivities.length > 1 && (
            <select
              name="historyActivity"
              defaultValue={historyActivity ?? ""}
              data-testid="history-activity-filter"
              className="h-8 border border-input rounded-lg px-2.5 text-xs font-medium text-secondary-foreground bg-card">
              <option value="">{t.table.filter.allActivities}</option>
              {userActivities.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
          {historyPageSize !== 10 && <input type="hidden" name="historyPageSize" value={String(historyPageSize)} />}
          <button
            type="submit"
            className="h-8 border border-input rounded-lg px-3 text-xs font-semibold text-secondary-foreground bg-card hover:bg-muted transition-colors">
            {t.table.search.btn}
          </button>
        </form>

        {historyPayments.length === 0 ? (
          <EmptyState icon={CreditCard} title={t.payments.noPayments} />
        ) : (
          <div className="space-y-3">
            {historyPayments.map((payment) => (
              <div
                key={payment.id}
                className="relative overflow-hidden bg-card rounded-xl border border-border p-4"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[3px]"
                  style={{ backgroundColor: payment.activity.color }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {payment.activity.name} · {t.months[payment.month]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {t.payments.submitted}{" "}
                      {format(new Date(payment.createdAt), "MMM d", { locale: dateLocale })} · Rp{" "}
                      {payment.amount.toLocaleString("id-ID")}
                    </p>
                    {payment.status === "REJECTED" && payment.notes && (
                      <p className="text-xs text-destructive mt-1">
                        {t.payments.rejectReason}: {payment.notes}
                      </p>
                    )}
                    {payment.status === "REJECTED" && (
                      <p className="text-xs text-warning mt-1">
                        {t.payments.rejectedRefundWarning}
                        {payment.activity.adminWhatsapp && (
                          <>
                            {" "}
                            <a
                              href={`https://wa.me/${payment.activity.adminWhatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-success hover:underline"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {t.sessions.contactAdmin}
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={paymentStatusVariant(payment.status)}>
                      {t.payments.historyStatus[payment.status]}
                    </Badge>
                    {payment.proofUrl && (
                      <a
                        href={payment.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.payments.viewProof}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

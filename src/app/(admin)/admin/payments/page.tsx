import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { StateMark, MarkedValue } from "@/components/ui/mark";
import { Button } from "@/components/ui/button";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { Download } from "lucide-react";
import { PaymentActions } from "./payment-actions";
import { PaymentCards } from "./payment-cards";
import type { Payment } from "@prisma/client";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getActivities } from "@/lib/activity";
import { isAdminRole } from "@/lib/utils";
import { paymentState } from "@/lib/status-mark";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { parsePagination, parseSort, parseSearch } from "@/lib/table-params";
import { SortableTh } from "@/components/ui/sortable-th";
import type { Prisma } from "@prisma/client";

type PaymentRow = Payment & {
  user: { name: string | null; email: string | null };
  activity: { id: string; name: string; icon: string | null };
};

const VALID_SORT: Record<string, Prisma.PaymentOrderByWithRelationInput> = {
  createdAt: { createdAt: "desc" },
  amount: { amount: "desc" },
  month: { year: "desc" },
  member: { user: { name: "asc" } },
};

function buildPaymentOrderBy(
  sortBy: string,
  dir: "asc" | "desc",
): Prisma.PaymentOrderByWithRelationInput[] {
  if (sortBy === "month") return [{ year: dir }, { month: dir }, { createdAt: "desc" }];
  if (sortBy === "member") return [{ user: { name: dir } }, { createdAt: "desc" }];
  if (sortBy === "amount") return [{ amount: dir }, { createdAt: "desc" }];
  return [{ createdAt: dir }];
}

export default async function AdminPaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const t = getDictionary(locale);
  const dateLocale = locale === 'id' ? localeId : enUS;

  const sp = await searchParams;
  const raw = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]);

  const filterMonth = raw("month") ? Number.parseInt(raw("month")!) : undefined;
  const filterYear = raw("year") ? Number.parseInt(raw("year")!) : undefined;
  const VALID_STATUSES = ["PENDING", "CONFIRMED", "REJECTED"] as const;
  type ValidStatus = (typeof VALID_STATUSES)[number];
  const rawStatus = raw("status");
  const filterStatus: ValidStatus | undefined = (VALID_STATUSES as readonly string[]).includes(rawStatus ?? "")
    ? (rawStatus as ValidStatus)
    : undefined;
  const filterActivity = raw("activityId") || undefined;
  const search = parseSearch(sp);
  const { sortBy, sortDir } = parseSort(sp, "createdAt", "desc");
  const { page, pageSize, skip, take } = parsePagination(sp);

  const now = new Date();
  const currentMonth = filterMonth ?? now.getMonth() + 1;
  const currentYear = filterYear ?? now.getFullYear();

  const where: Prisma.PaymentWhereInput = {
    ...(filterMonth ? { month: filterMonth } : {}),
    ...(filterYear ? { year: filterYear } : {}),
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterActivity ? { activityId: filterActivity } : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [payments, total, activities] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: buildPaymentOrderBy(sortBy, sortDir),
      skip,
      take,
      include: {
        user: { select: { name: true, email: true } },
        activity: { select: { id: true, name: true, icon: true } },
      },
    }),
    prisma.payment.count({ where }),
    getActivities(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.admin.paymentsTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.admin.paymentsSubtitle}</p>
        </div>
        <a
          href={`/api/payments/export?month=${currentMonth}&year=${currentYear}${filterActivity ? `&activityId=${filterActivity}` : ""}`}
          download
          className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold text-secondary-foreground bg-card border border-input rounded-lg px-3.5 hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          {t.admin.exportCSV}
        </a>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={t.table.search.memberPlaceholder}
          data-testid="search-input"
          className="h-9 border border-input rounded-lg px-3 text-sm bg-card w-full sm:w-64 placeholder:text-subtle-foreground"
        />
        <select
          name="month"
          defaultValue={String(filterMonth ?? "")}
          className="h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto"
        >
          <option value="">{t.admin.allMonths}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {t.months[m]}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={String(filterYear ?? "")}
          className="h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto"
        >
          <option value="">{t.admin.allYears}</option>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filterStatus ?? ""}
          className="h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto"
        >
          <option value="">{t.admin.allStatuses}</option>
          <option value="PENDING">{t.paymentStatus.PENDING}</option>
          <option value="CONFIRMED">{t.paymentStatus.CONFIRMED}</option>
          <option value="REJECTED">{t.paymentStatus.REJECTED}</option>
        </select>
        <select
          name="activityId"
          defaultValue={filterActivity ?? ""}
          className="h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto"
        >
          <option value="">{t.activity.filterAll}</option>
          {activities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {/* Preserve sort and page size */}
        {sortBy !== "createdAt" && <input type="hidden" name="sortBy" value={sortBy} />}
        {sortDir !== "desc" && <input type="hidden" name="sortDir" value={sortDir} />}
        {pageSize !== 10 && <input type="hidden" name="pageSize" value={String(pageSize)} />}
        <Button type="submit" variant="outline">
          {t.admin.filterBtn}
        </Button>
      </form>

      {/* Mobile: stacked cards */}
      <div className="md:hidden">
        <PaymentCards payments={payments} t={t} locale={locale} />
        <DataTablePagination total={total} page={page} pageSize={pageSize} searchParams={sp} labels={t.table.pagination} />
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <SortableTh column="member" label={t.admin.colMember} searchParams={sp} />
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.activity.label}</th>
                <SortableTh column="month" label={t.admin.colMonth} searchParams={sp} />
                <SortableTh column="amount" label={t.admin.colAmount} searchParams={sp} align="right" />
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colStatus}</th>
                <SortableTh column="createdAt" label={t.admin.colDate} searchParams={sp} />
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: PaymentRow) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">
                      {p.user.name ?? p.user.email}
                    </p>
                    <p className="text-xs text-subtle-foreground">{p.user.email}</p>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <ActivityBadge name={p.activity.name} icon={p.activity.icon} />
                  </td>
                  <td className="px-5 py-3 text-secondary-foreground whitespace-nowrap">
                    {t.months[p.month]} {p.year}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground font-semibold whitespace-nowrap tabular-nums">
                    <MarkedValue state={paymentState(p.status)}>
                      Rp {p.amount.toLocaleString("id-ID")}
                    </MarkedValue>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StateMark
                      state={paymentState(p.status)}
                      labels={t.marks}
                    />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(p.createdAt), "d MMM yyyy", { locale: dateLocale })}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <PaymentActions payment={p} />
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {t.admin.noPayments}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 border-t border-border">
          <DataTablePagination total={total} page={page} pageSize={pageSize} searchParams={sp} labels={t.table.pagination} />
        </div>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { CreditCard, Download } from "lucide-react";
import { PaymentActions } from "./payment-actions";
import { PaymentCards } from "./payment-cards";
import type { Payment } from "@prisma/client";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getActivities } from "@/lib/activity";
import { paymentStatusVariant, isAdminRole } from "@/lib/utils";

type PaymentRow = Payment & {
  user: { name: string | null; email: string | null };
  activity: { id: string; name: string; color: string; icon: string | null };
};

export default async function AdminPaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ month?: string; year?: string; status?: string; activityId?: string }>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const t = getDictionary(locale);
  const dateLocale = locale === 'id' ? localeId : enUS;

  const sp = await searchParams;
  const filterMonth = sp.month ? Number.parseInt(sp.month) : undefined;
  const filterYear = sp.year ? Number.parseInt(sp.year) : undefined;
  const filterStatus = sp.status as "PENDING" | "CONFIRMED" | "REJECTED" | undefined;
  const filterActivity = sp.activityId || undefined;

  const now = new Date();
  const currentMonth = filterMonth ?? now.getMonth() + 1;
  const currentYear = filterYear ?? now.getFullYear();

  const [payments, activities] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ...(filterMonth ? { month: filterMonth } : {}),
        ...(filterYear ? { year: filterYear } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterActivity ? { activityId: filterActivity } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        activity: { select: { id: true, name: true, color: true, icon: true } },
      },
    }),
    getActivities(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {t.admin.paymentsTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.admin.paymentsSubtitle}</p>
        </div>
        <a
          href={`/api/payments/export?month=${currentMonth}&year=${currentYear}${filterActivity ? `&activityId=${filterActivity}` : ""}`}
          download
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline border border-border rounded-lg px-3 py-2"
        >
          <Download className="w-4 h-4" />
          {t.admin.exportCSV}
        </a>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="GET">
        <select
          name="month"
          defaultValue={String(filterMonth ?? "")}
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
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
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
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
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
        >
          <option value="">{t.admin.allStatuses}</option>
          <option value="PENDING">{t.paymentStatus.PENDING}</option>
          <option value="CONFIRMED">{t.paymentStatus.CONFIRMED}</option>
          <option value="REJECTED">{t.paymentStatus.REJECTED}</option>
        </select>
        <select
          name="activityId"
          defaultValue={filterActivity ?? ""}
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
        >
          <option value="">{t.activity.filterAll}</option>
          {activities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
          <Button type="submit" variant="outline" size="sm">
            {t.admin.filterBtn}
        </Button>
      </form>

      {/* Mobile: stacked cards (< md) */}
      <div className="md:hidden">
        <PaymentCards payments={payments} t={t} locale={locale} />
      </div>

      {/* Desktop: full table (>= md) */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.admin.colMember}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.activity.label}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.admin.colMonth}</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t.admin.colAmount}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colStatus}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.admin.colDate}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: PaymentRow) => {
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border hover:bg-muted"
                  >
                    <td className="relative px-4 py-3">
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 h-full w-[3px]"
                        style={{ backgroundColor: p.activity.color }}
                      />
                      <p className="font-medium text-foreground">
                        {p.user.name ?? p.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.user.email}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActivityBadge name={p.activity.name} color={p.activity.color} icon={p.activity.icon} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {t.months[p.month]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-medium whitespace-nowrap tabular-nums">
                      Rp {p.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={paymentStatusVariant(p.status)}
                      >
                        {t.paymentStatus[p.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(p.createdAt), "d MMM yyyy", { locale: dateLocale })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentActions payment={p} />
                    </td>
                  </tr>
                );
              })}
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
      </div>
    </div>
  );
}

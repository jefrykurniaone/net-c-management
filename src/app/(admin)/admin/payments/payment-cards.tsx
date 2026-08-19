import { format } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns";
import { StateMark, MarkedValue } from "@/components/ui/mark";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { PaymentActions } from "./payment-actions";
import { paymentState } from "@/lib/status-mark";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getDateFnsLocale } from "@/lib/i18n/locale";
import type { Payment } from "@prisma/client";

type PaymentRow = Payment & {
  user: { name: string | null; email: string | null };
  activity: { id: string; name: string; icon: string | null };
};

function PaymentCard({
  p,
  t,
  dateLocale,
}: Readonly<{ p: PaymentRow; t: Dictionary; dateLocale: DateFnsLocale }>) {
  return (
    <MobileCard>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{p.user.name ?? p.user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{p.user.email}</p>
      </div>
      <CardField label={t.activity.label}>
        <ActivityBadge name={p.activity.name} icon={p.activity.icon} />
      </CardField>
      <CardField label={t.admin.colMonth}>
        {t.months[p.month]} {p.year}
      </CardField>
      <CardField label={t.admin.colAmount}>
        <MarkedValue
          state={paymentState(p.status)}
          className="font-medium tabular-nums"
        >
          Rp {p.amount.toLocaleString("id-ID")}
        </MarkedValue>
      </CardField>
      <CardField label={t.admin.colStatus}>
        <StateMark state={paymentState(p.status)} labels={t.marks} />
      </CardField>
      <CardField label={t.admin.colDate}>
        {format(new Date(p.createdAt), "d MMM yyyy", { locale: dateLocale })}
      </CardField>
      <PaymentActions payment={p} />
    </MobileCard>
  );
}

export function PaymentCards({
  payments,
  t,
  locale,
}: Readonly<{ payments: PaymentRow[]; t: Dictionary; locale: Locale }>) {
  const dateLocale = getDateFnsLocale(locale);
  if (payments.length === 0) return <CardListEmpty>{t.admin.noPayments}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <PaymentCard key={p.id} p={p} t={t} dateLocale={dateLocale} />
      ))}
    </div>
  );
}

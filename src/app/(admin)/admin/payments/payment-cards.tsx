import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import type { Locale as DateFnsLocale } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EkskulBadge } from "@/components/ekskul/ekskul-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { PaymentActions } from "./payment-actions";
import { paymentStatusVariant } from "@/lib/utils";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import type { Payment } from "@prisma/client";

type PaymentRow = Payment & {
  user: { name: string | null; email: string | null };
  ekskul: { id: string; name: string; color: string; icon: string | null };
};

function PaymentCard({
  p,
  t,
  dateLocale,
}: Readonly<{ p: PaymentRow; t: Dictionary; dateLocale: DateFnsLocale }>) {
  return (
    <MobileCard accentColor={p.ekskul.color}>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{p.user.name ?? p.user.email}</p>
        <p className="truncate text-xs text-muted-foreground">{p.user.email}</p>
      </div>
      <CardField label={t.ekskul.label}>
        <EkskulBadge name={p.ekskul.name} color={p.ekskul.color} icon={p.ekskul.icon} />
      </CardField>
      <CardField label={t.admin.colMonth}>
        {t.months[p.month]} {p.year}
      </CardField>
      <CardField label={t.admin.colAmount}>
        <span className="font-medium tabular-nums">Rp {p.amount.toLocaleString("id-ID")}</span>
      </CardField>
      <CardField label={t.admin.colStatus}>
        <Badge variant={paymentStatusVariant(p.status)}>{t.paymentStatus[p.status]}</Badge>
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
  const dateLocale = locale === "id" ? localeId : enUS;
  if (payments.length === 0) return <CardListEmpty>{t.admin.noPayments}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <PaymentCard key={p.id} p={p} t={t} dateLocale={dateLocale} />
      ))}
    </div>
  );
}

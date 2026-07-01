import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EkskulBadge } from "@/components/ekskul/ekskul-badge";
import { EkskulFilter } from "@/components/ekskul/ekskul-filter";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { CreditCard, Upload, ExternalLink } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getUserEkskulIds } from "@/lib/ekskul";
import { paymentStatusVariant } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ ekskulId?: string }> }>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);

  const myEkskulIds = await getUserEkskulIds(session.user.id);
  const sp = await searchParams;
  const selected =
    sp.ekskulId && myEkskulIds.includes(sp.ekskulId) ? sp.ekskulId : undefined;

  const [payments, myEkskuls] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId: session.user.id,
        ...(selected ? { ekskulId: selected } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        ekskul: { select: { id: true, name: true, color: true, icon: true } },
      },
    }),
    prisma.ekskul.findMany({
      where: { id: { in: myEkskulIds }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const hasCurrentMonth = payments.some(
    (p) => p.month === currentMonth && p.year === currentYear
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {t.payments.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.payments.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {myEkskuls.length > 1 && (
            <EkskulFilter
              ekskuls={myEkskuls}
              selected={selected}
              allLabel={t.ekskul.filterAll}
            />
          )}
          <Link href="/payments/upload">
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              {t.payments.uploadBtn}
            </Button>
          </Link>
        </div>
      </div>

      {/* Current month status banner */}
      {!hasCurrentMonth && (
        <UnpaidBanner
          title={`${t.months[currentMonth]} ${currentYear} ${t.payments.unpaidBannerTitle}`}
          description={t.payments.unpaidBannerSub}
          ctaLabel={t.payments.payNow}
          href="/payments/upload"
        />
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t.payments.noPayments}
          action={
            <Link href="/payments/upload">
              <Button variant="outline">{t.payments.uploadProofBtn}</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="relative overflow-hidden bg-card rounded-xl border border-border p-5"
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[3px]"
                style={{ backgroundColor: payment.ekskul.color }}
              />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {t.months[payment.month]} {payment.year}
                    </p>
                    <EkskulBadge
                      name={payment.ekskul.name}
                      color={payment.ekskul.color}
                      icon={payment.ekskul.icon}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
                    Rp {payment.amount.toLocaleString("id-ID")}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{payment.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={paymentStatusVariant(payment.status)}
                  >
                    {t.paymentStatus[payment.status]}
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
                  {payment.status === "REJECTED" && (
                    <Link href="/payments/upload">
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        {t.payments.uploadBtn}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

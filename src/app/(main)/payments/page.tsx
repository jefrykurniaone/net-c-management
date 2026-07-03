import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { ActivityFilter } from "@/components/activity/activity-filter";
import { UnpaidBanner } from "@/components/payments/unpaid-banner";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { CreditCard, Upload, ExternalLink, MessageCircle } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getUserActivityIds } from "@/lib/activity";
import { paymentStatusVariant } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ activityId?: string }> }>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);

  const myActivityIds = await getUserActivityIds(session.user.id);
  const sp = await searchParams;
  const selected =
    sp.activityId && myActivityIds.includes(sp.activityId) ? sp.activityId : undefined;

  const [payments, myActivities] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId: session.user.id,
        ...(selected ? { activityId: selected } : {}),
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
            adminWhatsapp: true,
          },
        },
      },
    }),
    prisma.activity.findMany({
      where: { id: { in: myActivityIds }, isActive: true },
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
          {myActivities.length > 1 && (
            <ActivityFilter
              activities={myActivities}
              selected={selected}
              allLabel={t.activity.filterAll}
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
                style={{ backgroundColor: payment.activity.color }}
              />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {t.months[payment.month]} {payment.year}
                    </p>
                    <ActivityBadge
                      name={payment.activity.name}
                      color={payment.activity.color}
                      icon={payment.activity.icon}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 tabular-nums">
                    Rp {payment.amount.toLocaleString("id-ID")}
                  </p>
                  {payment.notes && payment.status === "REJECTED" ? (
                    <p className="text-xs text-destructive mt-1">
                      {t.payments.rejectReason}: {payment.notes}
                    </p>
                  ) : (
                    payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {payment.notes}
                      </p>
                    )
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

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreditCard, Upload, ExternalLink } from "lucide-react";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { paymentStatusVariant } from "@/lib/utils";

export default async function PaymentsPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const hasCurrentMonth = payments.some(
    (p) => p.month === currentMonth && p.year === currentYear
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-green-600" />
            {t.payments.title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t.payments.subtitle}</p>
        </div>
        <Link href="/payments/upload">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Upload className="w-4 h-4" />
            {t.payments.uploadBtn}
          </Button>
        </Link>
      </div>

      {/* Current month status banner */}
      {!hasCurrentMonth && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-yellow-800 text-sm">
              {t.months[currentMonth]} {currentYear} {t.payments.unpaidBannerTitle}
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {t.payments.unpaidBannerSub}
            </p>
          </div>
          <Link href="/payments/upload">
            <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white shrink-0">
              {t.payments.payNow}
            </Button>
          </Link>
        </div>
      )}

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t.payments.noPayments}</p>
          <Link href="/payments/upload">
            <Button variant="outline" className="mt-4">
              {t.payments.uploadProofBtn}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t.months[payment.month]} {payment.year}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Rp {payment.amount.toLocaleString("id-ID")}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{payment.notes}</p>
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
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
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

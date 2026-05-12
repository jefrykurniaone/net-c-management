"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface Payment {
  id: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  proofUrl: string | null;
  notes: string | null;
}

export function PaymentActions({ payment }: Readonly<{ payment: Payment }>) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getDictionary(locale);
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "CONFIRMED" | "REJECTED") {
    if (!confirm(action === "CONFIRMED" ? t.admin.confirmConfirm : t.admin.confirmReject)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error(t.admin.paymentUpdateFailed);
      toast.success(action === "CONFIRMED" ? t.admin.paymentConfirmed : t.admin.paymentRejected);
      router.refresh();
    } catch (err) {
      console.error('[PaymentActions] handleAction:', err);
      toast.error(t.admin.paymentUpdateFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {payment.proofUrl && (
        <a
          href={payment.proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {t.admin.proof}
        </a>
      )}
      {payment.status === "PENDING" && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-green-200 text-green-600 hover:bg-green-50"
            onClick={() => handleAction("CONFIRMED")}
            disabled={loading}
          >
            {t.admin.confirmBtn}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-red-200 text-red-500 hover:bg-red-50"
            onClick={() => handleAction("REJECTED")}
            disabled={loading}
          >
            {t.admin.rejectBtn}
          </Button>
        </>
      )}
    </div>
  );
}

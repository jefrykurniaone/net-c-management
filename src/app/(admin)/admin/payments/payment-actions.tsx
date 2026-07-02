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
    let notes: string | undefined;
    if (action === "REJECTED") {
      // Rejection requires a reason (UX-DR12); the server enforces it too.
      const reason = window.prompt(t.payments.rejectReasonPrompt);
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error(t.validation.rejectReasonRequired);
        return;
      }
      notes = reason.trim();
    } else if (!confirm(t.admin.confirmConfirm)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, notes }),
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
          className="text-xs text-primary hover:underline flex items-center gap-1"
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
            className="h-7 text-xs text-success hover:bg-success/10"
            onClick={() => handleAction("CONFIRMED")}
            loading={loading}
          >
            {t.admin.confirmBtn}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => handleAction("REJECTED")}
            loading={loading}
          >
            {t.admin.rejectBtn}
          </Button>
        </>
      )}
    </div>
  );
}

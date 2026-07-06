"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { ExternalLink, XCircle, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface Payment {
  id: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  proofUrl: string | null;
  notes: string | null;
}

type PendingAction = "CONFIRMED" | "REJECTED" | null;

export function PaymentActions({ payment }: Readonly<{ payment: Payment }>) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getDictionary(locale);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function applyAction(action: "CONFIRMED" | "REJECTED", notes?: string) {
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, notes }),
    });
    if (!res.ok) {
      toast.error(t.admin.paymentUpdateFailed);
      return;
    }
    toast.success(
      action === "CONFIRMED" ? t.admin.paymentConfirmed : t.admin.paymentRejected,
    );
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {payment.proofUrl && (
        <a
          href={payment.proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          {t.admin.proof}
        </a>
      )}
      {payment.status === "PENDING" && (
        <>
          <Button
            size="sm"
            onClick={() => setPendingAction("CONFIRMED")}
          >
            {t.admin.confirmBtn}
          </Button>
          <Button
            variant="destructive-outline"
            size="sm"
            onClick={() => setPendingAction("REJECTED")}
          >
            {t.admin.rejectBtn}
          </Button>
          <ConfirmDialog
            open={pendingAction === "CONFIRMED"}
            onOpenChange={(open) => !open && setPendingAction(null)}
            tone="primary"
            icon={CheckCircle2}
            title={t.admin.confirmBtn}
            description={t.admin.confirmConfirm}
            confirmLabel={t.admin.confirmBtn}
            cancelLabel={t.common.cancel}
            onConfirm={() => applyAction("CONFIRMED")}
          />
          <ConfirmDialog
            open={pendingAction === "REJECTED"}
            onOpenChange={(open) => !open && setPendingAction(null)}
            icon={XCircle}
            title={t.admin.rejectBtn}
            description={t.payments.rejectReasonPrompt}
            confirmLabel={t.admin.rejectBtn}
            cancelLabel={t.common.cancel}
            reasonLabel={t.payments.rejectReason}
            onConfirm={(reason) => applyAction("REJECTED", reason)}
          />
        </>
      )}
    </div>
  );
}

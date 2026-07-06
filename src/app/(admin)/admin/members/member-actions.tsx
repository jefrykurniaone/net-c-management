"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { UserX, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface Member {
  id: string;
  name: string | null;
  role: "ADMIN" | "MEMBER" | "OWNER";
  isActive: boolean;
}

type PendingAction = "toggleActive" | "toggleRole" | null;

export function MemberActions({
  member,
  currentUserId,
}: Readonly<{
  member: Member;
  currentUserId: string;
}>) {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getDictionary(locale);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  async function patch(data: { role?: "ADMIN" | "MEMBER"; isActive?: boolean }) {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.admin.memberUpdateFailed);
      }
      toast.success(t.admin.memberUpdated);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  const isSelf = member.id === currentUserId;
  const isOwner = member.role === "OWNER";
  const memberName = member.name ?? "—";

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <Button
        variant={member.isActive ? "destructive-outline" : "outline"}
        size="sm"
        onClick={() =>
          member.isActive
            ? setPendingAction("toggleActive")
            : patch({ isActive: true })
        }
        loading={loading}
        disabled={isSelf || isOwner}
      >
        {member.isActive ? t.admin.deactivateMember : t.admin.activateMember}
      </Button>
      {!isSelf && !isOwner && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPendingAction("toggleRole")}
          loading={loading}
        >
          {member.role === "ADMIN" ? t.admin.makeMember : t.admin.makeAdmin}
        </Button>
      )}
      {/* Deactivation is high-impact: type-to-confirm (Club Premium dialogs). */}
      <ConfirmDialog
        open={pendingAction === "toggleActive"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        icon={UserX}
        title={t.admin.deactivateConfirmTitle.replace("{name}", memberName)}
        description={t.admin.deactivateConfirmDesc}
        confirmLabel={t.admin.deactivateMember}
        cancelLabel={t.common.cancel}
        typeToConfirm={t.admin.typeToConfirmWord}
        typeToConfirmLabel={t.admin.typeToConfirmPrompt.replace(
          "{word}",
          t.admin.typeToConfirmWord,
        )}
        onConfirm={() => patch({ isActive: false })}
      />
      <ConfirmDialog
        open={pendingAction === "toggleRole"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        tone="primary"
        icon={ShieldCheck}
        title={t.admin.roleChangeConfirmTitle.replace("{name}", memberName)}
        description={t.admin.roleChangeConfirmDesc}
        confirmLabel={
          member.role === "ADMIN" ? t.admin.makeMember : t.admin.makeAdmin
        }
        cancelLabel={t.common.cancel}
        onConfirm={() =>
          patch({ role: member.role === "ADMIN" ? "MEMBER" : "ADMIN" })
        }
      />
    </div>
  );
}

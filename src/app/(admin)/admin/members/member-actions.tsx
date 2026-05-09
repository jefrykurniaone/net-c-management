"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocale } from "@/components/providers/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionaries";

interface Member {
  id: string;
  name: string | null;
  role: "ADMIN" | "MEMBER";
  isActive: boolean;
}

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

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={() => patch({ isActive: !member.isActive })}
        disabled={loading || isSelf}
      >
        {member.isActive ? t.admin.deactivateMember : t.admin.activateMember}
      </Button>
      {!isSelf && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            patch({ role: member.role === "ADMIN" ? "MEMBER" : "ADMIN" })
          }
          disabled={loading}
        >
          {member.role === "ADMIN" ? t.admin.makeMember : t.admin.makeAdmin}
        </Button>
      )}
    </div>
  );
}

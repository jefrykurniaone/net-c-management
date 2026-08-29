"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { UpdateSessionFormData } from "@/lib/validations/session";

/**
 * The two writes the Session edit form owns: update its facts, or delete it.
 * Both land on `/api/sessions/[id]`, both share one busy flag, and neither has
 * anything to do with attendance — that is written from the Session's own
 * attendance surface, through the bulk route.
 */
export function useSessionEditActions(sessionId: string, t: Dictionary) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function leaveToList() {
    router.push("/admin/sessions");
    router.refresh();
  }

  async function update(data: UpdateSessionFormData) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.admin.sessionUpdateFailed);
      }
      toast.success(t.admin.sessionUpdated);
      leaveToList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t.admin.sessionDeleteFailed);
      toast.success(t.admin.sessionDeleted);
      leaveToList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return { loading, update, remove };
}

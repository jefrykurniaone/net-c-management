"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { RemindMembersButton } from "@/components/admin/remind-members-button";
import { ShareSessionCard } from "@/components/sessions/share-session-card";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * What sits under the Session edit form: the jobs that are *about* a Session
 * without being one of its own facts. Taking attendance is one of them, and it
 * appears here as a **link only** — the register itself lives at
 * `/admin/sessions/{id}/attendance`, and two places to record attendance is how
 * they come to disagree.
 */

interface EditSideCardsProps {
  sessionId: string;
  sessionTitle: string;
  lastReminderAt: string | null;
  t: Dictionary;
}

const CARD_CLASS = "bg-card rounded-xl border border-border p-5";

/** One link out to where attendance is actually taken. No controls here. */
function AttendanceLinkCard({
  sessionId,
  t,
}: Readonly<{ sessionId: string; t: Dictionary }>) {
  return (
    <div className={CARD_CLASS}>
      <Link
        href={`/admin/sessions/${sessionId}/attendance`}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ClipboardCheck className="w-4 h-4" />
        {t.admin.toAttendance}
      </Link>
    </div>
  );
}

function RemindCard({
  sessionId,
  lastReminderAt,
  t,
}: Readonly<{
  sessionId: string;
  lastReminderAt: string | null;
  t: Dictionary;
}>) {
  return (
    <div className={CARD_CLASS}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t.admin.remindSectionTitle}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.admin.remindSectionDesc}
        </p>
      </div>
      <RemindMembersButton
        sessionId={sessionId}
        label={t.admin.remindMembers}
        lastReminderAt={lastReminderAt}
      />
    </div>
  );
}

export function EditSideCards({
  sessionId,
  sessionTitle,
  lastReminderAt,
  t,
}: Readonly<EditSideCardsProps>) {
  return (
    <>
      <AttendanceLinkCard sessionId={sessionId} t={t} />
      <RemindCard
        sessionId={sessionId}
        lastReminderAt={lastReminderAt}
        t={t}
      />
      <ShareSessionCard
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        labels={{
          title: t.admin.shareSession,
          description: t.admin.shareSessionDesc,
          copyLink: t.admin.copyLink,
          copied: t.admin.linkCopied,
          shareWhatsapp: t.admin.shareViaWhatsapp,
          shareX: t.admin.shareViaTwitter,
        }}
      />
    </>
  );
}

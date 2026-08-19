import Link from "next/link";
import { format } from "date-fns";
import type { Locale as DateFnsLocale } from "date-fns";
import { ExternalLink } from "lucide-react";
import { StateMark, MarkedValue } from "@/components/ui/mark";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { sessionState } from "@/lib/status-mark";
import type { Dictionary, Locale } from "@/lib/i18n/dictionaries";
import { getDateFnsLocale } from "@/lib/i18n/locale";
import type { ActivitySession } from "@prisma/client";

type SessionRow = ActivitySession & {
  _count: { attendances: number };
  activity: { id: string; name: string; icon: string | null };
};

function SessionCard({
  s,
  t,
  dateLocale,
}: Readonly<{ s: SessionRow; t: Dictionary; dateLocale: DateFnsLocale }>) {
  return (
    <MobileCard>
      <div className="min-w-0 space-y-1">
        <MarkedValue
          state={sessionState(s.status)}
          className="block truncate font-medium text-foreground"
        >
          {s.title}
        </MarkedValue>
        <ActivityBadge name={s.activity.name} icon={s.activity.icon} />
      </div>
      <CardField label={t.admin.colDate}>
        <div>
          {format(new Date(s.date), "d MMM yyyy", { locale: dateLocale })}
          <span className="block text-xs text-muted-foreground">
            {s.startTime} – {s.endTime}
          </span>
        </div>
      </CardField>
      <CardField label={t.admin.colLocation}>
        <span className="block max-w-48 truncate">{s.location}</span>
      </CardField>
      <CardField label={t.admin.colParticipants}>
        <span className="tabular-nums">{s._count.attendances}/{s.maxPlayers}</span>
      </CardField>
      <CardField label={t.admin.colStatus}>
        <StateMark state={sessionState(s.status)} labels={t.marks} />
      </CardField>
      <div className="flex items-center gap-4 pt-1">
        <Link
          href={`/sessions/${s.id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          {t.admin.detail}
        </Link>
        <Link
          href={`/admin/sessions/${s.id}/edit`}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {t.admin.edit}
        </Link>
        <a
          href={`/api/sessions/${s.id}/export`}
          className="text-xs text-primary hover:underline"
          download
        >
          CSV
        </a>
      </div>
    </MobileCard>
  );
}

export function SessionCards({
  sessions,
  t,
  locale,
  emptyLabel,
}: Readonly<{ sessions: SessionRow[]; t: Dictionary; locale: Locale; emptyLabel?: string }>) {
  const dateLocale = getDateFnsLocale(locale);
  if (sessions.length === 0)
    return <CardListEmpty>{emptyLabel ?? t.admin.noSessions}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <SessionCard key={s.id} s={s} t={t} dateLocale={dateLocale} />
      ))}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format, endOfWeek } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActivityDot } from "@/components/activity/activity-badge";
import {
  SessionsFilter,
  type SessionTab,
} from "@/components/activity/sessions-filter";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  ensureRecurringSessions,
  getSessionQuotas,
} from "@/lib/recurring-sessions";
import { sessionStatusVariant } from "@/lib/utils";

const SESSION_INCLUDE = {
  // Seat-holding rows only — ABSENT (a cancelled monthly member) neither
  // occupies a seat nor counts as "registered".
  _count: {
    select: {
      attendances: {
        where: { status: { in: ["REGISTERED", "PRESENT"] } },
      },
    },
  },
  activity: { select: { id: true, name: true, color: true, icon: true } },
} satisfies Prisma.ActivitySessionInclude;

type SessionRow = Prisma.ActivitySessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}> & { attendances: { status: string }[] };

export default async function SessionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ activityId?: string; tab?: string }> }>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);
  const dateLocale = locale === "id" ? localeId : enUS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Lazy idempotent generation of this month's weekly sessions (no cron).
  await ensureRecurringSessions();

  // Every session of every active Activity is visible — joining happens at the
  // session level (registering also joins the Activity), so nothing is hidden
  // behind a prior "join activity" step.
  const allActivities = await prisma.activity.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  const sp = await searchParams;
  const selected = allActivities.some((e) => e.id === sp.activityId)
    ? sp.activityId
    : undefined;
  const tab: SessionTab = sp.tab === "past" ? "past" : "upcoming";
  const isPast = tab === "past";

  const sessions = await prisma.activitySession.findMany({
    where: {
      activityId: selected ?? { in: allActivities.map((e) => e.id) },
      ...(isPast
        ? { date: { lt: today } }
        : { date: { gte: today }, status: { in: ["SCHEDULED", "ONGOING"] } }),
    },
    orderBy: { date: isPast ? "desc" : "asc" },
    include: {
      ...SESSION_INCLUDE,
      attendances: {
        where: {
          userId: session.user.id,
          status: { in: ["REGISTERED", "PRESENT"] },
        },
        select: { status: true },
      },
    },
  });
  const quotas = await getSessionQuotas(sessions);

  // Upcoming is split into "This week" vs "Later"; past stays a flat list.
  const thisWeek = isPast
    ? []
    : sessions.filter((s) => new Date(s.date) <= weekEnd);
  const later = isPast
    ? sessions
    : sessions.filter((s) => new Date(s.date) > weekEnd);

  function renderCard(s: SessionRow) {
    const isRegistered = s.attendances.length > 0;
    const isFull = s._count.attendances >= s.maxPlayers;
    const quota = quotas.get(s.id);
    const hasQuota = quota !== undefined && quota.needed > 0;
    return (
      <Link key={s.id} href={`/sessions/${s.id}`} className="block">
        <div className="flex items-center gap-3 bg-card rounded-xl border border-border p-3.5 pr-4 hover:border-primary/40 hover:shadow-sm transition-all">
          <span className="flex w-11 shrink-0 flex-col items-center rounded-[10px] bg-accent py-1.5">
            <span className="text-[10px] font-semibold uppercase text-primary">
              {format(new Date(s.date), "EEE", { locale: dateLocale })}
            </span>
            <span className="font-heading text-lg font-bold text-foreground leading-tight">
              {format(new Date(s.date), "dd")}
            </span>
          </span>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {s.title}
              </h3>
              <ActivityDot color={s.activity.color} className="size-[7px]" />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {s.startTime} – {s.endTime} · {s.location}
            </p>
            <p className="text-[11px] text-subtle-foreground truncate tabular-nums">
              {s._count.attendances}/{s.maxPlayers} {t.sessions.participants}
              {s.fee > 0 && <> · Rp {s.fee.toLocaleString("id-ID")}{t.sessions.feePerPerson}</>}
            </p>
            {hasQuota && (
              <Badge
                variant={quota.isMet ? "success" : "warning"}
                className="mt-1">
                {quota.isMet
                  ? t.sessions.quotaMet
                  : t.sessions.quotaNeedMore.replace(
                      "{n}",
                      String(quota.needed - quota.committed),
                    )}
                {" "}
                <span className="tabular-nums">
                  ({quota.committed}/{quota.needed})
                </span>
              </Badge>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            {isRegistered ? (
              <Badge>{t.sessions.registered}</Badge>
            ) : isFull ? (
              <Badge variant="secondary">{t.sessions.full}</Badge>
            ) : (
              <Badge variant={sessionStatusVariant(s.status)}>
                {t.sessionStatus[s.status]}
              </Badge>
            )}
          </div>
        </div>
      </Link>
    );
  }

  function renderGroup(label: string, rows: SessionRow[]) {
    if (rows.length === 0) return null;
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <div className="space-y-3">{rows.map(renderCard)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.sessions.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sessions.subtitle}</p>
        </div>
        <SessionsFilter
          activities={allActivities.length > 1 ? allActivities : []}
          selected={selected}
          tab={tab}
          labels={{
            all: t.sessions.chipAll,
            upcoming: t.sessions.tabUpcoming,
            past: t.sessions.tabPast,
          }}
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={isPast ? t.sessions.noPast : t.sessions.noSessions}
        />
      ) : isPast ? (
        <div className="space-y-3">{later.map(renderCard)}</div>
      ) : (
        <div className="space-y-6">
          {renderGroup(t.sessions.groupThisWeek, thisWeek)}
          {renderGroup(t.sessions.groupLater, later)}
        </div>
      )}
    </div>
  );
}

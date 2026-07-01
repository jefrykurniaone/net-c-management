import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EkskulBadge } from "@/components/ekskul/ekskul-badge";
import { EkskulFilter } from "@/components/ekskul/ekskul-filter";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getUserEkskulIds } from "@/lib/ekskul";
import { sessionStatusVariant } from "@/lib/utils";

export default async function SessionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ ekskulId?: string }> }>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);
  const dateLocale = locale === "id" ? localeId : enUS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myEkskulIds = await getUserEkskulIds(session.user.id);
  const sp = await searchParams;
  const selected =
    sp.ekskulId && myEkskulIds.includes(sp.ekskulId) ? sp.ekskulId : undefined;

  const [sessions, myEkskuls] = await Promise.all([
    prisma.activitySession.findMany({
      where: {
        date: { gte: today },
        status: { in: ["SCHEDULED", "ONGOING"] },
        ekskulId: selected ?? { in: myEkskulIds },
      },
      orderBy: { date: "asc" },
      include: {
        _count: { select: { attendances: true } },
        ekskul: { select: { id: true, name: true, color: true, icon: true } },
        attendances: {
          where: { userId: session.user.id },
          select: { status: true },
        },
      },
    }),
    prisma.ekskul.findMany({
      where: { id: { in: myEkskulIds }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            {t.sessions.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t.sessions.subtitle}</p>
        </div>
        {myEkskuls.length > 1 && (
          <EkskulFilter
            ekskuls={myEkskuls}
            selected={selected}
            allLabel={t.ekskul.filterAll}
          />
        )}
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t.sessions.noSessions} />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isRegistered = s.attendances.length > 0;
            const isFull = s._count.attendances >= s.maxPlayers;
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="relative overflow-hidden bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-full w-[3px]"
                    style={{ backgroundColor: s.ekskul.color }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">
                          {s.title}
                        </h3>
                        <EkskulBadge name={s.ekskul.name} color={s.ekskul.color} icon={s.ekskul.icon} />
                        <Badge
                          variant={sessionStatusVariant(s.status)}
                        >
                          {t.sessionStatus[s.status]}
                        </Badge>
                        {isRegistered && (
                          <Badge variant="success">
                            {t.sessions.registered}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          📅 {format(new Date(s.date), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                          &nbsp;·&nbsp;{s.startTime} – {s.endTime}
                        </p>
                        <p>📍 {s.location}</p>
                        {s.fee > 0 && (
                          <p>💰 <span className="tabular-nums">Rp {s.fee.toLocaleString("id-ID")}</span>{t.sessions.feePerPerson}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-foreground tabular-nums">
                        {s._count.attendances}/{s.maxPlayers}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.sessions.participants}</p>
                      {isFull && !isRegistered && (
                        <Badge variant="secondary" className="mt-1 text-xs">{t.sessions.full}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId, enUS } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { sessionStatusVariant } from "@/lib/utils";

export default async function SessionsPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/auth/signin");

  const t = getDictionary(locale);
  const dateLocale = locale === "id" ? localeId : enUS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await prisma.badmintonSession.findMany({
    where: { date: { gte: today }, status: { in: ["SCHEDULED", "ONGOING"] } },
    orderBy: { date: "asc" },
    include: {
      _count: { select: { attendances: true } },
      attendances: {
        where: { userId: session.user.id },
        select: { status: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-green-600" />
          {t.sessions.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{t.sessions.subtitle}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t.sessions.noSessions}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isRegistered = s.attendances.length > 0;
            const isFull = s._count.attendances >= s.maxPlayers;
            return (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-green-200 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {s.title}
                        </h3>
                        <Badge
                          variant={sessionStatusVariant(s.status)}
                        >
                          {t.sessionStatus[s.status]}
                        </Badge>
                        {isRegistered && (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            {t.sessions.registered}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-500">
                        <p>
                          📅 {format(new Date(s.date), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                          &nbsp;·&nbsp;{s.startTime} – {s.endTime}
                        </p>
                        <p>📍 {s.location}</p>
                        {s.fee > 0 && (
                          <p>💰 Rp {s.fee.toLocaleString("id-ID")}{t.sessions.feePerPerson}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {s._count.attendances}/{s.maxPlayers}
                      </p>
                      <p className="text-xs text-gray-400">{t.sessions.participants}</p>
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

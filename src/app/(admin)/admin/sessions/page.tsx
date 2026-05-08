import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, Plus, ExternalLink } from "lucide-react";
import type { BadmintonSession, SessionStatus } from "@prisma/client";

const STATUS_CONFIG = {
  SCHEDULED: { label: "Terjadwal", variant: "secondary" as const },
  ONGOING: { label: "Berlangsung", variant: "default" as const },
  COMPLETED: { label: "Selesai", variant: "outline" as const },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" as const },
};

export default async function AdminSessionsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const sessions = await prisma.badmintonSession.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: { _count: { select: { attendances: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-green-600" />
            Kelola Sesi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Buat dan kelola sesi latihan
          </p>
        </div>
        <Link href="/admin/sessions/new">
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Buat Sesi
          </Button>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Sesi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Lokasi</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Peserta</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: BadmintonSession & { _count: { attendances: number } }) => {
                const statusCfg = STATUS_CONFIG[s.status as SessionStatus];
                return (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                      {s.title}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(s.date), "d MMM yyyy", { locale: localeId })}
                      <span className="text-xs text-gray-400 block">
                        {s.startTime} – {s.endTime}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">
                      {s.location}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {s._count.attendances}/{s.maxPlayers}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sessions/${s.id}`}
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Lihat
                        </Link>
                        <Link
                          href={`/admin/sessions/${s.id}/edit`}
                          className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                        >
                          Edit
                        </Link>
                        <a
                          href={`/api/sessions/${s.id}/export`}
                          className="text-xs text-green-600 hover:underline"
                          download
                        >
                          CSV
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Belum ada sesi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

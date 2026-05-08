import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { RSVPButton } from "@/components/sessions/rsvp-button";
import { ArrowLeft, MapPin, Clock, Users, Banknote, FileText } from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG = {
  SCHEDULED: { label: "Terjadwal", variant: "secondary" as const },
  ONGOING: { label: "Berlangsung", variant: "default" as const },
  COMPLETED: { label: "Selesai", variant: "outline" as const },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" as const },
};

const ATTENDANCE_LABELS = {
  REGISTERED: "Terdaftar",
  PRESENT: "Hadir",
  ABSENT: "Absen",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const badmintonSession = await prisma.badmintonSession.findUnique({
    where: { id },
    include: {
      attendances: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              playerLevel: true,
              playPosition: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { attendances: true } },
    },
  });

  if (!badmintonSession) notFound();

  const myAttendance = badmintonSession.attendances.find(
    (a) => a.userId === authSession.user.id
  );
  const isRegistered = !!myAttendance;
  const isFull = badmintonSession._count.attendances >= badmintonSession.maxPlayers;
  const statusCfg = STATUS_CONFIG[badmintonSession.status];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke daftar sesi
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {badmintonSession.title}
          </h1>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-gray-400" />
            <span>
              {format(new Date(badmintonSession.date), "EEEE, d MMMM yyyy", {
                locale: localeId,
              })}{" "}
              · {badmintonSession.startTime} – {badmintonSession.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
            <span>{badmintonSession.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0 text-gray-400" />
            <span>
              {badmintonSession._count.attendances}/{badmintonSession.maxPlayers} peserta
            </span>
            {isFull && (
              <Badge variant="secondary" className="text-xs ml-1">
                Penuh
              </Badge>
            )}
          </div>
          {badmintonSession.fee > 0 && (
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 shrink-0 text-gray-400" />
              <span>Rp {badmintonSession.fee.toLocaleString("id-ID")}/orang</span>
            </div>
          )}
          {badmintonSession.notes && (
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
              <span className="whitespace-pre-wrap">{badmintonSession.notes}</span>
            </div>
          )}
        </div>

        <RSVPButton
          sessionId={badmintonSession.id}
          isRegistered={isRegistered}
          isFull={isFull && !isRegistered}
          isCancelled={badmintonSession.status === "CANCELLED"}
          isCompleted={badmintonSession.status === "COMPLETED"}
        />
      </div>

      {/* Participants list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Daftar Peserta ({badmintonSession._count.attendances})
        </h2>
        {badmintonSession.attendances.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Belum ada peserta yang mendaftar.
          </p>
        ) : (
          <div className="space-y-3">
            {badmintonSession.attendances.map((attendance, i) => {
              const initials = attendance.user.name
                ?.split(" ")
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase() ?? "?";
              return (
                <div key={attendance.id}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">
                      {i + 1}
                    </span>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={attendance.user.image ?? ""} alt="" />
                      <AvatarFallback className="text-xs bg-green-100 text-green-700">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {attendance.user.name ?? "—"}
                        {attendance.userId === authSession.user.id && (
                          <span className="text-xs text-green-600 ml-1">(Kamu)</span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        attendance.status === "PRESENT"
                          ? "default"
                          : attendance.status === "ABSENT"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {ATTENDANCE_LABELS[attendance.status]}
                    </Badge>
                  </div>
                  {i < badmintonSession.attendances.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

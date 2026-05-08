import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STATUS_LABELS = {
  REGISTERED: "Terdaftar",
  PRESENT: "Hadir",
  ABSENT: "Absen",
};

const ATTENDANCE_BADGE_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  PRESENT: "default",
  ABSENT: "destructive",
  REGISTERED: "secondary",
};

const PAYMENT_BADGE_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  CONFIRMED: "default",
  REJECTED: "destructive",
  PENDING: "secondary",
};
const PAYMENT_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Dikonfirmasi",
  REJECTED: "Ditolak",
};
const MONTH_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function MemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      attendances: {
        include: { session: true },
        orderBy: { session: { date: "desc" } },
        take: 20,
      },
      payments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 24,
      },
    },
  });

  if (!member) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke daftar anggota
      </Link>

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.image}
              alt={member.name ?? ""}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
              {(member.name ?? member.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {member.name ?? "(Belum diisi)"}
            </h1>
            <p className="text-sm text-gray-500">{member.email}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                {member.role}
              </Badge>
              {!member.isActive && (
                <Badge variant="outline" className="text-red-500 border-red-200">
                  Non-aktif
                </Badge>
              )}
            </div>
          </div>
        </div>
        {member.phone && (
          <p className="mt-4 text-sm text-gray-500">
            Telepon: <span className="text-gray-700">{member.phone}</span>
          </p>
        )}
        <p className="text-sm text-gray-400 mt-1">
          Bergabung {format(new Date(member.createdAt), "d MMMM yyyy", { locale: localeId })}
        </p>
      </div>

      {/* Attendances */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">
          Riwayat Kehadiran ({member.attendances.length})
        </h2>
        {member.attendances.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada data kehadiran.</p>
        ) : (
          <div className="space-y-2">
            {member.attendances.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {a.session.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(a.session.date), "d MMM yyyy", { locale: localeId })}
                  </p>
                </div>
                <Badge variant={ATTENDANCE_BADGE_VARIANTS[a.status] ?? "secondary"}>
                  {STATUS_LABELS[a.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">
          Riwayat Iuran ({member.payments.length})
        </h2>
        {member.payments.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada data iuran.</p>
        ) : (
          <div className="space-y-2">
            {member.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {MONTH_NAMES[p.month]} {p.year}
                  </p>
                  <p className="text-xs text-gray-400">
                    Rp {p.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge variant={PAYMENT_BADGE_VARIANTS[p.status] ?? "secondary"}>
                  {PAYMENT_STATUS_LABELS[p.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ActivityBadge } from "@/components/activity/activity-badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminRole, roleBadgeVariant, paymentStatusVariant } from "@/lib/utils";
import { currentPeriod, resolvePaymentMode } from "@/lib/payment-mode";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { PaymentMode } from "@prisma/client";

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
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");
  const t = getDictionary(locale);

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { isActive: true, activity: { isActive: true } },
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              color: true,
              allowsMonthly: true,
              allowsPerSession: true,
            },
          },
        },
      },
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

  const { month, year } = currentPeriod(new Date());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke daftar anggota
      </Link>

      {/* Profile */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.image}
              alt={member.name ?? ""}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {(member.name ?? member.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {member.name ?? "(Belum diisi)"}
            </h1>
            <p className="text-sm text-muted-foreground">{member.email}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant={roleBadgeVariant(member.role)}>
                {member.role}
              </Badge>
              {!member.isActive && (
                <Badge variant="destructive">
                  Non-aktif
                </Badge>
              )}
            </div>
            {member.memberships.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {member.memberships.map((m) => {
                  const mode = resolvePaymentMode(
                    m,
                    {
                      allowsMonthly: m.activity.allowsMonthly,
                      allowsPerSession: m.activity.allowsPerSession,
                    },
                    month,
                    year,
                  );
                  return (
                    <span key={m.activity.id} className="inline-flex items-center gap-1">
                      <ActivityBadge name={m.activity.name} color={m.activity.color} />
                      <span className="text-xs text-muted-foreground">
                        ·{" "}
                        {mode === PaymentMode.MONTHLY
                          ? t.paymentMode.monthly
                          : mode === PaymentMode.PER_SESSION
                            ? t.paymentMode.perSession
                            : "—"}
                      </span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {member.phone && (
          <p className="mt-4 text-sm text-muted-foreground">
            Telepon: <span className="text-foreground">{member.phone}</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          Bergabung {format(new Date(member.createdAt), "d MMMM yyyy", { locale: localeId })}
        </p>
      </div>

      {/* Attendances */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-bold text-foreground mb-4">
          Riwayat Kehadiran ({member.attendances.length})
        </h2>
        {member.attendances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data kehadiran.</p>
        ) : (
          <div className="space-y-2">
            {member.attendances.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {a.session.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-bold text-foreground mb-4">
          Riwayat Iuran ({member.payments.length})
        </h2>
        {member.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data iuran.</p>
        ) : (
          <div className="space-y-2">
            {member.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {MONTH_NAMES[p.month]} {p.year}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Rp {p.amount.toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge variant={paymentStatusVariant(p.status)}>
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

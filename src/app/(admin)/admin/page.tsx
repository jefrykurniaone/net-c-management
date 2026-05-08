import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, CreditCard, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [
    totalMembers,
    activeMembers,
    upcomingSessions,
    pendingPayments,
    confirmedPaymentsThisMonth,
    totalSessionsThisYear,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true, isProfileComplete: true } }),
    prisma.badmintonSession.count({
      where: { date: { gte: now }, status: { in: ["SCHEDULED", "ONGOING"] } },
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({
      where: { status: "CONFIRMED", month: currentMonth, year: currentYear },
    }),
    prisma.badmintonSession.count({
      where: {
        date: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  const stats = [
    {
      label: "Total Anggota",
      value: totalMembers,
      sub: `${activeMembers} aktif`,
      icon: Users,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Sesi Mendatang",
      value: upcomingSessions,
      sub: `${totalSessionsThisYear} sesi tahun ini`,
      icon: CalendarDays,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Iuran Pending",
      value: pendingPayments,
      sub: "Menunggu konfirmasi",
      icon: CreditCard,
      color: "text-yellow-600 bg-yellow-50",
    },
    {
      label: "Iuran Terkonfirmasi",
      value: confirmedPaymentsThisMonth,
      sub: `Bulan ${currentMonth}/${currentYear}`,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan aktivitas komunitas PB Net-C
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {label}
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

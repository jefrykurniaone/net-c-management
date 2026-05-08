import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";
import { PaymentActions } from "./payment-actions";
import type { Payment, PaymentStatus } from "@prisma/client";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", variant: "secondary" as const },
  CONFIRMED: { label: "Dikonfirmasi", variant: "default" as const },
  REJECTED: { label: "Ditolak", variant: "destructive" as const },
};

const MONTH_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function AdminPaymentsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ month?: string; year?: string; status?: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const filterMonth = sp.month ? Number.parseInt(sp.month) : undefined;
  const filterYear = sp.year ? Number.parseInt(sp.year) : undefined;
  const filterStatus = sp.status as "PENDING" | "CONFIRMED" | "REJECTED" | undefined;

  const now = new Date();
  const currentMonth = filterMonth ?? now.getMonth() + 1;
  const currentYear = filterYear ?? now.getFullYear();

  const payments = await prisma.payment.findMany({
    where: {
      ...(filterMonth ? { month: filterMonth } : {}),
      ...(filterYear ? { year: filterYear } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-green-600" />
            Kelola Iuran
          </h1>
          <p className="text-sm text-gray-500 mt-1">Konfirmasi atau tolak bukti pembayaran</p>
        </div>
        <a
          href={`/api/payments/export?month=${currentMonth}&year=${currentYear}`}
          download
          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline border border-green-200 rounded-lg px-3 py-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="GET">
        <select
          name="month"
          defaultValue={String(filterMonth ?? "")}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
        >
          <option value="">Semua Bulan</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {MONTH_NAMES[m]}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={String(filterYear ?? "")}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
        >
          <option value="">Semua Tahun</option>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filterStatus ?? ""}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Dikonfirmasi</option>
          <option value="REJECTED">Ditolak</option>
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Anggota</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Periode</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Jumlah</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tanggal</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: Payment & { user: { name: string | null; email: string | null } }) => {
                const statusCfg = STATUS_CONFIG[p.status as PaymentStatus];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {p.user.name ?? p.user.email}
                      </p>
                      <p className="text-xs text-gray-400">{p.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {MONTH_NAMES[p.month]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium whitespace-nowrap">
                      Rp {p.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(p.createdAt), "d MMM yyyy", { locale: localeId })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaymentActions payment={p} />
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada data iuran.
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

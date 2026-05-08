import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import Link from "next/link";
import { MemberActions } from "./member-actions";

const ROLE_LABELS = { ADMIN: "Admin", MEMBER: "Anggota" };
const LEVEL_LABELS = {
  BEGINNER: "Pemula",
  INTERMEDIATE: "Menengah",
  ADVANCED: "Mahir",
};
const POSITION_LABELS = {
  SINGLE: "Tunggal",
  DOUBLE: "Ganda",
  BOTH: "Keduanya",
};

export default async function AdminMembersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ search?: string }>;
}>) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const search = sp.search ?? "";

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      isProfileComplete: true,
      playPosition: true,
      playerLevel: true,
      phone: true,
      createdAt: true,
      _count: { select: { attendances: true, payments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-green-600" />
            Kelola Anggota
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} anggota terdaftar
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder="Cari nama atau email..."
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full max-w-sm"
        />
        <button
          type="submit"
          className="border rounded-lg px-4 py-1.5 text-sm bg-white dark:bg-gray-900 hover:bg-gray-50"
        >
          Cari
        </button>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Anggota</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Sesi</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Iuran</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.image}
                          alt={u.name ?? ""}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium text-xs">
                          {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/members/${u.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:underline"
                        >
                          {u.name ?? "(Belum diisi)"}
                        </Link>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <p>{u.playerLevel ? LEVEL_LABELS[u.playerLevel] : "-"}</p>
                    <p className="text-xs text-gray-400">
                      {u.playPosition ? POSITION_LABELS[u.playPosition] : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {u._count.attendances}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {u._count.payments}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Badge
                        variant={u.role === "ADMIN" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                      {!u.isActive && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                          Non-aktif
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <MemberActions member={u} currentUserId={session.user.id} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada anggota ditemukan.
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

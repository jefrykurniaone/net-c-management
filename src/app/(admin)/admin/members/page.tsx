import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import Link from "next/link";
import { MemberActions } from "./member-actions";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function AdminMembersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ search?: string }>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/dashboard");

  const t = getDictionary(locale);

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
            {t.admin.membersTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} {t.admin.membersRegistered}
          </p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={t.admin.searchPlaceholder}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 w-full max-w-sm"
        />
        <button
          type="submit"
          className="border rounded-lg px-4 py-1.5 text-sm bg-white dark:bg-gray-900 hover:bg-gray-50"
        >
          {t.admin.searchBtn}
        </button>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t.admin.colName}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t.admin.colLevel}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t.admin.colAttendance}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t.admin.colPayments}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t.admin.colMemberStatus}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">{t.admin.colActions}</th>
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
                          alt={u.name ?? t.admin.colName}
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
                          {u.name ?? `(${t.admin.profileIncomplete})`}
                        </Link>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <p>{u.playerLevel ? t.levels[u.playerLevel] : "-"}</p>
                    <p className="text-xs text-gray-400">
                      {u.playPosition ? t.positions[u.playPosition] : ""}
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
                        {t.roles[u.role]}
                      </Badge>
                      {!u.isActive && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                          {t.admin.inactive2}
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
                    {t.admin.noMembers}
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

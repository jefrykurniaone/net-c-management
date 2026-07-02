import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EkskulBadge } from "@/components/ekskul/ekskul-badge";
import { Users } from "lucide-react";
import Link from "next/link";
import { MemberActions } from "./member-actions";
import { MemberCards } from "./member-cards";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getEkskuls } from "@/lib/ekskul";
import { isAdminRole, roleBadgeVariant } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function AdminMembersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ search?: string; ekskulId?: string }>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const t = getDictionary(locale);

  const sp = await searchParams;
  const search = sp.search ?? "";
  const ekskulId = sp.ekskulId ?? "";

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(ekskulId
      ? { memberships: { some: { ekskulId, isActive: true } } }
      : {}),
  };

  const [users, ekskuls] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        isProfileComplete: true,
        phone: true,
        createdAt: true,
        memberships: {
          where: { isActive: true, ekskul: { isActive: true } },
          select: { ekskul: { select: { id: true, name: true, color: true } } },
        },
        _count: { select: { attendances: true, payments: true } },
      },
    }),
    getEkskuls(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {t.admin.membersTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {t.admin.membersRegistered}
          </p>
        </div>
      </div>

      {/* Search + ekskul filter */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={t.admin.searchPlaceholder}
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full max-w-sm"
        />
        <select
          name="ekskulId"
          defaultValue={ekskulId}
          className="border rounded-lg px-3 py-1.5 text-sm bg-background w-full sm:w-auto"
        >
          <option value="">{t.ekskul.filterAll}</option>
          {ekskuls.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="border rounded-lg px-4 py-1.5 text-sm bg-background hover:bg-muted w-full sm:w-auto"
        >
          {t.admin.searchBtn}
        </button>
      </form>

      {/* Mobile: stacked cards (< md) */}
      <div className="md:hidden">
        <MemberCards users={users} t={t} currentUserId={session.user.id} />
      </div>

      {/* Desktop: full table (>= md) */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.admin.colName}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t.ekskul.label}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colAttendance}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colPayments}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colMemberStatus}</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border hover:bg-muted"
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
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                          {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/members/${u.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {u.name ?? `(${t.admin.profileIncomplete})`}
                        </Link>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.memberships.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.memberships.map((m) => (
                          <EkskulBadge
                            key={m.ekskul.id}
                            name={m.ekskul.name}
                            color={m.ekskul.color}
                          />
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                    {u._count.attendances}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                    {u._count.payments}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Badge variant={roleBadgeVariant(u.role)} className="text-xs">
                        {t.roles[u.role]}
                      </Badge>
                      {!u.isActive && (
                        <Badge variant="destructive" className="text-xs">
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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

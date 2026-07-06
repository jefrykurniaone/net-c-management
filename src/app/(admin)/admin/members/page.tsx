import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ActivityBadge } from "@/components/activity/activity-badge";
import Link from "next/link";
import { MemberActions } from "./member-actions";
import { MemberCards } from "./member-cards";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getActivities } from "@/lib/activity";
import { isAdminRole, roleBadgeVariant } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function AdminMembersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ search?: string; activityId?: string }>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const t = getDictionary(locale);

  const sp = await searchParams;
  const search = sp.search ?? "";
  const activityId = sp.activityId ?? "";

  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(activityId
      ? { memberships: { some: { activityId, isActive: true } } }
      : {}),
  };

  const [users, activities] = await Promise.all([
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
          where: { isActive: true, activity: { isActive: true } },
          select: { activity: { select: { id: true, name: true, color: true } } },
        },
        _count: { select: { attendances: true, payments: true } },
      },
    }),
    getActivities(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t.admin.membersTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {t.admin.membersRegistered}
          </p>
        </div>
      </div>

      {/* Search + activity filter */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={t.admin.searchPlaceholder}
          className="h-9 border border-input rounded-lg px-3 text-sm bg-card w-full max-w-sm placeholder:text-subtle-foreground"
        />
        <select
          name="activityId"
          defaultValue={activityId}
          className="h-9 border border-input rounded-lg px-3 text-sm font-medium text-secondary-foreground bg-card w-full sm:w-auto"
        >
          <option value="">{t.activity.filterAll}</option>
          {activities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 border border-input rounded-lg px-4 text-sm font-semibold text-secondary-foreground bg-card hover:bg-muted w-full sm:w-auto transition-colors"
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
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colName}</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.activity.label}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colAttendance}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colPayments}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colMemberStatus}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.image}
                          alt={u.name ?? t.admin.colName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-heading font-semibold text-xs">
                          {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/members/${u.id}`}
                          className="font-semibold text-foreground hover:underline"
                        >
                          {u.name ?? `(${t.admin.profileIncomplete})`}
                        </Link>
                        <p className="text-xs text-subtle-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.memberships.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.memberships.map((m) => (
                          <ActivityBadge
                            key={m.activity.id}
                            name={m.activity.name}
                            color={m.activity.color}
                          />
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground tabular-nums">
                    {u._count.attendances}
                  </td>
                  <td className="px-5 py-3 text-center text-muted-foreground tabular-nums">
                    {u._count.payments}
                  </td>
                  <td className="px-5 py-3 text-center">
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
                  <td className="px-5 py-3 text-center">
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

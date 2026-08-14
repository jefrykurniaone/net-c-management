import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import { ActivityBadge } from "@/components/activity/activity-badge";
import Link from "next/link";
import { MemberActions } from "./member-actions";
import { MemberCards } from "./member-cards";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getActivities } from "@/lib/activity";
import { isAdminRole, roleBadgeVariant } from "@/lib/utils";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { parsePagination, parseSort, parseSearch } from "@/lib/table-params";
import { SortableTh } from "@/components/ui/sortable-th";
import type { Prisma } from "@prisma/client";

const VALID_SORT_COLS = ["name", "role", "createdAt", "isActive"] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

function buildOrderBy(sortBy: string, dir: "asc" | "desc"): Prisma.UserOrderByWithRelationInput {
  const col: SortCol = (VALID_SORT_COLS as readonly string[]).includes(sortBy)
    ? (sortBy as SortCol)
    : "createdAt";
  return { [col]: dir };
}

export default async function AdminMembersPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id || !isAdminRole(session.user.role)) redirect("/dashboard");

  const t = getDictionary(locale);

  const sp = await searchParams;
  const search = parseSearch(sp);
  const activityId = (Array.isArray(sp.activityId) ? sp.activityId[0] : sp.activityId) ?? "";
  const { sortBy, sortDir } = parseSort(sp, "createdAt", "desc");
  const { page, pageSize, skip, take } = parsePagination(sp);

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

  const userSelect = {
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
  } as const;

  const [users, total, activities] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortDir),
      skip,
      take,
      select: userSelect,
    }),
    prisma.user.count({ where }),
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
            {total} {t.admin.membersRegistered}
          </p>
        </div>
      </div>

      {/* Search + activity filter */}
      <form className="flex flex-wrap gap-2" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={t.table.search.memberPlaceholder}
          data-testid="search-input"
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
        {/* Preserve sort and page size across search */}
        {sortBy !== "createdAt" && <input type="hidden" name="sortBy" value={sortBy} />}
        {sortDir !== "desc" && <input type="hidden" name="sortDir" value={sortDir} />}
        {pageSize !== 10 && <input type="hidden" name="pageSize" value={String(pageSize)} />}
        <button
          type="submit"
          className="h-9 border border-input rounded-lg px-4 text-sm font-semibold text-secondary-foreground bg-card hover:bg-muted w-full sm:w-auto transition-colors"
        >
          {t.admin.searchBtn}
        </button>
      </form>

      {/* Mobile: stacked cards */}
      <div className="md:hidden">
        <MemberCards users={users} t={t} currentUserId={session.user.id} />
        <DataTablePagination
          total={total}
          page={page}
          pageSize={pageSize}
          searchParams={sp}
          labels={t.table.pagination}
        />
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <SortableTh column="name" label={t.admin.colName} searchParams={sp} />
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.activity.label}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colAttendance}</th>
                <th className="text-center px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.admin.colPayments}</th>
                <SortableTh column="role" label={t.admin.colMemberStatus} searchParams={sp} align="center" />
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
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-xs">
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
                        <Mark kind="erased">{t.admin.inactive2}</Mark>
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
        <div className="px-4 border-t border-border">
          <DataTablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            searchParams={sp}
            labels={t.table.pagination}
          />
        </div>
      </div>
    </div>
  );
}

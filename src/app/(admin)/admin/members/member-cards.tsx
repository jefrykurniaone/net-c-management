import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Mark } from "@/components/ui/mark";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { MemberActions } from "./member-actions";
import { roleBadgeVariant } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Prisma } from "@prisma/client";

type MemberRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    image: true;
    role: true;
    isActive: true;
    memberships: {
      select: { activity: { select: { id: true; name: true } } };
    };
    _count: { select: { attendances: true; payments: true } };
  };
}>;

function MemberCard({
  u,
  t,
  currentUserId,
}: Readonly<{ u: MemberRow; t: Dictionary; currentUserId: string }>) {
  return (
    <MobileCard>
      <div className="flex items-center gap-3">
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt={u.name ?? t.admin.colName} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
            {(u.name ?? u.email ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <Link
            href={`/admin/members/${u.id}`}
            className="block truncate font-medium text-foreground hover:underline"
          >
            {u.name ?? `(${t.admin.profileIncomplete})`}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
      </div>

      <CardField label={t.activity.label}>
        <div className="flex flex-wrap justify-end gap-1">
          {u.memberships.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            u.memberships.map((m) => (
              <ActivityBadge key={m.activity.id} name={m.activity.name} />
            ))
          )}
        </div>
      </CardField>

      <CardField label={t.admin.colAttendance}>
        <span className="tabular-nums">{u._count.attendances}</span>
      </CardField>
      <CardField label={t.admin.colPayments}>
        <span className="tabular-nums">{u._count.payments}</span>
      </CardField>

      <CardField label={t.admin.colMemberStatus}>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Badge variant={roleBadgeVariant(u.role)} className="text-xs">
            {t.roles[u.role]}
          </Badge>
          {!u.isActive && (
            <Mark kind="erased">{t.admin.inactive2}</Mark>
          )}
        </div>
      </CardField>

      <MemberActions member={u} currentUserId={currentUserId} />
    </MobileCard>
  );
}

export function MemberCards({
  users,
  t,
  currentUserId,
}: Readonly<{ users: MemberRow[]; t: Dictionary; currentUserId: string }>) {
  if (users.length === 0) return <CardListEmpty>{t.admin.noMembers}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {users.map((u) => (
        <MemberCard key={u.id} u={u} t={t} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

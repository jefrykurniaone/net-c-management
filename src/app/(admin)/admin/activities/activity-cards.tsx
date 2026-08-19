import { Mark } from "@/components/ui/mark";
import { ActivityBadge } from "@/components/activity/activity-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { ActivityActions } from "./activity-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Activity } from "@prisma/client";

type ActivityCardRow = Activity & {
  _count: { memberships: number; sessions: number };
};

function ActivityCard({ e, t }: Readonly<{ e: ActivityCardRow; t: Dictionary }>) {
  return (
    <MobileCard>
      <div className="space-y-1">
        <ActivityBadge name={e.name} />
        {e.description && <p className="truncate text-xs text-muted-foreground">{e.description}</p>}
      </div>
      <CardField label={t.admin.activitySlug}>
        <span className="text-xs">{e.slug}</span>
      </CardField>
      <CardField label={t.admin.colMembers}>
        <span className="tabular-nums">{e._count.memberships}</span>
      </CardField>
      <CardField label={t.admin.activityFee}>
        <span className="tabular-nums">Rp {e.monthlyFee.toLocaleString("id-ID")}</span>
      </CardField>
      <CardField label={t.admin.colStatus}>
        {/* An Activity still running is written in ink; one taken off the
            board is erased. Not a stored status, so there is nothing for the
            resolver to own — but it is a state of a thing, so it is a mark. */}
        <Mark kind={e.isActive ? "ink" : "erased"}>
          {e.isActive ? t.admin.active : t.admin.inactive2}
        </Mark>
      </CardField>
      <ActivityActions
        activity={{
          id: e.id,
          name: e.name,
          slug: e.slug,
          description: e.description,
          monthlyFee: e.monthlyFee,
          sessionFee: e.sessionFee,
          allowsMonthly: e.allowsMonthly,
          allowsPerSession: e.allowsPerSession,
          minMembers: e.minMembers,
          recurringDay: e.recurringDay,
          recurringStartTime: e.recurringStartTime,
          recurringEndTime: e.recurringEndTime,
          defaultLocation: e.defaultLocation,
          maxPlayers: e.maxPlayers,
          adminWhatsapp: e.adminWhatsapp,
          bankName: e.bankName,
          bankAccountNumber: e.bankAccountNumber,
          bankAccountHolder: e.bankAccountHolder,
          isActive: e.isActive,
        }}
      />
    </MobileCard>
  );
}

export function ActivityCards({
  activities,
  t,
}: Readonly<{ activities: ActivityCardRow[]; t: Dictionary }>) {
  if (activities.length === 0) return <CardListEmpty>{t.admin.noActivity}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {activities.map((e) => (
        <ActivityCard key={e.id} e={e} t={t} />
      ))}
    </div>
  );
}

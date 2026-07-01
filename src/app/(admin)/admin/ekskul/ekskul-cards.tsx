import { Badge } from "@/components/ui/badge";
import { EkskulBadge } from "@/components/ekskul/ekskul-badge";
import { MobileCard, CardField, CardListEmpty } from "@/components/admin/mobile-card";
import { EkskulActions } from "./ekskul-actions";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Ekskul } from "@prisma/client";

type EkskulCardRow = Ekskul & {
  _count: { memberships: number; sessions: number };
};

function EkskulCard({ e, t }: Readonly<{ e: EkskulCardRow; t: Dictionary }>) {
  return (
    <MobileCard>
      <div className="space-y-1">
        <EkskulBadge name={e.name} color={e.color} />
        {e.description && <p className="truncate text-xs text-muted-foreground">{e.description}</p>}
      </div>
      <CardField label={t.admin.ekskulSlug}>
        <span className="font-mono text-xs">{e.slug}</span>
      </CardField>
      <CardField label={t.admin.colMembers}>
        <span className="tabular-nums">{e._count.memberships}</span>
      </CardField>
      <CardField label={t.admin.ekskulFee}>
        <span className="tabular-nums">Rp {e.monthlyFee.toLocaleString("id-ID")}</span>
      </CardField>
      <CardField label={t.admin.colStatus}>
        <Badge variant={e.isActive ? "default" : "secondary"}>
          {e.isActive ? t.admin.active : t.admin.inactive2}
        </Badge>
      </CardField>
      <EkskulActions
        ekskul={{
          id: e.id,
          name: e.name,
          slug: e.slug,
          color: e.color,
          description: e.description,
          monthlyFee: e.monthlyFee,
          sessionFee: e.sessionFee,
          allowsMonthly: e.allowsMonthly,
          allowsPerSession: e.allowsPerSession,
          defaultLocation: e.defaultLocation,
          maxPlayers: e.maxPlayers,
          adminWhatsapp: e.adminWhatsapp,
          isActive: e.isActive,
        }}
      />
    </MobileCard>
  );
}

export function EkskulCards({
  ekskuls,
  t,
}: Readonly<{ ekskuls: EkskulCardRow[]; t: Dictionary }>) {
  if (ekskuls.length === 0) return <CardListEmpty>{t.admin.noEkskul}</CardListEmpty>;
  return (
    <div className="space-y-3">
      {ekskuls.map((e) => (
        <EkskulCard key={e.id} e={e} t={t} />
      ))}
    </div>
  );
}

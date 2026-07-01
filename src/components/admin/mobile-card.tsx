import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Mobile table→cards primitives (Story 4.2, UX-DR13) ──────────────────────
// Admin data tables render a stacked-card fallback under `md`. These server-side
// primitives keep the four card lists (members/payments/sessions/ekskul)
// visually consistent: one card shell + one label/value field row + one empty
// state — apply, don't reinvent per table (AD-11).

const ACCENT_BAR_WIDTH = "w-[3px]";

/**
 * Card shell mirroring the desktop table container's chrome. `accentColor`
 * replicates the 3px activity accent bar the payments/sessions table rows carry.
 */
export function MobileCard({
  accentColor,
  children,
}: Readonly<{ accentColor?: string; children: ReactNode }>) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 space-y-3">
      {accentColor && (
        <span
          aria-hidden
          className={cn("absolute left-0 top-0 h-full", ACCENT_BAR_WIDTH)}
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </div>
  );
}

/** One column's field as a label/value row, preserving table column order/parity. */
export function CardField({
  label,
  children,
  className,
}: Readonly<{ label: string; children: ReactNode; className?: string }>) {
  return (
    <div className={cn("flex items-start justify-between gap-3 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-foreground">{children}</div>
    </div>
  );
}

/** Empty-state card matching the desktop table's empty row. */
export function CardListEmpty({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      {children}
    </div>
  );
}

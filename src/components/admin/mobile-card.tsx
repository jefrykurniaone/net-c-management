import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ─── Mobile table→cards primitives (Story 4.2, UX-DR13) ──────────────────────
// Admin data tables render a stacked-card fallback under `md`. These server-side
// primitives keep the four card lists (members/payments/sessions/activity)
// visually consistent: one card shell + one label/value field row + one empty
// state — apply, don't reinvent per table (AD-11).

/**
 * Card shell mirroring the desktop table container's chrome. It carries no
 * Activity livery of its own: the accent bar this used to draw was the banned
 * accent-line device, and the Activity is identified inside the card by the
 * initial-on-a-tile badge instead.
 */
export function MobileCard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
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
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-start justify-between gap-3 text-sm", className)}
    >
      <span aria-hidden className="shrink-0 text-muted-foreground">{label}</span>
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

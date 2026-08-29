import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The Inputs / Fields treatment from DESIGN.md: Enamel Tile ground, one
 * Ruled Line border, the `2px` corner, `10px` padding on every side — a cell
 * you write in, not a floating rounded box. Focus turns the border Court
 * Green with a 2px offset ring; a `readOnly` field takes the Enamel Ground
 * fill on its own, via the `read-only:` variant, so a server-set value reads
 * as not-yours-to-edit without a caller class. `dark:bg-input/30` is gone on
 * purpose: `bg-tile` already carries both board materials through the CSS
 * variable swap, and the dark variant compiles to a higher-specificity
 * selector that would have out-specified it regardless of source order.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-[2px] border border-rule bg-tile px-cell py-cell type-body text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 read-only:bg-board dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

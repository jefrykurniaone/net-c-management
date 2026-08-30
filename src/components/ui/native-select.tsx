import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The Inputs / Fields treatment for a real `<select>` — for a plain `GET`
 * filter form, where the shadcn listbox (`Select`) is the wrong tool because
 * it needs client JS to submit a value. Exported alone so a caller that
 * cannot use `NativeSelect` itself (an already-composed control, a form
 * library's own render prop) can still apply the same tokens.
 */
export const nativeSelectClass =
  "w-full min-w-0 rounded-md border border-input bg-card px-cell py-cell type-body text-foreground outline-none transition-colors duration-150 motion-reduce:transition-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20"

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(nativeSelectClass, className)}
      {...props}
    />
  )
}

export { NativeSelect }

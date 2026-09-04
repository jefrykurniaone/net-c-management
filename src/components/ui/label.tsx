"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * The type tokens the base carries, and what a non-default role puts in their
 * place. A role *replaces* them rather than being appended beside them, because
 * `cn()` cannot resolve two of them against each other: `tailwind-merge` reads
 * the `type-*` classes as unknown, being Tailwind v4 `@utility` definitions
 * rather than core utilities, so both survive the merge and the winner is
 * whichever the stylesheet emits last (#278). `font-medium` is swapped out
 * alongside `type-caption` for the mirror-image reason — it *is* a core
 * utility, so it would outrank the `font-weight` the replacing role carries.
 *
 * The swap is spelled on the class literal in the JSX below, and that literal
 * stays a single string, because `src/lib/__tests__/form-primitive-roles.test.ts`
 * reads the base off disk to pin it to DESIGN.md's Caption role.
 */
const CAPTION_TYPE_CLASSES = "type-caption font-medium"

/** The roles from DESIGN.md's *Hierarchy* a label may render in. */
const TYPE_ROLE_CLASSES = {
  caption: CAPTION_TYPE_CLASSES,
  label: "type-label",
} as const

type LabelProps = Readonly<
  React.ComponentProps<typeof LabelPrimitive.Root> & {
    /** Named `typeRole`, not `role`, which is the ARIA attribute. */
    typeRole?: keyof typeof TYPE_ROLE_CLASSES
  }
>

function Label({ className, typeRole = "caption", ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 type-caption font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50".replace(
          CAPTION_TYPE_CLASSES,
          TYPE_ROLE_CLASSES[typeRole]
        ),
        className
      )}
      {...props}
    />
  )
}

export { Label }

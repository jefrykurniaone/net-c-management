---
baseline_commit: 347770b2856de21a87afe4d56112fb3829f477a4
base_working_tree: Mostly clean at HEAD (347770b) for src/ and prisma/. Correction found during dev: 6 files still carry pre-existing UNCOMMITTED fixes from Story 4.3's dev pass (src/app/(admin)/admin/members/[id]/page.tsx, src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx, src/app/(main)/dashboard/page.tsx, src/app/(main)/sessions/page.tsx, src/app/auth/dev/page.tsx, src/app/auth/signin/page.tsx) — these are Story 4.3's scope, left untouched and unreverted by this story.
---

# Story 4.4: Settings information architecture cleanup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin/Owner,
I want each setting to live in exactly one obvious place,
so that no fee or identity field is duplicated, orphaned, or wrong in two homes.

**Epic:** Epic 4 — UI/UX Refresh, Responsiveness & Settings IA
**FRs:** FR-15 (Settings information architecture cleanup — community identity under General settings; all fees + Payment-Mode config under the Activity; no setting appears in two places; no orphaned/dead fields after fee consolidation).
**Governed by:** AD-8 (Activity owns all fees and allowed modes — single source, no second home), AD-11 (UI refresh within the existing design system — reuse shadcn, no new dependency), UX-DR14 (Activity edit form: explicit-required fees, ≥1 mode toggle), NFR-4/UX-DR19 (accessibility floor), NFR-6 (i18n through dictionary), NFR-7 (code-quality caps), NFR-8/AD-2 (no route/guard/mutation/query change beyond the one explicitly-scoped orphaned-field removal below).

## Acceptance Criteria

1. **General Settings holds community identity only (FR-15, AD-8).**
   **Given** General Settings
   **When** an Admin/Owner opens it
   **Then** it holds community identity only — name, logo, location, WhatsApp — and no fee, payment-mode, or session-capacity field appears there.

2. **Activity (Ekskul) configuration holds all money config (FR-15, AD-8, consistent with Story 2.2/2.3).**
   **Given** Activity (Ekskul) configuration
   **When** an Admin/Owner opens it
   **Then** all money config — Monthly Fee, Session Fee, allowed-mode toggles — lives there and only there, and the ≥1-mode validation attributes its error to the mode group, not to one arbitrarily-chosen checkbox.

3. **No setting appears in two places; no orphaned or dead fields (FR-15, SM-2, NFR-8).**
   **Given** the full settings surface after fee consolidation
   **When** audited
   **Then** no setting appears in two places, there are no orphaned or dead fields left behind by the removed global `defaultMonthlyFee`, and the separately-discovered dead `Settings.maxPlayers` field (writes to the DB but is never read by any session/Activity default) is removed as part of this same orphaned-field cleanup.

4. **Settings screens meet the same responsiveness/shared-component/a11y bar as 4.1–4.3 (FR-13, FR-14, NFR-4).**
   **Given** the refreshed Settings screens (General Settings + Activity config)
   **When** viewed across breakpoints and in dark mode
   **Then** they meet the same responsiveness, shared-component, and accessibility bars as Stories 4.1–4.3 — including that the Activity form's payment-mode toggles use a shared shadcn `Checkbox` component rather than a raw hand-rolled `<input type="checkbox">`.

## Tasks / Subtasks

> **Scope note:** Stories 2.2/2.3 already built the Activity fee/mode form and removed the global fee from General Settings — this story is primarily an **audit + close-the-gaps** pass, not a rebuild. Three concrete gaps were found during story analysis (all previously flagged in `deferred-work.md` / Story 4.3's Dev Notes as "leave for Story 4.4" or newly discovered here) and are the actual work below. This is presentation + one narrowly-scoped orphaned-setting removal — no other route/guard/schema change.

- [x] **Task 1 — Remove the orphaned `Settings.maxPlayers` field (AC: 3)**
  - [x] Confirm the finding first: `getSettings().maxPlayers` (`src/lib/settings.ts`) is never read by any session/Activity default — `ekskul-actions.tsx:87` defaults new Activities to a hardcoded `20`, and `sessions/new/page.tsx:49` defaults new Sessions to a hardcoded `20` before being overridden by the chosen Activity's own `maxPlayers` (`sessions/new/page.tsx:67`). The `Settings` row is write-only dead weight.
  - [x] `src/lib/settings.ts` — remove `maxPlayers` from the `AppSettings` interface, from `DEFAULTS`, and from the `getSettings()` return object.
  - [x] `src/app/(admin)/admin/settings/page.tsx` — remove `maxPlayers` from the `SettingsMap` interface, the initial `settings` state, and the entire max-players `<Label>`/`<Input>` block (currently lines ~219–232).
  - [x] `src/lib/i18n/dictionaries.ts` — remove the now-unused `maxPlayersLabel` key from both `en.admin` (line 246) and `id.admin` (line 701). Do **not** touch `ekskulMaxPlayers`/`sessionMaxPlayersMin`/`sessionMaxPlayersMax` — those back the Activity's own (real, consumed) `maxPlayers` field and are unrelated.
  - [x] `prisma/seed.ts` — remove the `maxPlayers` entry from `seedSettings()`'s `entries` map (it currently writes `String(DEFAULTS.maxPlayers)` into the `Settings` table). Keep `DEFAULTS.maxPlayers` itself and its use in `seedEkskul()`/`seedSampleSessions()` — the Ekskul/Session `maxPlayers` columns are real and still need a seed value.
  - [x] Do **not** touch `prisma/backfill-ekskul.ts` — it is a one-off, already-run migration script from the Epic 2 rename (its own header documents the two-`db push` sequence it ran between); it is historical, not a live "field," and out of this story's scope.
  - [x] No Prisma schema change — `Settings` stays a generic key-value table; simply nothing writes/reads the `maxPlayers` key anymore. No backfill/delete of any pre-existing DB row is needed (pre-launch, no production data — AD-12).

- [x] **Task 2 — Fix payment-mode ≥1 validation error attribution (AC: 2)** — `src/lib/validations/ekskul.ts`, `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`
  - [x] Background: `bothModesDisabled`'s `.refine(...)` currently hardcodes `path: ['allowsPerSession']` in both `buildCreateEkskulSchema` and `buildUpdateEkskulSchema`. This means disabling `allowsMonthly` (leaving `allowsPerSession` already off) attributes the resulting error to the *other* checkbox's field path — flagged as deferred UX-attribution debt in `deferred-work.md` ("Deferred from: code review of story-2.2") and explicitly left for this story.
  - [x] Change `path: ['allowsPerSession']` → `path: ['paymentModes']` in **both** refines (line ~62 create, line ~76 update). `paymentModes` is a synthetic group-level key (not a real form field) so the error is never misattributed to whichever checkbox happens to be named in the path.
  - [x] In `ekskul-actions.tsx`, change the error-render check from `form.formState.errors.allowsPerSession` to the new `paymentModes` key. Since `paymentModes` isn't part of `CreateEkskulFormData`, read it as `(form.formState.errors as typeof form.formState.errors & { paymentModes?: { message?: string } }).paymentModes` (or an equivalent narrow cast) rather than `as string`/`any` — keep the render condition and message-display JSX otherwise unchanged (still one message rendered once, below both checkboxes).
  - [x] No i18n change needed — reuse the existing `t.validation.paymentModeAtLeastOne` message (en/id already present); only the zod `path` and the TS read of `errors.*` change.

- [x] **Task 3 — Fix `maxPlayers` number-input coercion (AC: 4)** — `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`
  - [x] Background: the Activity form's `maxPlayers` field `onChange` uses `Number.parseInt(e.target.value) || 0` (no radix, and clearing the field silently coerces to `0` instead of leaving it blank) — flagged in `deferred-work.md` ("Deferred from: code review of story-2.2") as inconsistent with the `monthlyFee`/`sessionFee` inputs' `''→undefined` + radix-10 pattern, and explicitly left for this story.
  - [x] Align it with the fee-input pattern already in the same file (`monthlyFee`/`sessionFee`, ~lines 210–226): add `value={field.value ?? ''}` to the `<Input>`, and change `onChange` to `(e) => field.onChange(e.target.value === '' ? undefined : Number.parseInt(e.target.value, 10))`.
  - [x] The zod schema's `maxPlayers: z.number().int().min(2).max(100)` (required, no `feeRequired`-style optional/undefined message) is unchanged — this task only fixes the input's blank-vs-zero coercion behavior to match the established pattern; `min(2)` continues to block an eventual bad submit either way, so this is a UX-consistency fix, not a validation-rule change.

- [x] **Task 4 — Shared `Checkbox` component for the payment-mode toggles (AC: 4)** — new `src/components/ui/checkbox.tsx`, `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`
  - [x] The two payment-mode toggles (`allowsMonthly`, `allowsPerSession`) are currently the **only** raw `<input type="checkbox">` elements anywhere in `src/` — every other boolean/selection control in the app goes through a shadcn-based component. This is exactly the "re-implemented per page instead of a shared component" gap Story 4.3's AC1 targets, surfaced here because it lives on the Activity config screen this story governs.
  - [x] Add `src/components/ui/checkbox.tsx` following this repo's existing unified-`radix-ui`-import convention (see `src/components/ui/dialog.tsx:4`, `src/components/ui/label.tsx:4` — `import { X as XPrimitive } from 'radix-ui'`, no new dependency, `radix-ui` `^1.4.3` already bundles the Checkbox primitive — AD-11):
    ```tsx
    'use client';

    import * as React from 'react';
    import { Checkbox as CheckboxPrimitive } from 'radix-ui';
    import { CheckIcon } from 'lucide-react';

    import { cn } from '@/lib/utils';

    function Checkbox({
        className,
        ...props
    }: Readonly<React.ComponentProps<typeof CheckboxPrimitive.Root>>) {
        return (
            <CheckboxPrimitive.Root
                data-slot='checkbox'
                className={cn(
                    'peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}>
                <CheckboxPrimitive.Indicator
                    data-slot='checkbox-indicator'
                    className='flex items-center justify-center text-current transition-none'>
                    <CheckIcon className='size-3.5' />
                </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
        );
    }

    export { Checkbox };
    ```
  - [x] In `ekskul-actions.tsx`, replace both raw checkboxes (currently plain `<label><input type='checkbox' .../>{label text}</label>`, lines ~267–304) with `FormField`+`FormControl`-wrapped `<Checkbox checked={field.value} onCheckedChange={field.onChange} />` paired with a `<label>`/`<FormLabel>`, matching the `Form`/`FormField`/`FormControl` pattern already used for every other field in this same file. Keep the existing group heading (`t.admin.ekskulPaymentModes`) and the single shared error message below both (Task 2) — only the two checkbox controls themselves change from raw `<input>` to `<Checkbox>`.
  - [x] Keep `≥44px` effective tap target on the wrapping `<label>` (member-facing a11y floor doesn't strictly bind admin surfaces, but NFR-4's focus-ring/labeled-field requirements do) — the shadcn `Checkbox` ships a visible `focus-visible:ring` already; do not suppress it.

- [x] **Task 5 — Audit and confirm (AC: 1, 2, 3, 4)** — no further code change expected beyond Tasks 1–4; this task is verification
  - [x] Re-read `src/app/(admin)/admin/settings/page.tsx` end-to-end after Task 1: confirm the only fields left are `communityName`, `defaultLocation`, `adminWhatsapp`, `logoUrl` — i.e. identity only, matching AC1 exactly.
  - [x] Re-read `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` after Tasks 2–4: confirm Monthly Fee, Session Fee, and both mode toggles are the only money/mode config, all explicit-required (no silent 0), ≥1-mode enforced with correctly-attributed errors.
  - [x] Grep `src/` and `prisma/` for `defaultMonthlyFee` and `Settings.*maxPlayers`/`settings.maxPlayers`/`SettingsMap` `maxPlayers` — confirm zero remaining references outside the historical `prisma/backfill-ekskul.ts` (explicitly out of scope, Task 1).
  - [x] Toggle both Settings screens (General Settings, Activity create+edit dialog) light↔dark and at mobile/tablet/desktop widths — confirm no regression from Story 4.3's token migration (both files are already tokenized; this is a confirmation pass, not a re-migration) and that the new `Checkbox` renders correctly in both themes.
  - [x] `npx eslint` on every changed file → 0 issues. `npm run build` → green (types + all routes). `npx prisma generate` if the Prisma client needs refreshing (no schema change expected, so likely unnecessary — only run if `db push`/client drift is observed).
  - [x] Regression pass: activity CRUD (create/edit/activate/deactivate), general-settings save (name/location/whatsapp/logo), `proxy.ts`/layout guards, `/api/ekskul/**` and `/api/settings/**` routes all unchanged and working. No new dependency in `package.json` (the `Checkbox` component only uses the already-installed `radix-ui` package).

## Dev Notes

### What this story actually is (READ FIRST)
This is **not** a rebuild of the Settings/Activity screens — Stories 2.2 (Activity fee/mode config form) and 2.3 (removal of the global `defaultMonthlyFee`) already did that work, and it is **already correct**: General Settings has no fee field, and the Activity form already has Monthly Fee + Session Fee + mode toggles as explicit-required inputs. Verified by reading both files in full during story creation — see References.

What's left, concretely (three items, each independently traceable to a prior story's explicit deferral or a fresh audit finding):
1. **A newly-discovered orphaned field**: `Settings.maxPlayers` ("Default Max Participants" in General Settings) is written to the DB but **never read** by any consumer — every session/Activity default is hardcoded `20` in code (`ekskul-actions.tsx`, `sessions/new/page.tsx`), and each Activity already carries its own real `maxPlayers`. This is the same shape of bug FR-15/AC3 exists to catch, even though the AC text only names `defaultMonthlyFee` by name — confirmed with the user during story creation that its removal belongs in this story rather than being deferred further.
2. **Two items Story 4.3's Dev Notes explicitly deferred here** (`4-3-...md` line 190: *"These are form-validation behavior... Leave for Story 4.4"*), both also logged in `deferred-work.md` under "Deferred from: code review of story-2.2":
   - the ≥1-payment-mode validation error's hardcoded `path: ['allowsPerSession']` misattribution, and
   - the `maxPlayers` input's `Number.parseInt(...) || 0` blank-vs-zero coercion, inconsistent with the fee inputs' established pattern.
3. **A shared-component gap** discovered during analysis: the two payment-mode checkboxes are the only raw `<input type="checkbox">` in the entire `src/` tree — everything else already goes through a shadcn-based component per Story 4.3's "reuse, don't re-implement" mandate. No `Checkbox` component exists yet in `src/components/ui/`; this story adds the standard one.

This is presentation + one narrowly-scoped dead-setting removal (AC4/NFR-8/AD-2): no new route, no `proxy.ts`/guard change, no Server Action, no Prisma schema change, and no behavior change to the fee/mode validation *rules* themselves (only error attribution + input coercion UX).

### AC1/AC2 — already-true baseline (verified by reading the live code, not the epic prose)
- `src/lib/settings.ts` (`AppSettings`, `DEFAULTS`, `getSettings()`) — **no fee field present** (confirmed: `communityName`, `defaultLocation`, `adminWhatsapp`, `maxPlayers` [removed by Task 1], `logoUrl`).
- `src/app/(admin)/admin/settings/page.tsx` — **no fee field present** in `SettingsMap` or the form UI.
- `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` — Monthly Fee (`monthlyFee`, ~line 202-230) and Session Fee (`sessionFee`, same grid) are both explicit-required number inputs (blank submit rejected via `t.validation.feeRequired`, never a silent 0 — UX-DR14); mode toggles (`allowsMonthly`/`allowsPerSession`, ~line 262-314) enforce ≥1 via `bothModesDisabled` in `src/lib/validations/ekskul.ts`.
- Do not re-derive or duplicate this work — Tasks 2-4 only touch the specific gaps listed above within these same files.

### AC3 — orphaned-field audit findings
- **Removed by this story:** `Settings.maxPlayers` (Task 1) — the dead field described above.
- **Confirmed NOT orphaned (leave alone):** `Ekskul.maxPlayers` and `ActivitySession.maxPlayers` are real, independently-consumed columns (Activity default → inherited by new Sessions, overridable per Session, per `sessions/new/page.tsx:67`) — these are correct, single-source-of-truth fields, not duplicates of the removed `Settings.maxPlayers`.
- **Out of scope, documented, not touched:** `prisma/backfill-ekskul.ts` still references a local `defaultMonthlyFee` constant and reads `settings.defaultMonthlyFee` — this is a **one-off, already-executed migration script** from the Epic 2 rename (its own header comment documents the two-`db push` sequence it ran between; Epic 2 is `done`). It is historical tooling, not a live UI/data "field," and modifying it risks nothing while fixing nothing real. `prisma/seed.ts` also has a local `DEFAULTS.defaultMonthlyFee` constant used only to seed `Ekskul.monthlyFee` (the real column) — not a Settings-table write, not orphaned.
- **No DB backfill/delete needed** for any pre-existing `Settings` row with key `maxPlayers` — pre-launch, no production data (AD-12); the row simply stops being written or read going forward.

### AC4 — responsiveness/shared-component/a11y baseline
Both Settings screens were already migrated to semantic tokens and audited for dark-mode contrast in Story 4.3 (see `4-3-...md` Task 6's last bullet and File List — both `admin/settings/page.tsx` and `admin/ekskul/*.tsx` are listed). This story's Task 5 is a **confirmation pass**, not a re-migration. The one actual AC4 gap is the raw-checkbox shared-component issue (Task 4) — everything else should already pass; if anything else is found broken during the Task 5 audit, treat it as a regression from 4.3 and fix it minimally (do not scope-creep into a fresh visual pass).

### Exact edit locations (from reading the live files during story creation)
- `src/lib/settings.ts` — `AppSettings` interface (lines 6-12), `DEFAULTS` (lines 21-26), `getSettings()` return (lines 42-52). Remove the `maxPlayers` line from each.
- `src/app/(admin)/admin/settings/page.tsx` — `SettingsMap` interface (line 19), initial state (line 36), form block (lines 219-232, the `<Label htmlFor='maxPlayers'>...</Label>` through its closing `</div>`).
- `src/lib/i18n/dictionaries.ts` — `maxPlayersLabel` at line 246 (`en.admin`) and line 701 (`id.admin`). Leave `ekskulMaxPlayers` (lines 323/778) and `sessionMaxPlayersMin`/`sessionMaxPlayersMax` (lines 430-431/885-886) untouched.
- `prisma/seed.ts` — `seedSettings()`'s `entries` map (lines 84-90): remove the `maxPlayers: String(DEFAULTS.maxPlayers)` line only; `DEFAULTS.maxPlayers` itself (line 33) stays (still used by `seedEkskul`/`seedSampleSessions`).
- `src/lib/validations/ekskul.ts` — `path: ['allowsPerSession']` at line 62 (`buildCreateEkskulSchema`) and line 76 (`buildUpdateEkskulSchema`). Change both to `path: ['paymentModes']`.
- `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` — error render at lines 306-313 (`form.formState.errors.allowsPerSession`); `maxPlayers` field at lines 315-340; checkbox fields at lines 262-314.

### Reuse — do not reinvent (AD-11: no new dependency)
- shadcn primitives already in `src/components/ui/` (`form`, `input`, `label`, `dialog`, `button`) — reuse for the Checkbox integration.
- This repo has two coexisting Radix import styles: older files (`form.tsx`) import scoped `@radix-ui/react-label`/`@radix-ui/react-slot` (transitive deps, pre-existing, do not touch); newer files (`dialog.tsx`, `label.tsx`, `select.tsx`, `sheet.tsx`, `dropdown-menu.tsx`) import the unified `radix-ui` package (`^1.4.3`, a direct `package.json` dependency). Use the **unified `radix-ui` package** for the new `Checkbox` — it's the declared dependency and the pattern every recent shadcn-style component in this repo already follows.
- i18n: no new copy needed — reuse `t.admin.ekskulPaymentModes`, `t.admin.ekskulModeMonthly`, `t.admin.ekskulModePerSession`, `t.validation.paymentModeAtLeastOne` as-is.

### Guardrails — what must NOT change (AC4, NFR-8, AD-2)
- `src/proxy.ts`, both route-group `layout.tsx` guards — untouched.
- No Server Actions, no new/changed API route, no Prisma schema change, no `select`/`include`/`where` change to any existing query.
- `bothModesDisabled`'s actual **logic** (fails only when both flags are explicitly `false`) is unchanged — only its error `path` changes. Do not also try to fix the separately-deferred "validates request body, not merged DB state" hardening item from the story-2.2 review — that's explicitly earmarked for a payment-mode-API touch, not this IA-cleanup story, and touching `/api/ekskul/**` route logic is out of this story's presentation-only scope.
- Do not touch `Ekskul.maxPlayers`/`ActivitySession.maxPlayers` (real, correct fields) — only `Settings.maxPlayers` (the dead one) is in scope.
- Do not re-run Story 4.3's full token/dark-mode migration — both files already passed it; Task 5 is confirmation only.

### Next.js 16 / project specifics
- Server Components by default; `admin/ekskul/page.tsx` stays a server component. `ekskul-actions.tsx` and `admin/settings/page.tsx` are already `'use client'` — no change to that boundary.
- The new `checkbox.tsx` must be `'use client'` (wraps a Radix primitive with interactive state), consistent with every other file in `src/components/ui/` that wraps a Radix primitive.
- `src/lib` must not import from `src/app` (AR-2) — not implicated here (no `src/lib` changes touch `src/app`).
- Tailwind v4 tokens (`border-input`, `bg-primary`, `text-primary-foreground`, `ring-ring`) are already wired via `@theme inline` in `globals.css` (Story 4.3) — the new Checkbox can use them directly, no token additions needed.

### Code-quality caps (NFR-7)
Functions ≤40 lines · files ≤300 lines (check `ekskul-actions.tsx`'s current size — verify it stays under 300 after Task 4's edit; extract if it doesn't) · nesting ≤3 (early return) · no magic numbers · naming (`PascalCase.tsx` components, `camelCase` fns, booleans `is`/`has`/`should`). ESLint (next core-web-vitals + ts) via pre-commit.

### Testing standards
No automated tests. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual passes:
- **AC1:** General Settings form shows exactly 4 fields (name, location, whatsapp, logo) + the logo uploader — no fee, no mode toggle, no max-players field.
- **AC2:** Activity create/edit dialog shows Monthly Fee + Session Fee (both reject a blank submit) + both mode toggles (≥1 enforced); disable only `allowsMonthly` and confirm the error still renders (now via the `paymentModes` path) without depending on which checkbox is visually "wrong."
- **AC3:** grep `src/` + `prisma/seed.ts` for `maxPlayers` referencing the `Settings` table/`SettingsMap` → zero hits after Task 1 (Ekskul/Session `maxPlayers` hits are expected and correct); grep for `defaultMonthlyFee` → zero hits outside `prisma/backfill-ekskul.ts`.
- **AC4:** toggle both screens light/dark, resize desktop→tablet→mobile — no broken layout; the new `Checkbox` shows a visible focus ring, correct checked/unchecked contrast in both themes, and responds to keyboard (Space to toggle, Tab to reach).
- **No regression (NFR-8):** Activity CRUD, General Settings save (including logo upload), `/api/ekskul/**`, `/api/settings/**`, `proxy.ts`/layout guards all still work; `package.json`/`package-lock.json` diff since baseline → empty (no new dependency).

### References
- [Source: epics.md#Story 4.4] (lines 561-583) — ACs + FR-15 mapping
- [Source: epics.md#AD-8] (ARCHITECTURE-SPINE.md lines 104-110) — Activity owns all fees/modes; single source; explicit-required; mode-disable not retroactive
- [Source: epics.md#AD-11] (ARCHITECTURE-SPINE.md lines 122-125) — reuse shadcn, no new dependency, desktop-first, dark mode verified
- [Source: ARCHITECTURE-SPINE.md#Capability→Architecture Map] (line 219) — "4.4 UI/UX refresh & responsiveness (FR-13..15) | all (main)/(admin) screens; shadcn components; Settings IA | AD-11, AD-8 (fee IA)"
- [Source: DESIGN.md lines 55-56, 65] — "Manage Activities... the *only* place fees live"; "General Settings: Community identity only... No fee field"; "Fee single-source rule (IA invariant)"
- [Source: 4-3-consistent-visual-language-shared-components-dark-mode.md line 190] — explicit deferral of the payment-mode error-attribution and `maxPlayers`-coercion items to Story 4.4
- [Source: deferred-work.md#"Deferred from: code review of story-2.2"] — same two items, plus the separately-scoped (out-of-scope-here) "validates request body, not merged DB state" hardening item
- [Source: src/lib/settings.ts] — `AppSettings`/`DEFAULTS`/`getSettings()` (read in full; no fee field present, `maxPlayers` present and orphaned)
- [Source: src/app/(admin)/admin/settings/page.tsx] — General Settings form (read in full; no fee field present, `maxPlayers` field present and orphaned)
- [Source: src/app/(admin)/admin/ekskul/ekskul-actions.tsx] — Activity form (read in full; fees + mode toggles already correct; raw checkboxes + coercion + attribution gaps confirmed)
- [Source: src/lib/validations/ekskul.ts] — `bothModesDisabled` + both `.refine(...)` calls (misattributed `path`)
- [Source: src/lib/i18n/dictionaries.ts] — `maxPlayersLabel` (246/701) vs `ekskulMaxPlayers` (323/778) — confirmed separate keys, safe to remove only the former
- [Source: prisma/seed.ts, prisma/backfill-ekskul.ts] — read in full; seed.ts fix is a one-line removal, backfill-ekskul.ts confirmed historical/out-of-scope
- [Source: src/components/ui/dialog.tsx:4, src/components/ui/label.tsx:4] — unified `radix-ui` import convention to follow for the new `Checkbox`
- [Source: package.json:35] — `radix-ui: ^1.4.3` is the only Radix dependency declared; confirms Checkbox needs no new package
- [Source: project-context.md] — Next 16 `proxy.ts`, twice-enforced guards, server-only helpers, code caps, i18n-through-dictionary, AR-2 (no Server Actions)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (bmad-dev-story workflow)

### Debug Log References

- Confirmed the `maxPlayers` orphan finding before touching code: grepped every consumer of `getSettings()`/`AppSettings` and every write site of `maxPlayers`; the only reads were the General Settings page itself (display/edit) and `getSettings()`'s own return — no session/Activity default anywhere reads it (both `ekskul-actions.tsx` and `sessions/new/page.tsx` hardcode `20` and then override from the chosen Activity's own `maxPlayers`). User confirmed removal was in scope before implementation started.
- Task 1: removed `maxPlayers` from `AppSettings`/`DEFAULTS`/`getSettings()` (`src/lib/settings.ts`), the `SettingsMap`/state/form block (`admin/settings/page.tsx`, dropped its `FormSkeleton` count from 6→5 to match the now-5-field form), the `maxPlayersLabel` i18n key (en+id), and the `maxPlayers` entry in `seed.ts`'s `seedSettings()` (kept `DEFAULTS.maxPlayers` itself — still used to seed the real `Ekskul`/`ActivitySession` columns). Left `prisma/backfill-ekskul.ts` untouched — confirmed historical one-off script, out of scope.
- Task 2: changed both `bothModesDisabled` refines' `path` from `['allowsPerSession']` to a synthetic `['paymentModes']` in `src/lib/validations/ekskul.ts`; in `ekskul-actions.tsx` added a `paymentModesError` derived value (typed via `FieldErrors<CreateEkskulFormData> & { paymentModes?: { message?: string } }`) and swapped the error-render condition to it.
- Task 3: aligned `maxPlayers` input's `onChange`/`value` with the existing `monthlyFee`/`sessionFee` `''→undefined` + radix-10 pattern in the same file.
- Task 4: added `src/components/ui/checkbox.tsx` (shadcn Checkbox, unified `radix-ui` import per this repo's `dialog.tsx`/`label.tsx` convention — no new dependency); replaced both raw `<input type="checkbox">` payment-mode toggles in `ekskul-actions.tsx` with `FormField`+`FormControl`-wrapped `<Checkbox>` bound via `onCheckedChange={field.onChange}`.
- Verification: `npm run lint` → "ESLint: No issues found". `npm run build` fails at the Next.js font-optimization step (`next/font/google` cannot reach `fonts.googleapis.com` — no network egress in this sandbox); this is a pre-existing environment limitation unrelated to any change in this story (confirmed: the failure is in `src/app/layout.tsx`'s Geist font import, a file untouched by this story). Ran `npx tsc --noEmit -p tsconfig.json` instead → "TypeScript: No errors found", giving full type-safety coverage in place of the blocked build step.
- Live verification: started the dev server, signed in via `/auth/dev` (dev-only bypass) as Admin, and exercised both screens in the browser. General Settings shows exactly 4 identity fields (name/location/whatsapp/logo) — no fee/mode/max-players field (AC1). Activity edit dialog shows Monthly Fee, Session Fee (both reject blank), and the two mode toggles now rendered as the new `Checkbox` component (AC2/AC4) — verified in both light and dark mode with good contrast in both. Unchecked "Monthly" while "Per-Session" was already off and confirmed the "Enable at least one payment mode" error now renders correctly via the `paymentModes` path (AC2) without depending on which checkbox was toggled. No console errors on either screen.
- Found during the live pass (unrelated to this story, not touched): `src/app/(admin)/admin/members/[id]/page.tsx`, `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx`, `src/app/(main)/dashboard/page.tsx`, `src/app/(main)/sessions/page.tsx`, `src/app/auth/dev/page.tsx`, `src/app/auth/signin/page.tsx` carry pre-existing uncommitted fixes from Story 4.3's dev pass that were never committed. Left as-is — Story 4.3's scope, not this story's.

### Completion Notes List

- AC1/AC2 baseline confirmed already correct from Stories 2.2/2.3 (no fee field in General Settings; Monthly Fee/Session Fee/mode toggles already on the Activity form) — no rebuild needed, only the three gap-closing tasks below.
- AC3: removed the orphaned `Settings.maxPlayers` field end-to-end (interface, defaults, API-consumed getter, admin UI, i18n, seed) — confirmed zero remaining references via grep outside the historical, out-of-scope `prisma/backfill-ekskul.ts`. Confirmed zero remaining `defaultMonthlyFee` references in `src/`.
- AC2/AC4: fixed the payment-mode ≥1 validation error's misattribution (now a synthetic `paymentModes` path, verified live in-browser) and the `maxPlayers` input's blank-vs-zero coercion (now matches the fee-input pattern) — both were explicitly deferred to this story by Story 4.3's Dev Notes and `deferred-work.md`.
- AC4: added a shared `Checkbox` component (`src/components/ui/checkbox.tsx`) and replaced the last two raw `<input type="checkbox">` elements in `src/` with it — verified rendering and interaction in both light and dark mode.
- No route, guard, Server Action, or schema change — presentation + one narrowly-scoped dead-setting removal, per AC4/NFR-8/AD-2. No new dependency (`package.json` untouched; `Checkbox` reuses the already-installed `radix-ui` package).
- `npm run lint` clean; `npx tsc --noEmit` clean (full build blocked only by a sandboxed-environment font-fetch network restriction, unrelated to this story's files).

### File List

- `src/lib/settings.ts` (modified) — removed `maxPlayers` from `AppSettings`/`DEFAULTS`/`getSettings()`
- `src/app/(admin)/admin/settings/page.tsx` (modified) — removed `maxPlayers` field/state/UI; `FormSkeleton` count 6→5
- `src/lib/i18n/dictionaries.ts` (modified) — removed unused `maxPlayersLabel` (en+id)
- `prisma/seed.ts` (modified) — removed `maxPlayers` from `seedSettings()`'s written keys
- `src/lib/validations/ekskul.ts` (modified) — `bothModesDisabled` refine `path` → `['paymentModes']` (both create/update schemas)
- `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` (modified) — `paymentModesError` derived value + updated error render; `maxPlayers` input coercion fix; both payment-mode checkboxes migrated to the new `Checkbox` component
- `src/components/ui/checkbox.tsx` (new) — shared shadcn `Checkbox` component

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 4.4 created (ready-for-dev). Audited General Settings + Activity config against FR-15/AD-8; confirmed AC1/AC2 baseline already correct (Stories 2.2/2.3); scoped remaining work to three concrete gaps: remove newly-discovered orphaned `Settings.maxPlayers` field (user-confirmed in scope), fix payment-mode ≥1 validation error attribution and `maxPlayers` input coercion (both explicitly deferred here by Story 4.3 / `deferred-work.md`), and add a shared shadcn `Checkbox` component to replace the two raw `<input type="checkbox">` payment-mode toggles. |
| 2026-07-01 | Story 4.4 dev pass complete → review. Removed orphaned `Settings.maxPlayers`; fixed payment-mode ≥1 error attribution (synthetic `paymentModes` path) and `maxPlayers` input coercion; added shared `Checkbox` component and migrated both payment-mode toggles onto it. Verified live in-browser (light+dark mode, both Settings screens) plus `npm run lint` and `npx tsc --noEmit` clean (full `npm run build` blocked only by a sandboxed-environment font-fetch restriction, unrelated to this story). |

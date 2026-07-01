---
baseline_commit: 57f801bc0eb050f328c7ff182887c50394f0bcd7
note: Builds on Story 2.1 (rename done). Extends the Ekskul (Activity) model with money config. Prerequisite for Stories 2.3 (remove global fee), 2.4 (session-fee inheritance), and Epic 3 (member mode selection).
---

# Story 2.2: Admin configures Activity fees & payment modes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin,
I want to set an Activity's monthly fee, session fee, and which payment modes it offers,
So that each Activity owns its own money configuration in exactly one place.

**Epic:** Epic 2 — Payment Foundation: Rename + Per-Activity Fee & Mode Config (Admin)
**FRs:** FR-7 (Monthly Fee single source per Activity), FR-8 (per-session price per Activity), FR-9 (allowed payment modes per Activity)
**Governed by:** AR-7 (Activity owns money config), AR-9 (schema via generate + db push, pre-launch), AR-2 (single mutation boundary — Route Handler), AD-2/NFR-2 (auth contract), NFR-6 (i18n dict-aware zod), NFR-7 (code quality), NFR-8 (no regression)

## Acceptance Criteria

1. **Ekskul model extended (schema).**
   **Given** `prisma/schema.prisma`,
   **When** the Activity (`Ekskul`) model is extended,
   **Then** it carries `monthlyFee` (consolidated monthly dues — **repurpose the existing `defaultFee`** column, no data loss), a new `sessionFee Int @default(0)`, and `allowsMonthly Boolean @default(true)` + `allowsPerSession Boolean @default(false)` booleans, applied via `npx prisma generate` + `npx prisma db push` (AR-7, AR-9). The `defaultFee`→`monthlyFee` rename is done via `ALTER TABLE "Ekskul" RENAME COLUMN` **before** `db push` (same no-data-loss pattern as Story 2.1), so existing dev fee values survive.

2. **Activity form exposes required fees + independent mode toggles.**
   **Given** the Activity create/edit form (`ekskul-actions.tsx`),
   **When** an Admin opens it,
   **Then** it exposes **Monthly Fee** and **Session Fee** as **explicit required inputs** (the form refuses a silent 0 — empty/blank is a validation error, not coerced to 0), plus independent **Monthly** / **Per-Session** toggles, alongside the existing identity fields (name/slug/color/description/location/maxPlayers/whatsapp) (UX-DR14, FR-8, FR-9).

3. **≥1-enabled rule enforced in zod AND route (not UI alone).**
   **Given** an Admin disables both payment modes,
   **When** they attempt to save,
   **Then** save is blocked with "Enable at least one payment mode" — the ≥1-enabled rule lives in the **dict-aware zod schema** (`buildCreateEkskulSchema(t)` / update) via a cross-field refinement **and** is therefore enforced by the Route Handler's `safeParse` (both POST and PATCH), never by the client UI alone (FR-9, AD-8, NFR-2).

4. **Auth contract on `/api/ekskul` preserved.**
   **Given** a write to `POST /api/ekskul` or `PATCH /api/ekskul/[id]`,
   **When** the request is handled,
   **Then** it follows the contract unchanged: `await auth()` → 401 if no `session.user.id`; `isAdminRole(role)` → 403 (OWNER passes; never `role === 'ADMIN'`); dict-aware `zod.safeParse(body)` → 400 `{ error, details }` (NFR-2, AD-2). Build + lint pass; existing monthly Payment / Session / membership behavior is unchanged (NFR-8).

## Tasks / Subtasks

- [x] **Task 1 — Extend the Ekskul schema + DB (AC: 1)**
  - [x] `prisma/schema.prisma`: rename `defaultFee Int @default(0)` → `monthlyFee Int @default(0)`; add `sessionFee Int @default(0)`, `allowsMonthly Boolean @default(true)`, `allowsPerSession Boolean @default(false)`.
  - [x] DB: `ALTER TABLE "Ekskul" RENAME COLUMN "defaultFee" TO "monthlyFee";` via `prisma db execute --file` **before** `db push` (preserves dev data); then `prisma db push` adds the three new columns (all defaulted → non-destructive); `prisma generate`.
  - [x] Verify `db push` reports no data loss / no table-drop.

- [x] **Task 2 — Dict-aware zod schema with ≥1-mode refinement (AC: 2, 3)**
  - [x] `src/lib/validations/ekskul.ts`: rename `defaultFee` → `monthlyFee` (Int, `.min(0)`, **required** — no `.optional()`), add `sessionFee` (Int, `.min(0)`, required), `allowsMonthly`/`allowsPerSession` (boolean, default from form). Add a `.refine()` (cross-field) that at least one of `allowsMonthly`/`allowsPerSession` is `true` → `t.validation.paymentModeAtLeastOne`, `path: ['allowsPerSession']`.
  - [x] Keep the update schema's `.partial()` shape but re-apply the ≥1-mode refine so PATCH with both false is rejected (guard for when both keys are present).

- [x] **Task 3 — Activity form: fee inputs + mode toggles (AC: 2, 3)**
  - [x] `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`: `EkskulRow` gains `monthlyFee`/`sessionFee`/`allowsMonthly`/`allowsPerSession`; relabel the fee field to Monthly Fee, add a Session Fee field, add two mode toggles (checkbox/switch). Default form values from `ekskul?…`. Show the ≥1-mode message on the toggle group.
  - [x] `src/app/(admin)/admin/ekskul/page.tsx`: pass the new fields into `EkskulRow`; update the fee column to show `monthlyFee` (optionally session fee).

- [x] **Task 4 — Propagate the `defaultFee`→`monthlyFee` rename to all consumers (AC: 1, 4, NFR-8)**
  - [x] `src/types/ekskul.ts` `EkskulOption`: `defaultFee` → `monthlyFee`; add `sessionFee`, `allowsMonthly`, `allowsPerSession`.
  - [x] `src/app/(main)/payments/upload/page.tsx`: monthly-dues prefill now reads `chosen.monthlyFee` (monthly path).
  - [x] `src/app/(admin)/admin/sessions/new/page.tsx`: for now the session-fee default still reads a fee off the Activity — leave reading `monthlyFee`? NO — session default is Story 2.4's job (`sessionFee`). In THIS story just fix the field name so it compiles; Story 2.4 switches it to `sessionFee`. (Interim: read `chosen.sessionFee` since the field now exists — this satisfies FR-8's inheritance early and is verified in 2.4.)
  - [x] `prisma/seed.ts`: `defaultFee:` → `monthlyFee:` in the ekskul create; add `sessionFee`, `allowsMonthly`, `allowsPerSession` explicitly for the demo Activity.
  - [x] `git grep defaultFee -- src/ prisma/` → zero hits (field fully renamed).

- [x] **Task 5 — Verify auth contract + no regression (AC: 4, NFR-8)**
  - [x] Confirm `POST /api/ekskul` and `PATCH /api/ekskul/[id]` are unchanged in their `auth()`/`isAdminRole`/`safeParse` sequence and now reject both-modes-off with 400.
  - [x] i18n: add `paymentModeAtLeastOne`, `sessionFeeLabel`/`monthlyFeeLabel`, mode-toggle labels to `dictionaries.ts` (en + id parity), route all new strings through the dictionary (NFR-6).
  - [x] `npm run lint` + `npm run build` green.

## Dev Notes

### Scope boundary (read first)
- **In scope:** Ekskul money-config fields + form + zod ≥1-mode rule + route validation; the `defaultFee`→`monthlyFee` rename across consumers.
- **NOT in scope (Story 2.3):** removing `Settings.defaultMonthlyFee` / the General-settings fee field. Leave it for 2.3.
- **NOT in scope (Story 2.4):** the Session create-form default-from-`sessionFee` behavior + no-retroactive-rewrite ACs are 2.4's to *verify*; this story only ensures the field exists and code compiles.
- **NOT in scope (Epic 3):** `Membership.paymentMode`, `Payment.type`, per-session billing.

### Key decision — repurpose `defaultFee`, don't add a parallel column (AC: 1) — BINDING
AR-7 says "monthlyFee (repurpose `defaultFee`)". `defaultFee` today is the monthly-dues amount (it prefills the monthly proof-upload amount). Renaming the column in place (via `ALTER TABLE RENAME COLUMN` before `db push`) preserves existing dev values and keeps one clean money field. Do **not** keep `defaultFee` and add a separate `monthlyFee` — that leaves a dead column (FR-15 forbids orphans).

### DB order (no data loss) — same pattern as Story 2.1
1. Edit schema. 2. `ALTER TABLE "Ekskul" RENAME COLUMN "defaultFee" TO "monthlyFee";` via `prisma db execute --file <sql>` (Prisma 7 `db execute` reads the datasource from `prisma.config.ts` — pass **only** `--file`, no `--schema`). 3. `prisma db push` (adds the 3 defaulted columns; must NOT report a drop). 4. `prisma generate`. Dev DB = local `netc` at `localhost:5432` (`.env.local`, the `prisma.config.ts` default; prod needs `DATABASE_TARGET=prod`). SQL files must be BOM-free (write via the editor, not PowerShell `Set-Content -Encoding utf8`).

### Explicit-required fee (AC: 2) — no silent 0
The current form coerces the fee via `Number.parseInt(e.target.value) || 0`, which silently turns blank into 0. AC2/UX-DR14 require the fee to be *explicit*. Keep the number input but make zod treat the field as required and reject a blank/NaN (the RHF field should pass `undefined`/NaN when empty so zod's required check fires, not a coerced 0). A `min(0)` still allows a deliberate 0 (free Activity) but not an accidental empty submit.

### ≥1-mode rule lives in zod (AC: 3) — enforced by the route for free
Because both routes already do `buildCreateEkskulSchema(t).safeParse(body)` / `buildUpdateEkskulSchema(t).safeParse(body)`, putting the ≥1-mode invariant in the schema's `.refine()` means the Route Handler enforces it automatically (AD-8) — no separate route code. The update schema is `.partial()`, so the refine must tolerate absent keys (only fail when BOTH are explicitly `false`).

### Auth contract (AC: 4) — unchanged
`src/app/api/ekskul/route.ts` (POST) and `[id]/route.ts` (PATCH) already implement `await auth()` → 401, `isAdminRole` → 403, dict-aware `safeParse` → 400 `{ error, details }`. Do not alter that sequence; the new fields flow through `parsed.data` into `prisma.ekskul.create/update` unchanged. Never compare `role === 'ADMIN'` (OWNER must pass) — reuse `isAdminRole` (AD-2).

### Files to touch
- **Schema/DB:** `prisma/schema.prisma`, `prisma/seed.ts`, plus the one-off `ALTER TABLE RENAME COLUMN` SQL.
- **Validation:** `src/lib/validations/ekskul.ts`.
- **Form/pages:** `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`, `src/app/(admin)/admin/ekskul/page.tsx`.
- **Consumers of the renamed field:** `src/types/ekskul.ts`, `src/app/(main)/payments/upload/page.tsx`, `src/app/(admin)/admin/sessions/new/page.tsx`.
- **i18n:** `src/lib/i18n/dictionaries.ts` (en + id).
- **DO NOT TOUCH:** `prisma/migrations/**` (immutable); the API-route auth/`safeParse` skeletons (only the schema they call changes).

### Testing standards
No automated tests. Verify: `git grep defaultFee -- src/ prisma/` → zero; `npm run lint` + `npm run build` green; DB has `monthlyFee`/`sessionFee`/`allowsMonthly`/`allowsPerSession` on Ekskul with existing rows' fee preserved (row count + fee value unchanged post-rename); manual smoke — create/edit an Activity, try to save with both modes off (blocked, message shown), save with valid fees (persists).

### References
- [Source: epics.md#Story 2.2] — story + ACs
- [Source: epics.md#AR-7] — Activity owns money config; repurpose defaultFee; ≥1 true
- [Source: epics.md#AR-9] — schema via generate + db push; pre-launch
- [Source: epics.md#UX-DR14] — Activity edit form: explicit-required fees, ≥1 mode
- [Source: prisma/schema.prisma:102-121] — Ekskul model
- [Source: src/lib/validations/ekskul.ts] — dict-aware zod builders
- [Source: src/app/api/ekskul/route.ts, [id]/route.ts] — auth contract
- [Source: _bmad-output/project-context.md] — Prisma driver-adapter, db push, port 5432 dev

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- DB (local `netc` @ localhost:5432, `.env.local`): `ALTER TABLE "Ekskul" RENAME COLUMN "defaultFee" TO "monthlyFee";` via `prisma db execute --file` → "Script executed successfully"; `prisma db push` → "in sync … Done in 167ms" (added `sessionFee`/`allowsMonthly`/`allowsPerSession`, no data-loss prompt, no table drop); `prisma generate` → client regenerated.
- Prisma 7 note: `db execute` reads the datasource from `prisma.config.ts` and rejects `--schema`; pass only `--file`. SQL files must be BOM-free (PowerShell `Set-Content -Encoding utf8` injects a BOM → `syntax error at or near "﻿SELECT"`; wrote via editor instead).
- Data-preservation check: `SELECT slug, "monthlyFee", "sessionFee", "allowsMonthly", "allowsPerSession"` → `{monthlyFee: 50000, sessionFee: 0, allowsMonthly: true, allowsPerSession: false}` — the pre-rename fee value (50000) survived (AC1).
- `npm run lint` → exit 0 (initial pass warned React-Compiler on inline `form.watch('allowsMonthly')`; refactored both toggles to reactive `FormField`/`field.value` → clean); `npm run build` → exit 0.
- `git grep defaultFee -- src/ prisma/` → only the global `defaultFeeLabel` (Story 2.3 territory) remains; the Ekskul field is fully `monthlyFee`.

### Completion Notes List

- **Schema (AC1):** `Ekskul.defaultFee` → `monthlyFee` (in-place column rename, data preserved) + new `sessionFee Int @default(0)`, `allowsMonthly Boolean @default(true)`, `allowsPerSession Boolean @default(false)`. Applied via ALTER-before-push (same no-data-loss pattern as Story 2.1).
- **Form (AC2):** Activity form now has Monthly Fee + Session Fee as explicit-required number inputs (empty → `undefined` → zod `feeRequired`, never a coerced 0) and two independent Monthly/Per-Session checkboxes (dependency-free native inputs wired to RHF `FormField`; no new UI package). Fee columns/values use `tabular-nums`.
- **≥1-mode rule (AC3):** lives in `buildCreateEkskulSchema`/`buildUpdateEkskulSchema` via a `.refine()` (`bothModesDisabled`) with `path: ['allowsPerSession']`; because both routes `safeParse` these schemas, POST **and** PATCH reject both-modes-off with 400 `{ error, details }` — enforced server-side, not UI-only. The refine only fails when BOTH flags are explicitly `false`, so a partial PATCH that omits the mode keys still passes.
- **Known edge (documented):** a raw PATCH that sets exactly one mode to `false` while the other is already `false` in the DB (and omitted from the body) would not be caught by the refine (it validates the request body, not the merged DB state). The full edit form always submits both toggles, so the UI path is safe; hardening the route to merge-then-check is deferred (out of this story's scope).
- **Rename propagation (AC1, NFR-8):** `EkskulOption` type, `payments/upload` monthly-dues prefill (`monthlyFee`), `admin/ekskul` list + row props, `seed.ts`, and `backfill-ekskul.ts` (Prisma-typed create) all updated. `sessions/new` fee default now reads `chosen.sessionFee` (formally verified in Story 2.4).
- **Auth (AC4):** `POST /api/ekskul` + `PATCH /api/ekskul/[id]` auth/`isAdminRole`/`safeParse` sequence untouched; new fields flow through `parsed.data`.
- **Out of scope (left for later):** global `Settings.defaultMonthlyFee` + its settings-page field (`defaultFeeLabel`) → Story 2.3; the demo seed's "Badminton" name/slug residue → seed/rebrand follow-up.

### File List

- **Modified** `prisma/schema.prisma` — `Ekskul`: `defaultFee`→`monthlyFee`, +`sessionFee`/`allowsMonthly`/`allowsPerSession`.
- **Modified** `prisma/seed.ts` — ekskul create: `monthlyFee` + explicit `sessionFee`/`allowsMonthly`/`allowsPerSession`.
- **Modified** `prisma/backfill-ekskul.ts` — ekskul create field `defaultFee`→`monthlyFee`.
- **Modified** `src/lib/validations/ekskul.ts` — base object schema + `monthlyFee`/`sessionFee` (required) + `allowsMonthly`/`allowsPerSession` + ≥1-mode `.refine()` on create & update.
- **Modified** `src/lib/i18n/dictionaries.ts` — en+id: `ekskulFee` relabel, `ekskulSessionFee`, `ekskulPaymentModes`, `ekskulModeMonthly`, `ekskulModePerSession`, `feeRequired`, `paymentModeAtLeastOne`.
- **Modified** `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` — `EkskulRow` fields; Monthly/Session fee inputs; mode toggles; defaults.
- **Modified** `src/app/(admin)/admin/ekskul/page.tsx` — fee column `monthlyFee` (+`tabular-nums`); row props.
- **Modified** `src/types/ekskul.ts` — `EkskulOption`: `monthlyFee`/`sessionFee`/`allowsMonthly`/`allowsPerSession`.
- **Modified** `src/app/(main)/payments/upload/page.tsx` — monthly-dues prefill reads `monthlyFee`.
- **Modified** `src/app/(admin)/admin/sessions/new/page.tsx` — session-fee default reads `sessionFee`.
- **DB** — `ALTER TABLE "Ekskul" RENAME COLUMN "defaultFee" TO "monthlyFee"` + `db push` (add 3 columns) on the dev `netc` database.

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 2.2 created (context-filled). Scope: extend Ekskul with monthlyFee (repurpose defaultFee) + sessionFee + allowsMonthly/allowsPerSession; explicit-required fee inputs + mode toggles in the Activity form; ≥1-mode rule in dict-aware zod (enforced by POST + PATCH routes); propagate the field rename to all consumers. No-data-loss column rename via ALTER before db push. |
| 2026-07-01 | Code review (3-layer adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor) over `57f801b..93ce4f2`. All 10 ACs across Stories 2.2/2.3/2.4 MET. 0 decision-needed, 0 patch, 3 deferred, 6 dismissed (4 Blind-Hunter false positives from no-repo-access + 2 by-design). Status → done. |

## Review Findings

_Code review 2026-07-01 (Blind Hunter / Edge Case Hunter / Acceptance Auditor) over `57f801b..93ce4f2`. All acceptance criteria MET; no blocking issues. Deferred items below (all UI-safe / pre-existing / cosmetic):_

- [x] [Review][Defer] ≥1-payment-mode refine validates request body, not merged DB state [src/lib/validations/ekskul.ts:52-57] — a hand-crafted partial PATCH setting one mode `false` while the other is already `false` in the DB (and omitted from the body) bypasses the ≥1-mode rule. The full edit form always submits both toggles, so the UI path is safe. Already disclosed in Completion Notes; harden route to merge-then-check when the payment-mode API is next touched. Deferred.
- [x] [Review][Defer] Payment-mode validation error always attaches to the `allowsPerSession` checkbox [src/app/(admin)/admin/ekskul/ekskul-actions.tsx] — `path: ['allowsPerSession']` means disabling only `allowsMonthly` surfaces the error on the *other* toggle. Minor UX attribution, not a logic bug. Deferred to Epic 4 UI refresh.
- [x] [Review][Defer] `maxPlayers` input uses `Number.parseInt(e.target.value) || 0` (no radix, clear→0) [src/app/(admin)/admin/ekskul/ekskul-actions.tsx] — inconsistent with the fee fields' cleaner `''→undefined` + radix-10 pattern; `min(2)` still blocks the bad value at submit. Cosmetic and pre-existing (field pre-dates Epic 2). Deferred.

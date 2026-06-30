# Addendum — Technical Notes for Downstream Work

Companion to `prd.md`. Holds the technical-how, file inventory, migration mechanics, and rejected-alternative rationale that the PRD intentionally keeps out of its main narrative. Feeds UX / architecture / implementation. Audit and decision history live in `.memlog.md`, not here.

## A. Rebrand surface inventory (verified 2026-06-30)

"badminton" appears in **77 occurrences across 19 `src/` files**, plus root/config files. Known touch points:

- **i18n** — `src/lib/i18n/dictionaries.ts` (8 occurrences) — the primary user-facing copy; both `en` and `id` objects must stay in parity.
- **Default brand** — `src/lib/settings.ts` → `DEFAULTS.communityName = 'Xclub Badminton'` (replace with neutral default). `communityAbbr()` JSDoc example references "PB Net-C" (cosmetic).
- **Seed** — `prisma/seed.ts` (neutral seed data; example slug "badminton" is acceptable as *one* activity, not the brand).
- **Pages/routes with "badminton" copy or naming** — sessions (list/detail/new/edit), dashboard, admin (page/sessions/settings/ekskul), onboarding, validations (`src/lib/validations/user.ts`), `src/lib/utils.ts`, and API routes under `api/sessions`, `api/ekskul`. Most are likely variable/label text routed through the dictionary; confirm none are hardcoded.
- **Repo/meta** — `package.json` name `net-c-management`, `README.md`, `CLAUDE.md`. (Repo rename is optional and separable from user-facing rebrand.)

Terminology (confirmed): user-facing label `Ekskul` → **Activity / Aktivitas**. The `Ekskul` *model/table name* stays as-is (only the badminton-named `BadmintonSession` model is renamed — see §C). Default brand confirmed: "Sports Community" (en) / "Komunitas Olahraga" (id). No bundled default logo — fall back to community name + `communityAbbr`; favicon neutral.

## B. Monthly-fee consolidation — migration mechanics

Current fee-related fields:
- `Settings.defaultMonthlyFee` (key-value row; `DEFAULTS` = 50000) — **global** monthly fee. → **REMOVE.**
- `Ekskul.defaultFee` (Int, default 0) — **per-activity** monthly fee. → **single source of truth.**
- `BadmintonSession.fee` (Int) — **per-session** fee. → unchanged, unrelated.
- `Payment.amount` (Int), unique on `(userId, ekskulId, month, year)` — already per-activity, confirming Activity-owned dues.

Implementation outline (for architecture/impl, not PRD):
1. Remove `defaultMonthlyFee` from `AppSettings` interface, `DEFAULTS`, and `getSettings()` in `src/lib/settings.ts`.
2. Remove the monthly-fee field from the General settings UI (`src/app/(admin)/admin/settings/page.tsx`).
3. Audit every read of monthly dues to ensure it sources from `Ekskul.defaultFee` (or the Activity record), never the removed global.
4. Data: delete any `defaultMonthlyFee` Settings row; for Activities currently relying on the implicit 50000 global (i.e. `defaultFee = 0`), decide whether to backfill. **Low risk — pre-launch, no production data** (Open Question 6).
5. Note: `Ekskul.defaultFee` default is `0`; product should make the fee an explicit required input on Activity create/edit so "0" is intentional, not accidental.

## C. Model rename (CHOSEN — FR-6)

`BadmintonSession` models a generic activity session (schema comment: *"Despite its name, this models a generic activity session scoped to an Ekskul. Kept as BadmintonSession to avoid a repo-wide rename."*). The user has now requested the rename, so it is in scope.

- **Chosen:** rename `BadmintonSession → ActivitySession`.
- **Hard constraint:** the name MUST NOT be plain `Session` — NextAuth already defines a `Session` model (lines 73–80 of schema). Use `ActivitySession`.
- **Rejected:** keeping the badminton name (prior plan's choice) — reversed at user request.
- **Affected surface (repo-wide):**
  - `prisma/schema.prisma` — model `BadmintonSession`, its relations (`Ekskul.sessions`, `Attendance.session`), `@@index`.
  - Prisma accessor `prisma.badmintonSession` → `prisma.activitySession` everywhere it's used.
  - API routes under `src/app/api/sessions/**` (and any `ekskul` route touching sessions).
  - TypeScript types/imports referencing `BadmintonSession` from `@prisma/client`.
  - After edit: `npx prisma generate` + `npx prisma db push`, then `npm run lint` + build.
- **Migration:** column/table rename via `prisma db push` (dev, no prod data) — verify no data loss on the rename; pre-launch so risk is low.

## D. Responsive / refresh technical notes

- Stack already supports the refresh: Tailwind v4, shadcn/ui, `next-themes` (dark mode), per-route `loading.tsx` skeletons, Server Components with `*-actions.tsx`/client splits.
- Desktop-first chosen (PRD §4.3). Implement as base desktop layout with `sm:`/`md:` adaptations downward. Confirm exact breakpoints in UX.
- No new UI dependency or design-system swap (PRD FR-10). Refresh = consistency pass within existing components.
- Preserve `isAdminRole()` gates and ekskul-scoped queries (`getUserEkskulIds`) through any layout changes — cross-ekskul data leak is a security regression, not a cosmetic one.

## E. Default brand (CONFIRMED)

- en: **"Sports Community"** · id: **"Komunitas Olahraga"** (replace `DEFAULTS.communityName = 'Xclub Badminton'`).
- No bundled default logo image: un-configured Community falls back to name + `communityAbbr` output; favicon neutral/generic.
- Verify `communityAbbr("Sports Community")` → "SC" and `communityAbbr("Komunitas Olahraga")` → "KO" render acceptably.

## F. Payment modes — data model (PRD §4.2/§4.3)

New capability: each Activity offers monthly-only / per-session-only / both; member picks from the offered set. This is the largest data-model change in the PRD; details for architecture, not the PRD body.

**Activity (`Ekskul`) — fields:**
- `defaultFee` (existing, Int) — repurpose as the **Monthly Fee** (rename to `monthlyFee` for clarity, optional).
- **`sessionFee`** (new, Int) — per-Activity default **Session Fee**; `ActivitySession.fee` defaults from it, overridable per Session.
- **allowed modes** (new) — either an enum set or two booleans `allowsMonthly` / `allowsPerSession` (at least one true). Booleans are simplest with Prisma.

**Membership — field:**
- **`paymentMode`** (new, enum `MONTHLY | PER_SESSION`) — the Member's chosen mode for that Activity. If members may switch month-to-month (Open Question 2), this likely needs to be per-period rather than a single column — decide in architecture. Simplest v1: one column on `Membership`, changeable, applies going forward.

**Payment — model change (the hard part):**
- Today: `Payment` unique `(userId, ekskulId, month, year)` — strictly monthly.
- Per-session needs payment tied to a Session. Options:
  1. Add nullable `sessionId` + a `type` (`MONTHLY | SESSION`) to `Payment`; relax constraints to two partial-unique shapes (monthly: one per user/ekskul/month/year; session: one per user/session). **Recommended** — single model, reuses proofUrl/status/confirm flow.
  2. Separate `SessionPayment` model. Cleaner separation, more surface to build.
- Either way, reuse the existing manual flow: `proofUrl`/`proofPath` upload → `PaymentStatus` PENDING/CONFIRMED/REJECTED → `confirmedBy`/`confirmedAt`. **No payment gateway** (PRD Non-Goal).

**Flow impact:**
- Admin Activity edit form: add Session Fee + allowed-mode toggles (PRD FR-8, FR-9).
- Member join / Activity view: mode selector when both allowed (FR-10).
- Per-session billing hangs off Session registration/Attendance (FR-12) — confirm whether a charge is created on register vs on attend (Open Question 3).
- `npx prisma generate` + `npx prisma db push` after schema edits; pre-launch so migration risk is low.

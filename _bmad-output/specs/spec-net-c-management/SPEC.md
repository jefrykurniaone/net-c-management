---
id: SPEC-net-c-management
companions:
  # adopted — binding, written by upstream skills; downstream MUST read alongside this SPEC
  - ../../planning-artifacts/architecture/architecture-net-c-management-2026-06-30/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-net-c-management-2026-06-30/DESIGN.md
  - ../../project-context.md
sources:
  # fully absorbed into this SPEC — audit/traceability only; downstream does NOT read these
  - ../../planning-artifacts/prds/prd-net-c-management-2026-06-30/prd.md
  - ../../planning-artifacts/prds/prd-net-c-management-2026-06-30/addendum.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# net-c-management — Activity-Agnostic Rebrand, Member Payment Modes & UI/UX Refresh

## Why

This is a pre-launch productization pass. The app ships dressed as a single badminton club ("PB Net-C") even though the engine underneath is already multi-sport (the `Ekskul`/Activity model with per-activity sessions and payments). Before go-live — no live users, payments, or production data — three forces converge: a **vision to realize** (a neutral, brandable platform any sport community can adopt and name as its own), an **opportunity to capture** (per-Activity monthly *and* per-session payment flexibility real communities need), and a **pain to remove** (inconsistent UI, broken mobile layouts, and a monthly fee that can be set in two places). Affected: Admins/Owners who configure and run a community, and Members — predominantly on phones — who pick how they pay and check what they owe. Every trade-off here resolves toward a clean, configurable, brand-neutral platform shipped before launch, not toward new product surface.

## Capabilities

- **CAP-1 — Activity-agnostic rebrand**
  - **intent:** An Admin/Owner runs the platform under their own community identity with no sport baked in, so any sport community can adopt and name it.
  - **success:** A fresh deployment with no Settings shows neutral defaults ("Sports Community" / "Komunitas Olahraga"); an audit finds zero badminton or "PB Net-C / Net-C" strings in any user-facing surface (chrome, title, metadata, `dictionaries.ts` en+id); the "Ekskul" label reads "Activity" / "Aktivitas"; setting a custom community name updates header, title, and derived abbreviation everywhere; each Activity's own name + color/icon identifies its Session and Payment rows. (FR-1..5, SM-1)

- **CAP-2 — `ActivitySession` codebase rename**
  - **intent:** The codebase carries no sport in its identifiers so the session model name matches the neutral platform.
  - **success:** `BadmintonSession` is renamed to `ActivitySession` (a distinct name from NextAuth's `Session`) with accessor `prisma.activitySession`, relations, `src/app/api/sessions/**` routes, and `@prisma/client` type imports updated; no model, type, or route identifier contains "badminton"; build and `npm run lint` pass with no behavioral regression; the rename lands before the payment-mode data model. (FR-6, SM-1, AD-9)

- **CAP-3 — Per-Activity fee & payment-mode configuration (Admin)**
  - **intent:** An Admin sets, per Activity and in one place, a monthly fee, a per-session fee, and which payment modes the Activity offers.
  - **success:** The Activity create/edit form exposes a monthly fee, a session fee, and independent Monthly / Per-Session toggles (at least one enabled, enforced in schema and route); the global/General monthly-fee setting no longer exists in the data model or UI; every read of monthly dues sources from the Activity; a new Session inherits the Activity's session fee and an Admin may override it per Session. (FR-7..9, SM-2)

- **CAP-4 — Member payment-mode selection & billing**
  - **intent:** A Member chooses, per Activity, how they pay from the modes that Activity offers, and is billed accordingly.
  - **success:** If the Activity offers both modes the Member is prompted to choose, else the single offered mode applies automatically (selection limited to what the Activity offers); Monthly bills one flat fee per Activity per month/year regardless of attendance; Per-Session secures a slot only after a proof upload that atomically creates a PENDING per-session Payment (amount = the Session's fee, computed server-side) plus a REGISTERED Attendance; an Admin reject or a Member cancel releases the slot; per-session payment reuses the existing proof-upload + Admin-confirm flow. (FR-10..12, SM-3)

- **CAP-5 — UI/UX refresh, full responsiveness & Settings IA cleanup**
  - **intent:** Every Member and Admin/Owner screen renders cleanly and consistently from desktop down to phone, with each setting in exactly one obvious home.
  - **success:** Dashboard, Sessions (list + detail), Payments (list + upload), Profile, Onboarding, and all Admin screens show no broken layout, clipped content, or horizontal scroll at representative desktop / tablet / phone widths; member screens are fully mobile-usable (not merely shrunk); shared shadcn components are reused (no duplicate bespoke implementations) and dark mode works on every refreshed screen; community identity lives under General settings while all fees and mode config live under the Activity, with no setting appearing twice and no orphaned fields. (FR-13..15, SM-4, SM-5)

## Constraints

- All state changes go through Route Handlers under `src/app/api/**`. Server Components and `src/lib` helpers are read-only; do **not** introduce Next.js Server Actions; `src/lib` never imports from `src/app`. (AD-1)
- Activity (ekskul) data scoping is a **security** invariant: member reads are ekskul-scoped (`getUserEkskulIds`), member mutations gated by `assertMembership`; any new member-scoped query MUST be ekskul-scoped; Admin/Owner (`isAdminRole`) see all. (AD-3)
- Every Route Handler enforces `auth()` → 401, `isAdminRole(role)` → 403 for admin mutations (never compare `role === 'ADMIN'`; OWNER must pass), `zod.safeParse` → 400 `{ error, details }`. Protected page access is guarded **twice** — the `proxy.ts` matcher and the route-group `layout.tsx`. (AD-2)
- `Payment` is the **single** money model: extend it with `type` (MONTHLY|SESSION) + nullable `sessionId`; do not create a separate session-payment model. SESSION rows derive `month`/`year` from the session date, take the session's `ekskulId`, and compute `amount` server-side — never trusted from the client. Uniqueness is mode-partitioned. (AD-4, AD-5)
- The Activity (`Ekskul`) is the **single source** for all money config (`monthlyFee`, `sessionFee`, `allowsMonthly`/`allowsPerSession` — at least one true). The global `Settings.defaultMonthlyFee` is removed and the Activity fee is explicit-required (no silent `0`). `Payment.amount` snapshots the fee at charge creation; later fee edits never rewrite existing charges. (AD-8)
- `Membership` owns the member's payment mode, resolved as a **function of the billing period**; a switch sets `effectiveFrom` = the *next* period and never changes how the current period resolves (current period immutable); mode is never inferred from payments. (AD-7)
- Per-session billing is **pre-pay-on-register and atomic**: a single `prisma.$transaction` creates the PENDING SESSION `Payment` and the REGISTERED `Attendance` together (Supabase proof upload happens first; an orphaned storage object on rollback is accepted pre-launch). Capacity authority is the `Attendance` count; the free attendance route rejects per-session members. (AD-6, AD-14)
- The `BadmintonSession → ActivitySession` rename lands **before** the payment-mode data model — both touch the Session/Payment models. (AD-9)
- No new UI dependency or design system: reuse shadcn/ui + Tailwind v4 + `next-themes`. Layout is **desktop-first**, but member screens must be **fully mobile-usable**. Visual tokens are inherited from the UX companion (binding): accent Deep Teal `#0F766E` light / `#2DD4BF` dark, WCAG 2.2 AA, standard Tailwind breakpoints; dark mode verified on every refreshed screen. (AD-11)
- Brand and Activity identity is **data, never hardcoded**; all user-facing strings route through `i18n/dictionaries.ts` with en/id parity. (AD-10)
- Schema evolves via `npx prisma generate` + `npx prisma db push` (no migration files, pre-launch); the monthly partial-unique index is applied out-of-band via raw SQL. (AD-12)
- Money is integer Rupiah, no decimals. Auth, roles, and Activity-scoped data visibility are **not** changed — the existing security model is preserved.
- The full invariant ruleset (AD-1..AD-14), consistency conventions, stack versions, and ER/flow diagrams are **binding** and live in the architecture companion — read it alongside this SPEC.

## Non-goals

- Not building multi-sport capability — it already exists; this work refreshes naming, presentation, payment, and layout only.
- No automated/online payment gateway — payment stays manual proof-upload + Admin confirmation, reused for per-session billing.
- No full visual redesign and no new design system / component-library swap.
- Not multi-tenant — a single global Community identity per deployment.
- No change to auth, roles, or Activity-scoped data visibility.
- No mobile-first re-optimization — desktop-first is the chosen strategy.
- No new product features beyond rebrand, payment modes, and UI/UX refresh.
- No fee data backfill or migration-file workflow (pre-launch, no production data).
- Repo/package rename (`net-c-management`, README) is optional and separable — out of scope here.

## Success signal

A fresh deployment configured only with a community name and one Activity presents as a neutral multi-sport platform — zero badminton or "PB Net-C" strings in UI or code identifiers, build and lint green. An Admin sets that Activity's monthly and per-session fees in one place (General settings exposes no fee field), and a Member of an Activity offering both modes picks Per-Session, registers for a session by uploading proof, and that single transaction yields a PENDING per-session Payment (amount = the server-computed session fee) plus a REGISTERED attendance holding the slot — while the monthly path still bills a flat fee per month. Every member and admin screen renders without breakage or horizontal scroll from desktop down to phone, dark mode included.

## Assumptions

- `Membership` payment-mode v1 is stored as `paymentMode` + `effectiveFrom (YYYYMM)` with a pending value; a richer effective-dated child record is deferred. (AD-7)
- A Member may switch payment mode between periods, taking effect the next period — resolves PRD Open Question 2. (AD-7)
- `Ekskul.defaultFee → monthlyFee` rename is optional/cosmetic; the single-source invariant holds under either name. (AD-8)
- Responsive breakpoints follow the standard Tailwind scale (sm/md/lg/xl). (FR-13)

## Open Questions

- Confirm per-session slots are secured at proof upload (Payment PENDING), not at Admin confirmation — the architecture assumed this per the UX spine. (AD-6)
- Desktop-first was chosen, but Members are predominantly phone-based — revisit before launch? (PRD Open Question 1)

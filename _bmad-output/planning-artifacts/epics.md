---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-net-c-management-2026-06-30/prd.md
  - _bmad-output/planning-artifacts/prds/prd-net-c-management-2026-06-30/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-net-c-management-2026-06-30/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-net-c-management-2026-06-30/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-net-c-management-2026-06-30/EXPERIENCE.md
  - _bmad-output/specs/spec-net-c-management/SPEC.md
  - _bmad-output/project-context.md
---

# net-c-management - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for net-c-management, decomposing the requirements from the PRD, UX Design, Architecture, and SPEC into implementable stories. This is a **brownfield** pre-launch productization pass over an existing Next.js 16 codebase — no greenfield scaffold; no production data. Three tracks: activity-agnostic rebrand, per-Activity fees + member payment modes, and a UI/UX refresh.

## Requirements Inventory

### Functional Requirements

**Feature 4.1 — Activity-Agnostic Rebrand**
- **FR-1: Sport-neutral default branding** — Ship activity-agnostic default branding. Default `communityName` = "Sports Community" (en) / "Komunitas Olahraga" (id), replacing "Xclub Badminton". A fresh deployment with no Settings shows no sport-specific words in chrome (header, title, metadata).
- **FR-2: No single-sport copy in user-facing strings** — Zero badminton-specific user-facing strings in `dictionaries.ts` (en+id); the "Ekskul" label reads "Activity" / "Aktivitas" throughout; en/id parity preserved; nothing hardcoded (all routes through the dictionary).
- **FR-3: Platform identity, not "PB Net-C"** — Browser tab title and metadata reflect the neutral Platform identity; no "PB Net-C" / "Net-C" string visible in any surface; no bundled default logo ships (fall back to name + `communityAbbr`); neutral favicon.
- **FR-4: Community identity stays configurable** — Admin/Owner sets Community name and logo; setting a custom name updates header, title, and derived abbreviation across all pages; abbreviation derivation works for arbitrary multi-word and single-word names.
- **FR-5: Per-Activity identity shown consistently** — Each Activity's name, icon, color, and logo surface wherever its Sessions and Payments are listed; a Session/Payment row visually identifies its Activity (name + color/icon); Activity-scoped Member visibility preserved.
- **FR-6: Activity-agnostic codebase naming** — Rename `BadmintonSession → ActivitySession` (distinct from NextAuth `Session`): accessor `prisma.activitySession`, relations (`Attendance`), API routes, TS types updated; no model/type/route identifier contains "badminton"; build and lint pass; no behavioral regression.

**Feature 4.2 — Activity Fee & Payment-Mode Configuration (Admin)**
- **FR-7: Monthly Fee is single source of truth (per Activity)** — Monthly Fee defined only on the Activity; the global default monthly-fee setting no longer exists in data model or UI; every read of monthly dues sources from the Activity.
- **FR-8: Per-session price per Activity** — Admin sets a Session Fee on the Activity; the Activity create/edit form exposes a per-session price field; a new Session inherits the Activity's Session Fee by default and may be overridden per Session.
- **FR-9: Allowed Payment Modes per Activity** — Admin enables/disables Monthly and Per-Session independently (at least one enabled); Members can only select a mode the Activity offers.

**Feature 4.3 — Member Payment-Mode Selection & Billing**
- **FR-10: Member selects a Payment Mode from the offered set** — If both modes offered, Member is prompted to choose; if one, it auto-applies; selected mode visible to Member and Admins; a Member may change their mode month-to-month per Activity (effective next period).
- **FR-11: Monthly-mode billing** — Member owes one flat Monthly Fee per month per Activity, regardless of attendance; amount equals the Activity's current Monthly Fee; monthly records remain keyed per Member/Activity/month/year (no regression).
- **FR-12: Per-session-mode billing** — Member owes the Session Fee for each Session registered/attended; registering creates a per-session charge equal to that Session's fee; Member sees per-Session owed amount + status; Admins confirm per-session payments via the existing proof flow.

**Feature 4.4 — UI/UX Refresh & Full Responsiveness**
- **FR-13: Every screen is responsive, desktop-first** — All Member and Admin/Owner screens render/function across desktop, tablet, mobile widths with no broken layout, clipped content, or horizontal scroll; member screens fully mobile-usable (not merely shrunk); admin screens optimized desktop-first; interactive targets usable at mobile widths (standard Tailwind breakpoints).
- **FR-14: Consistent visual language (refresh, not redesign)** — Spacing, typography, button/card/table usage, and empty/loading states consistent across screens (shared components reused, not re-implemented); dark mode + theming work on every refreshed screen; no new heavyweight UI dependency or design system.
- **FR-15: Settings information architecture cleanup** — Community identity (name, logo, location, WhatsApp) lives under General settings; all fees + Payment-Mode config live under the Activity; no setting appears in two places; no orphaned/dead fields after fee consolidation.

### NonFunctional Requirements

- **NFR-1 (Security — data scoping):** Activity (ekskul) data scoping is a security invariant. Member reads scoped by `getUserEkskulIds(userId)`; member mutations gated by `assertMembership(userId, ekskulId)`. Any new member-scoped query (including per-session/payment) MUST be ekskul-scoped; Admin/Owner (`isAdminRole`) see all. Cross-ekskul leak = security regression. (AD-3, SM-C2)
- **NFR-2 (Security — auth/authz contract):** Every Route Handler: `await auth()` → 401 if no `session.user.id`; `isAdminRole(role)` → 403 for admin-only mutations (never compare `role === 'ADMIN'`; OWNER must pass); `zod.safeParse(body)` → 400 `{ error, details }`. Page access guarded twice — `proxy.ts` matcher AND route-group `layout.tsx`. New protected routes update both. (AD-2)
- **NFR-3 (Reliability — money integrity):** A money write touching >1 row runs in a single `prisma.$transaction`; `Payment.amount` is computed server-side and never trusted from the client; `Payment.amount` snapshots the applicable fee at charge creation (later fee edits never rewrite existing charges). Supabase storage upload happens before the DB transaction; an orphaned storage object on rollback is accepted pre-launch (no compensation job in v1). (AD-4, AD-8, AD-14)
- **NFR-4 (Accessibility):** WCAG 2.2 AA. Every payment/session state conveyed by text + icon, never color alone; amounts/counts/statuses screen-reader legible; tap targets ≥44px on member surfaces; visible focus ring on all interactives; labeled form fields with inline validation tied via `aria-describedby`; tables announce headers and mobile card fallback preserves data + order; dark mode contrast verified on every screen. (UX EXPERIENCE; SM-5)
- **NFR-5 (Responsiveness / counter-metric):** Member surfaces fully usable on phone — no horizontal scroll, no pinch-zoom, tap targets ≥44px. Desktop-first base; adapt downward with `sm:`/`md:`. **Do not degrade desktop density/clarity to serve mobile (SM-C1).** Breakpoints = Tailwind defaults sm 640 / md 768 / lg 1024 / xl 1280; member content `max-w-2xl`; admin tables collapse to stacked cards under `md`.
- **NFR-6 (i18n):** All user-facing strings via `i18n/dictionaries.ts` with en/id parity; locale from `NEXT_LOCALE` cookie, resolved server-side; zod schemas dictionary-aware (`buildXSchema(t)`, never inline error strings); type tolerates longer Indonesian strings (no fixed-width labels / meaning-hiding truncation). (AD-10, NFR i18n)
- **NFR-7 (Maintainability / code quality):** Functions ≤ 40 lines · files ≤ 300 lines · nesting ≤ 3 (early return) · no magic numbers (named consts) · naming conventions (camelCase/PascalCase/SCREAMING_SNAKE_CASE/kebab-case; booleans `is`/`has`/`should`); ESLint (next core-web-vitals + ts) passes via pre-commit hook. No automated tests exist. (project-context, AD conventions)
- **NFR-8 (No regression / counter-metric):** No regression in existing flows — monthly Payments, Sessions, Attendance, memberships, Activity-scoped visibility, auth. The rename and per-session billing must not break the working monthly path. (SM-C2)

### Additional Requirements

_Starter template: **NONE** — brownfield. Existing Next.js 16 codebase; no greenfield scaffold. Epic 1 is not project bootstrap — it is the rename + schema substrate that all later work builds on._

**Sequencing / architecture invariants**
- **AR-1 (Rename first):** `BadmintonSession → ActivitySession` rename lands **before** the payment-mode data model — both touch the Session/Payment models. (AD-9, FR-6)
- **AR-2 (Single mutation boundary):** Every state change goes through a Route Handler under `src/app/api/**`. Server Components + `src/lib` helpers are read-only; do NOT introduce Server Actions; `src/lib` never imports from `src/app`. (AD-1)
- **AR-3 (Single money model):** Extend `Payment` with `type PaymentType` (MONTHLY|SESSION) + nullable `sessionId` (FK → ActivitySession). Do NOT create a separate session-payment model. SESSION rows: derive `month`/`year` from `ActivitySession.date`, take the session's `ekskulId`, compute `amount` server-side; reuse `proofUrl`/`proofPath`/`status`/`confirmedBy`/`confirmedAt`. (AD-4)
- **AR-4 (Mode-partitioned uniqueness):** Drop unconditional `@@unique([userId, ekskulId, month, year])`. SESSION rows → native `@@unique([userId, sessionId])`, written via `prisma.payment.upsert`. MONTHLY rows → partial unique `(userId, ekskulId, month, year) WHERE type='MONTHLY'` via raw SQL, written via transactional insert-or-update (NOT `upsert`). Existing monthly upload upsert migrates to this pattern. (AD-5)
- **AR-5 (Pre-pay-on-register, atomic):** For PER_SESSION members, the payment upload route — after Supabase proof upload — creates the SESSION Payment (PENDING) AND the REGISTERED Attendance in ONE `prisma.$transaction`. Slot secured at proof upload, not admin-confirm. Free `POST /api/sessions/[id]/attendance` rejects per-session members. Capacity authority = Attendance count (REGISTERED/PRESENT). REJECTED payment (admin PATCH) or member cancel (attendance DELETE) releases the seat. (AD-6, AD-14)
- **AR-6 (Membership owns mode, period-resolved):** Mode lives on `Membership` (`PaymentMode` enum MONTHLY|PER_SESSION), never inferred from payments. v1 shape: `paymentMode` + `effectiveFrom (YYYYMM)` with a pending value. Effective mode is a function of the billing period; a switch sets `effectiveFrom` = next period and never changes the current period (current period immutable). (AD-7)
- **AR-7 (Activity owns money config):** Activity (`Ekskul`) is single source: `monthlyFee` (repurpose `defaultFee`), new `sessionFee`, `allowsMonthly` + `allowsPerSession` booleans (≥1 true, enforced in zod + route). Remove `Settings.defaultMonthlyFee` entirely (interface, DEFAULTS, getSettings, General settings UI). Activity fee is explicit-required (no silent 0). Mode-disable is not retroactive. (AD-8)
- **AR-8 (Billing-period primitive):** A billing period is the calendar pair `month` (1–12) + `year` (int). Every mode resolution, monthly-dues key, and SESSION month/year derivation uses this one definition. (AD-13)
- **AR-9 (Schema evolution):** Schema changes via `npx prisma generate` + `npx prisma db push` (no migration files, pre-launch). Monthly partial-unique index applied out-of-band via raw SQL (`prisma db execute`). No fee backfill needed; accidental-0 handled by explicit-required fee. New enums: `PaymentType {MONTHLY, SESSION}`, `PaymentMode {MONTHLY, PER_SESSION}` — import from `@prisma/client`, never string literals. (AD-12)
- **AR-10 (Storage):** Uploads only via `src/lib/supabase.ts` service-role helpers (server-only, bypass RLS). Buckets `payment-proofs`/`avatars`/`logos`; never expose `SUPABASE_SERVICE_ROLE_KEY`. Money is integer Rupiah, no decimals. (conventions)
- **AR-11 (Rebrand surface):** "badminton" appears in 77 occurrences across 19 `src/` files plus root/config. Touch points: `dictionaries.ts` (8), `settings.ts` DEFAULTS.communityName, seed, pages/routes (sessions, dashboard, admin, onboarding, validations, utils), API routes. Replace `DEFAULTS.communityName = 'Xclub Badminton'` with neutral default; confirm none hardcoded. Repo/package rename optional + separable. (addendum A/E)

### UX Design Requirements

**Design tokens (brand-layer delta on shadcn defaults)**
- **UX-DR1: Primary accent token** — Deep Teal `#0F766E` light / `#2DD4BF` dark (foregrounds white / `#09090B`). Replaces shadcn `primary`; used on primary buttons, active nav, focus affordances, links. Single platform accent — no second brand color, no chrome theming in a brand hue.
- **UX-DR2: Payment-state semantic tokens** — `success` `#16A34A`/`#4ADE80` (CONFIRMED only), `warning` `#B45309`/`#FBBF24` (PENDING + unpaid banner); REJECTED reuses shadcn `destructive` (no custom red). Money colors used ONLY for payment state. All other tokens inherit shadcn.
- **UX-DR3: Numeric typography role** — `tabular-nums`, weight 600, on every money amount, attendance count, capacity figure, and stat-card value (align in tables; precise in cards).

**Brand-layer / product components**
- **UX-DR4: Activity badge** — icon chip (Activity `icon`) + Activity `name` tinted with runtime `{activity.color}`; foreground auto-selected (black/white) for AA contrast over the configured color; appears wherever an Activity is named. (FR-5)
- **UX-DR5: Activity accent bar** — 3px left border in `{activity.color}` on every Session row and Payment row; cross-Activity distinguisher paired with the badge. (FR-5)
- **UX-DR6: Payment status badge** — shadcn Badge in PENDING/CONFIRMED/REJECTED; color AND text label always together (never color-only); REJECTED reveals admin note.
- **UX-DR7: Unpaid banner** — full-width `warning` banner on member Dashboard/Payments when dues outstanding; states amount (numeric) + primary CTA to pay; clears only when paid+confirmed, not on dismiss.
- **UX-DR8: Stat card** — shadcn card + label + numeric value; admin dashboard (Total Members, Active Members, Pending Payments, Confirmed/month) + member dashboard (attendance rate, session count); links to underlying list.
- **UX-DR9: Community identity mark** — configured logo if set, else circular `communityAbbr` token in `primary` on `muted`; never a placeholder graphic.
- **UX-DR10: Payment-mode selector** — segmented control / radio cards "Monthly" vs "Per-Session" showing each fee; shown only when Activity offers both; persists + echoes selection; auto-applies + states mode if one offered; changeable later from Activity view (effective next period; small history shown). (FR-10)
- **UX-DR11: Proof uploader** — image picker (camera/library on phone) + amount field prefilled (owed amount for Monthly, session fee for Per-Session); submit disabled until both present; optimistic "uploading…" → "awaiting confirmation". `[ASSUMPTION: proof-amount prefill]`
- **UX-DR12: Confirm/reject action (admin)** — confirm = one tap; reject requires a note (reason); both write `confirmedBy`/`confirmedAt`; destructive styling on reject.
- **UX-DR13: Members table** — search by name/email (debounced) + status filter + pagination + attendance column; desktop table → mobile stacked cards (same fields, same order); not infinite scroll.
- **UX-DR14: Activity edit form** — Monthly Fee + Session Fee both explicit required inputs (no silent 0); mode toggles enforce ≥1 enabled; identity fields (name/icon/color/logo). (FR-8, FR-9)
- **UX-DR15: Session row/card** — Activity accent bar + badge; tap opens detail; status + register CTA; full → CTA disabled with reason; Per-Session CTA reads "Register & pay" (slot secured only after proof upload).

**Shells, states, responsiveness, a11y, copy**
- **UX-DR16: Two app shells** — member shell (top bar + bottom/sheet nav, single column `max-w-2xl`) and admin shell (sidebar nav + wide content); sidebar → sheet on mobile. Both built on shadcn primitives.
- **UX-DR17: State patterns** — cold load = shadcn `Skeleton` matching shape; empty states (no sessions / no dues / no Activities, with admin create variant); proof pending (PENDING badge, no re-upload until resolved); proof rejected (destructive badge + note + "upload again"); per-session register-unpaid / registered-pending / session-full states; offline/submit-fail = `sonner` destructive toast with input retained; optimistic where safe (attendance toggle), pending state on money actions (no false-confirm).
- **UX-DR18: Responsive matrix** — `< md`: member single column + full-width cards + bottom nav/sheet, admin tables → stacked cards + sidebar→sheet; `md–lg`: member two-up where space allows, admin condensed table + sidebar visible; `≥ lg`: member centered `max-w-2xl`, admin full-width tables + persistent sidebar + dense stat grid.
- **UX-DR19: Accessibility floor** — implements NFR-4 (WCAG 2.2 AA): text+icon state, screen-reader-legible amounts/statuses, ≥44px targets, focus ring, labeled fields + `aria-describedby`, table header announcement + card-fallback parity, `lang` follows `NEXT_LOCALE`, dark-mode contrast verified every screen.
- **UX-DR20: i18n length tolerance** — no fixed-width labels / meaning-hiding truncation; wrap or `min-w-0` + ellipsis with title attribute to tolerate longer Indonesian strings.
- **UX-DR21: Onboarding flow** — first login → guard redirects to `/onboarding` until `isProfileComplete`; profile form usable on phone; route by role on finish (member dashboard or admin shell), landing inside the product.
- **UX-DR22: Microcopy / voice** — plain, calm, money-honest; money copy always names the amount, the Activity, and the period/session; bilingual via `dictionaries.ts`; "Ekskul" surfaces as "Activity / Aktivitas".

### FR Coverage Map

- **FR-1:** Epic 1 — Sport-neutral default branding
- **FR-2:** Epic 1 — No single-sport copy in user-facing strings (Ekskul → Activity/Aktivitas)
- **FR-3:** Epic 1 — Platform identity, not "PB Net-C" (title, metadata, neutral favicon, no bundled logo)
- **FR-4:** Epic 1 — Community identity stays configurable (name/logo → header/title/abbr)
- **FR-5:** Epic 1 — Per-Activity identity shown consistently on Session/Payment rows
- **FR-6:** Epic 2 — Activity-agnostic codebase naming (BadmintonSession → ActivitySession)
- **FR-7:** Epic 2 — Monthly Fee single source of truth per Activity (remove global default)
- **FR-8:** Epic 2 — Per-session price per Activity (Session inherits, overridable)
- **FR-9:** Epic 2 — Allowed Payment Modes per Activity (≥1, independent toggles)
- **FR-10:** Epic 3 — Member selects a Payment Mode from the offered set
- **FR-11:** Epic 3 — Monthly-mode billing (flat fee per month per Activity)
- **FR-12:** Epic 3 — Per-session-mode billing (pre-pay-on-register, per Session)
- **FR-13:** Epic 4 — Every screen responsive, desktop-first, member-mobile-usable
- **FR-14:** Epic 4 — Consistent visual language (refresh, not redesign; dark mode)
- **FR-15:** Epic 4 — Settings information architecture cleanup (one home per setting)

## Epic List

### Epic 1: Activity-Agnostic Rebrand & Identity
Owner/Admin runs the platform under their own neutral community identity — a fresh deployment shows sport-neutral defaults, zero badminton / "PB Net-C" copy appears in any user-facing surface, the "Ekskul" label reads "Activity / Aktivitas", a configured community name/logo propagates everywhere, and each Activity's own name/color/icon marks its Session and Payment rows. Low-risk, independent track (i18n + settings defaults + chrome). Governed by AD-10.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5

### Epic 2: Payment Foundation — Rename + Per-Activity Fee & Mode Config (Admin)
An Admin configures, per Activity and in exactly one place, a monthly fee, a session fee, and which payment modes the Activity offers (≥1 enabled) — and the legacy global monthly fee is removed. This epic also carries the schema substrate the billing epic builds on: its first story is the `BadmintonSession → ActivitySession` rename (the mandated prerequisite — it lands and is lint/build-verified before any payment-mode schema change). High-risk schema work is isolated here. Governed by AD-9, AD-8, AD-2, AD-12.
**FRs covered:** FR-6, FR-7, FR-8, FR-9

### Epic 3: Member Payment-Mode Selection & Billing
A Member chooses, per Activity, how they pay from the modes that Activity offers, and is billed accordingly: Monthly bills one flat fee per Activity per month regardless of attendance; Per-Session secures a slot only after a proof upload that atomically creates a PENDING per-session Payment (amount computed server-side) plus a REGISTERED Attendance, with admin reject / member cancel releasing the slot. Reuses the existing proof-upload + Admin-confirm flow. Highest-risk flow logic. Depends on Epic 2 (rename + Activity fees/modes). Governed by AD-3, AD-4, AD-5, AD-6, AD-7, AD-13, AD-14.
**FRs covered:** FR-10, FR-11, FR-12

### Epic 4: UI/UX Refresh, Responsiveness & Settings IA
Every Member and Admin/Owner screen renders cleanly and consistently from desktop down to phone (dark mode included), shared shadcn components are reused rather than re-implemented, and each setting has exactly one obvious home (community identity under General settings, all fees/mode config under the Activity). Cross-cutting polish over all surfaces including the new payment UI from Epic 3; desktop-first base with member surfaces fully mobile-usable. Lands last so it refreshes finished screens. Governed by AD-11, AD-8 (fee IA).
**FRs covered:** FR-13, FR-14, FR-15

## Epic 1: Activity-Agnostic Rebrand & Identity

Owner/Admin runs the platform under their own neutral community identity — a fresh deployment shows sport-neutral defaults, zero badminton / "PB Net-C" copy appears in any user-facing surface, the "Ekskul" label reads "Activity / Aktivitas", a configured community name/logo propagates everywhere, and each Activity's own name/color/icon marks its Session and Payment rows.

### Story 1.1: Neutral platform defaults & chrome identity

As an Admin/Owner deploying a fresh instance,
I want the platform to ship with sport-neutral defaults and identity in its chrome,
So that no sport or "PB Net-C" branding is baked in before I configure my own community.

**Acceptance Criteria:**

**Given** a fresh deployment with no `Settings` configured
**When** any page loads
**Then** the default community name renders as "Sports Community" (en) / "Komunitas Olahraga" (id), replacing "Xclub Badminton"
**And** `DEFAULTS.communityName` in `src/lib/settings.ts` holds the neutral value, sourced through the i18n dictionary.

**Given** no community logo is configured
**When** the identity mark renders
**Then** it falls back to the community name + derived `communityAbbr()` token (never a bundled default logo image or broken-image placeholder).

**Given** any user-facing chrome (browser tab title, document `<title>`, metadata, favicon)
**When** inspected on a fresh deployment
**Then** it reflects a neutral platform identity with no "PB Net-C", "Net-C", or badminton-specific string, and the favicon is neutral/generic.

**Given** the SM-1 audit
**When** chrome (header, title, metadata) is scanned with no Settings configured
**Then** zero sport-specific words appear anywhere in chrome.

### Story 1.2: Sport-neutral i18n copy & Ekskul → Activity relabel

As a Member or Admin in either language,
I want all user-facing copy to be sport-neutral and the "Ekskul" label to read "Activity / Aktivitas",
So that the app reads as a generic multi-sport platform in both English and Indonesian.

**Acceptance Criteria:**

**Given** `src/lib/i18n/dictionaries.ts` (both `en` and `id` objects)
**When** audited
**Then** zero badminton-specific user-facing strings remain — generic wording or the Activity's own name is used instead.

**Given** any surface that previously showed "Ekskul"
**When** rendered
**Then** the user-facing label reads "Activity" (en) / "Aktivitas" (id), while the underlying `Ekskul` model/table name is unchanged.

**Given** the bilingual dictionary
**When** keys are compared
**Then** en/id parity is preserved (every key exists in both) and no user-facing string is hardcoded outside the dictionary.

**Given** longer Indonesian strings
**When** they render in labels/badges
**Then** they wrap or use `min-w-0` + ellipsis with a title attribute — no fixed-width clipping that hides meaning (UX-DR20).

### Story 1.3: Configurable community identity propagation

As an Owner,
I want the community name and logo I set in Settings to appear everywhere,
So that the platform reads as my community's own.

**Acceptance Criteria:**

**Given** an Owner sets a custom community name in General Settings
**When** they navigate the app
**Then** the header, document title, and derived abbreviation reflect that name across all member and admin pages.

**Given** an Owner uploads a community logo
**When** the identity mark renders
**Then** the configured logo is shown; if none is set, a circular `communityAbbr` token renders in `{colors.primary}` on `muted` (UX-DR9).

**Given** arbitrary community names
**When** `communityAbbr()` derives an abbreviation
**Then** it produces a sensible result for multi-word names (e.g. "Sports Community" → "SC", "Komunitas Olahraga" → "KO") and single-word names alike.

**Given** logo upload
**When** stored
**Then** it goes through the `src/lib/supabase.ts` service-role helper into the `logos` bucket (server-only), never exposing the service-role key (AR-10).

### Story 1.4: Per-Activity identity on Session & Payment rows

As a Member or Admin viewing lists,
I want each Session and Payment row to visually carry its Activity's own name, color, and icon,
So that I can tell which Activity a row belongs to at a glance.

**Acceptance Criteria:**

**Given** any Session row or Payment row
**When** it renders
**Then** an Activity badge (icon chip + Activity name tinted with the Activity's runtime color) and a 3px left accent bar in the Activity color identify the row (UX-DR4, UX-DR5, FR-5).

**Given** an Activity's configured color
**When** the badge renders text/foreground over it
**Then** the foreground is auto-selected (black/white) to meet WCAG 2.2 AA contrast over that arbitrary color (UX-DR4, NFR-4).

**Given** a Member viewing Sessions or Payments
**When** rows are queried
**Then** they see only Activities they belong to — the query stays ekskul-scoped via `getUserEkskulIds` (NFR-1 / AD-3); Admin/Owner see all.

**Given** a cross-Activity list
**When** displayed
**Then** rows from different Activities stay visually distinguishable (badge + accent bar), never an undifferentiated stack.

## Epic 2: Payment Foundation — Rename + Per-Activity Fee & Mode Config (Admin)

An Admin configures, per Activity and in exactly one place, a monthly fee, a session fee, and which payment modes the Activity offers (≥1 enabled), and the legacy global monthly fee is removed. The epic's first story is the `BadmintonSession → ActivitySession` rename — the mandated prerequisite that lands and is lint/build-verified before any payment-mode schema change, since the payment work touches the same Session/Payment models.

### Story 2.1: Rename BadmintonSession → ActivitySession

As a developer,
I want the session model renamed from `BadmintonSession` to `ActivitySession` across the whole codebase,
So that no identifier encodes "badminton" and the payment-mode work has a stable, neutrally-named base.

**Acceptance Criteria:**

**Given** `prisma/schema.prisma`
**When** the model is renamed
**Then** model `BadmintonSession` becomes `ActivitySession` (NOT plain `Session` — NextAuth's `Session` model already exists), with its relations (`Ekskul.sessions`, `Attendance.session`) and `@@index` updated.

**Given** all consuming code
**When** the rename propagates
**Then** the Prisma accessor is `prisma.activitySession` everywhere, `src/app/api/sessions/**` routes and any `ekskul` route touching sessions are updated, and `@prisma/client` type imports referencing the old name are updated.

**Given** the renamed schema
**When** `npx prisma generate` + `npx prisma db push` run (dev, no prod data)
**Then** the column/table rename applies with no data loss.

**Given** the full codebase after the rename
**When** searched
**Then** no model, type, or route identifier contains "badminton"; `npm run lint` and the build pass; existing Session/Attendance behavior is unchanged (NFR-8 no regression).

### Story 2.2: Admin configures Activity fees & payment modes

As an Admin,
I want to set an Activity's monthly fee, session fee, and which payment modes it offers,
So that each Activity owns its own money configuration in one place.

**Acceptance Criteria:**

**Given** `prisma/schema.prisma`
**When** the Activity (`Ekskul`) model is extended
**Then** it carries `monthlyFee` (the consolidated monthly dues — repurpose existing `defaultFee`), a new `sessionFee` (Int), and `allowsMonthly` + `allowsPerSession` booleans, applied via `npx prisma generate` + `npx prisma db push` (AD-8, AD-12).

**Given** the Activity create/edit form
**When** an Admin opens it
**Then** it exposes Monthly Fee and Session Fee as **explicit required inputs** (the form refuses a silent 0) plus independent Monthly / Per-Session toggles, alongside identity fields (name/icon/color/logo) (UX-DR14, FR-8, FR-9).

**Given** an Admin disables both payment modes
**When** they attempt to save
**Then** save is blocked with "Enable at least one payment mode" — the ≥1-enabled rule is enforced in the dict-aware zod schema **and** the Route Handler, not the UI alone (FR-9, AD-8).

**Given** a write to `/api/ekskul`
**When** the request is handled
**Then** it follows the auth contract: `await auth()` → 401, `isAdminRole(role)` → 403 (OWNER passes; never `role === 'ADMIN'`), `zod.safeParse` → 400 `{ error, details }` (NFR-2, AD-2).

### Story 2.3: Remove global monthly fee — Activity is single source of truth

As an Admin,
I want the global default monthly fee gone so fees live only on Activities,
So that there is exactly one place a monthly fee can be set or be wrong.

**Acceptance Criteria:**

**Given** `src/lib/settings.ts`
**When** the global fee is removed
**Then** `defaultMonthlyFee` is gone from the `AppSettings` interface, from `DEFAULTS`, and from `getSettings()`, and any `defaultMonthlyFee` Settings row is deleted (pre-launch, no backfill — AR-9).

**Given** the General Settings UI (`src/app/(admin)/admin/settings/page.tsx`)
**When** rendered
**Then** it exposes no monthly-fee field; no fee field appears anywhere in Settings (SM-2, FR-7).

**Given** every code path that reads a Member's monthly dues
**When** audited
**Then** each one sources the amount from the Activity (`Ekskul.monthlyFee`), never the removed global; existing monthly Payment behavior is otherwise unchanged (NFR-8).

### Story 2.4: Session fee inheritance & per-session override

As an Admin creating or editing a Session,
I want a new Session to default its fee from its Activity but let me override it,
So that I set per-session prices once on the Activity yet can adjust an individual Session.

**Acceptance Criteria:**

**Given** an Admin creates a new Session under an Activity
**When** the create form loads
**Then** the Session's fee (`ActivitySession.fee`) defaults from that Activity's `sessionFee` (FR-8).

**Given** an Admin editing a Session
**When** they set a different fee
**Then** that Session persists its own overriding fee, independent of the Activity default, via the auth-gated `/api/sessions` route (AD-2).

**Given** a later change to the Activity's `sessionFee`
**When** existing Sessions are viewed
**Then** already-created Sessions keep their stored fee (no retroactive rewrite); only newly created Sessions inherit the new default (consistent with the AD-8 snapshot principle).

## Epic 3: Member Payment-Mode Selection & Billing

A Member chooses, per Activity, how they pay from the modes that Activity offers, and is billed accordingly: Monthly bills one flat fee per Activity per month regardless of attendance; Per-Session secures a slot only after a proof upload that atomically creates a PENDING per-session Payment (amount computed server-side) plus a REGISTERED Attendance, with admin reject / member cancel releasing the slot. Reuses the existing proof-upload + Admin-confirm flow. Depends on Epic 2 (rename + Activity fees/modes). Governed by AD-3, AD-4, AD-5, AD-6, AD-7, AD-13, AD-14.

### Story 3.1: Membership payment-mode data model & period resolution

As a developer,
I want the member's payment mode stored on `Membership` and resolved as a function of the billing period,
So that mode is never inferred from past payments and a mid-period switch can never rewrite what the current period owes.

**Acceptance Criteria:**

**Given** `prisma/schema.prisma`
**When** the `Membership` model is extended
**Then** it carries `paymentMode` (`PaymentMode` enum `MONTHLY | PER_SESSION`) plus an `effectiveFrom` (`YYYYMM` int) and a nullable pending value for a queued switch, applied via `npx prisma generate` + `npx prisma db push`; the enum is imported from `@prisma/client`, never a string literal (AD-7, AD-12).

**Given** a server-only helper `resolvePaymentMode(membership, month, year)` in `src/lib`
**When** it is called for a billing period (AD-13 calendar `month` 1–12 + `year`)
**Then** it returns the effective mode for that exact period — the pending/`effectiveFrom` value applies only from its period forward, and any period at or before the current one resolves to the unchanged current mode (current period immutable).

**Given** a member with no explicit mode on an Activity that offers exactly one mode
**When** the mode is resolved
**Then** the helper returns that single offered mode (auto-applied), never null; an Activity offering both with no member selection yet resolves to an explicit "unselected" state the caller can prompt on (no silent default).

**Given** the data layer for mode
**When** a member-scoped read or write touches `Membership.paymentMode`
**Then** it stays ekskul-scoped — reads via `getUserEkskulIds(userId)`, writes gated by `assertMembership(userId, ekskulId)`; Admin/Owner (`isAdminRole`) see all (NFR-1, AD-3).

### Story 3.2: Payment model extension & mode-partitioned uniqueness

As a developer,
I want `Payment` extended to carry monthly and per-session charges with mode-partitioned uniqueness,
So that a second per-session charge in a month is never blocked and every billing path writes payments the same, race-free way.

**Acceptance Criteria:**

**Given** `prisma/schema.prisma`
**When** `Payment` is extended
**Then** it gains `type` (`PaymentType` enum `MONTHLY | SESSION`) and a nullable `sessionId` FK → `ActivitySession`; no separate session-payment model is created; SESSION rows reuse the existing `proofUrl`/`proofPath`/`status`/`confirmedBy`/`confirmedAt` columns (AD-4); enums imported from `@prisma/client`.

**Given** the legacy `@@unique([userId, ekskulId, month, year])`
**When** the schema is migrated
**Then** that unconditional unique is dropped; SESSION rows are constrained by native `@@unique([userId, sessionId])`, and MONTHLY rows by a **partial** unique index `(userId, ekskulId, month, year) WHERE type = 'MONTHLY'` applied out-of-band via raw SQL (`prisma db execute`), since `db push` cannot express a filtered unique (AD-5, AD-12).

**Given** the existing monthly proof-upload upsert
**When** it is migrated to the new model
**Then** MONTHLY rows are written via a **transactional insert-or-update** (`INSERT … ON CONFLICT … DO UPDATE` / guarded `$transaction`) — never `prisma.payment.upsert`, which cannot target a partial index — and SESSION rows are written via `prisma.payment.upsert` on `(userId, sessionId)` (AD-5).

**Given** a SESSION `Payment` row
**When** it is created
**Then** its `month`/`year` are derived from `ActivitySession.date`, its `ekskulId` equals the session's `ekskulId`, and its `amount` is computed server-side from the session fee and never trusted from the client — so existing `?month=`/`?year=` filters and admin stats include per-session payments and AD-3 scoping stays uniform (AD-4, AD-2).

**Given** the existing monthly Payment flow after migration
**When** a monthly proof is uploaded and confirmed
**Then** behavior is unchanged for members (one monthly row per member/Activity/month/year, same proof→confirm) — no regression (NFR-8).

### Story 3.3: Member selects a Payment Mode from the offered set

As a Member,
I want to choose how I pay for an Activity from the modes it offers and change it for a future period,
So that I control whether I'm billed monthly or per session without affecting what I already owe.

**Acceptance Criteria:**

**Given** an Activity that offers both Monthly and Per-Session
**When** the Member opens the Activity's payment-mode selector
**Then** a segmented control / radio-card pair "Monthly" vs "Per-Session" renders, each showing its fee (Monthly Fee, Session Fee) with `tabular-nums`; the Member must choose before billing applies (UX-DR10, UX-DR3, FR-10).

**Given** an Activity that offers exactly one mode
**When** the Member views it
**Then** that mode is auto-applied and stated (no selector prompt); the Member cannot pick a mode the Activity does not offer (FR-9, FR-10).

**Given** a Member changes their mode
**When** they confirm the change
**Then** it is persisted via an auth-gated, ekskul-scoped Route Handler under `src/app/api/**` (`await auth()` → 401, `assertMembership` for the ekskul, `zod.safeParse` → 400 `{ error, details }`), takes effect from the **next** billing period (`effectiveFrom`), and never alters the current period; a small mode history / "effective next period" note is shown (UX-DR10, AD-7, AD-2, AD-3).

**Given** the selected mode
**When** the Member or an Admin/Owner views the membership
**Then** the current effective mode is visible to both; Admins see every member's mode, members see only their own Activities (AD-3).

### Story 3.4: Monthly-mode billing

As a Member on Monthly mode,
I want to owe one flat monthly fee per Activity regardless of how many sessions I attend,
So that my dues are predictable and sourced from the Activity's current fee.

**Acceptance Criteria:**

**Given** a Member whose effective mode for the period is `MONTHLY` (resolved per Story 3.1)
**When** monthly dues are computed for that Activity
**Then** the amount owed equals the Activity's current `Ekskul.monthlyFee` — one flat charge per Member per Activity per month, independent of attendance count (FR-11, AD-8).

**Given** a monthly charge is created
**When** the `Payment` row is written
**Then** it is keyed per Member/Activity/`month`/`year` (AD-13) via the transactional insert-or-update + partial unique from Story 3.2, with `type = MONTHLY` and `sessionId = null`; `amount` snapshots the fee at creation so a later `monthlyFee` edit never rewrites it (AD-5, AD-8 snapshot rule).

**Given** a Member only has a per-session effective mode for an Activity
**When** monthly dues are computed
**Then** no monthly charge is raised for that Activity (mode gates billing); switching to Monthly applies from the next period only (AD-7).

**Given** the existing monthly proof-upload + admin-confirm flow
**When** a Monthly member pays
**Then** it works exactly as before (upload proof → PENDING → admin confirm → CONFIRMED) with no regression (NFR-8), the owed amount sourced from the Activity not the removed global default (FR-7).

**Given** the monthly proof uploader
**When** a Monthly member opens it
**Then** it presents an image picker (camera/library on phone) with the amount field prefilled to the owed monthly amount, submit disabled until image + amount are both present, and an optimistic "uploading…" → "awaiting confirmation" transition (UX-DR11).

**Given** any money copy on the monthly billing surfaces
**When** it renders
**Then** it is plain, calm, and money-honest — naming the amount, the Activity, and the period — and is bilingual via `i18n/dictionaries.ts` (en/id parity), never hardcoded (UX-DR22, NFR-6).

### Story 3.5: Per-session-mode billing — pre-pay-on-register (atomic)

As a Member on Per-Session mode,
I want registering for a session to secure my slot only after I upload payment proof,
So that a slot is never held for free and my charge matches that session's fee.

**Acceptance Criteria:**

**Given** a Member whose effective mode for the session's period is `PER_SESSION`
**When** they register via the payment upload route
**Then** after a successful Supabase proof upload, the route creates the SESSION `Payment` (`PENDING`, `amount` computed server-side from the session's fee) **and** the `REGISTERED` `Attendance` together in **one** `prisma.$transaction`; the slot is secured at proof upload (`Payment ≥ PENDING`), not at admin confirmation (FR-12, AD-6, AD-14).

**Given** the free `POST /api/sessions/[id]/attendance` route
**When** a Per-Session-mode member calls it
**Then** it is rejected (payment-required); only `MONTHLY`-mode members register free there — capacity is never held without a charge (AD-6).

**Given** session capacity
**When** it is evaluated anywhere
**Then** the single authority is the `Attendance` count (`REGISTERED`/`PRESENT`); a payment alone never holds a seat (they are created atomically), and a full session disables the register CTA with a reason (UX-DR15, AD-6).

**Given** an admin `PATCH /api/payments/[id]` rejects a per-session payment, or the member cancels via attendance `DELETE`
**When** the action commits
**Then** the paired `Attendance` is removed and the seat released; admin reject requires a note, both write `confirmedBy`/`confirmedAt` (UX-DR12, AD-6).

**Given** the proof transaction fails
**When** it rolls back
**Then** neither the `Payment` nor the `Attendance` persists (no half-write); the already-uploaded Supabase object is left orphaned and accepted pre-launch — no compensation job in v1 (AD-14, NFR-3).

**Given** a Per-Session register surface
**When** the Member views a Session row/card
**Then** the CTA reads "Register & pay", the per-Session owed amount + status are shown, and states cover register-unpaid / registered-pending / session-full (UX-DR15, UX-DR17, NFR-4 text+icon).

**Given** the per-session proof uploader on the register-&-pay flow
**When** a Per-Session member opens it
**Then** it presents an image picker (camera/library on phone) with the amount field prefilled to that Session's fee, submit disabled until image + amount are both present, and an optimistic "uploading…" → "awaiting confirmation" transition (UX-DR11).

## Epic 4: UI/UX Refresh, Responsiveness & Settings IA

Every Member and Admin/Owner screen renders cleanly and consistently from desktop down to phone (dark mode included), shared shadcn components are reused rather than re-implemented, and each setting has exactly one obvious home (community identity under General settings, all fees/mode config under the Activity). Cross-cutting polish over all surfaces including the new payment UI from Epic 3; desktop-first base with member surfaces fully mobile-usable. Lands last so it refreshes finished screens. Governed by AD-11, AD-8 (fee IA).

### Story 4.1: Two responsive app shells & navigation

As a Member or Admin/Owner on any device,
I want a shell and navigation that fits my role and screen,
So that I can move through the app on a phone or a desktop without a broken or cramped layout.

**Acceptance Criteria:**

**Given** a Member viewing any `(main)` page
**When** the shell renders
**Then** it is a member shell — top bar + bottom/sheet nav, single column centered at `max-w-2xl` — built on shadcn primitives, with no new UI dependency or design system introduced (UX-DR16, AD-11).

**Given** an Admin/Owner viewing any `(admin)` page
**When** the shell renders
**Then** it is an admin shell — sidebar nav + wide content on `≥ lg`, the sidebar collapsing to a sheet under `md` — built on the same shadcn primitives (UX-DR16, UX-DR18).

**Given** the navigation at each breakpoint
**When** the viewport crosses `md`/`lg` (Tailwind defaults sm 640 / md 768 / lg 1024 / xl 1280)
**Then** member bottom nav/sheet and admin sidebar→sheet switch as specified by the responsive matrix, with every nav target ≥44px and reachable by keyboard with a visible focus ring (UX-DR18, UX-DR19, NFR-5).

**Given** the existing routes and auth guards
**When** the shells are applied
**Then** route grouping and the twice-enforced access guards (`proxy.ts` matcher + route-group `layout.tsx`) are unchanged — this is presentation only, no mutation or auth behavior changes (NFR-8, AD-2).

### Story 4.2: Full responsiveness across every screen

As a Member primarily on a phone, and an Admin primarily on desktop,
I want every screen to render and function at my screen width,
So that nothing is clipped, horizontally scrolling, or unusable on my device.

**Acceptance Criteria:**

**Given** any Member or Admin/Owner screen
**When** rendered at desktop, tablet, and mobile widths
**Then** there is no broken layout, clipped content, or horizontal scroll, and interactive targets remain usable (≥44px on member surfaces) at mobile width (FR-13, NFR-5).

**Given** an admin data table (members, payments, sessions)
**When** the viewport is under `md`
**Then** it collapses to stacked cards carrying the **same fields in the same order** as the table columns, preserving data and reading order (UX-DR13, UX-DR18, NFR-4 card-fallback parity).

**Given** member content
**When** viewed on `≥ lg`
**Then** it stays centered at `max-w-2xl` (not stretched full-width), while admin content uses full-width tables + persistent sidebar + dense stat grid (UX-DR18).

**Given** desktop density and clarity
**When** responsive adaptations are added (`sm:`/`md:` downward from a desktop-first base)
**Then** the desktop layout is **not** degraded to serve mobile — desktop information density is preserved (NFR-5 counter-metric, AD-11).

**Given** the onboarding flow
**When** a first-login user lands on it
**Then** the `/onboarding` guard holds them there until `isProfileComplete`, the profile form is fully usable on a phone (≥44px targets, no clipping), and on finish they are routed by role into the product (member dashboard or admin shell) (UX-DR21, NFR-5).

### Story 4.3: Consistent visual language, shared components & dark mode

As any user,
I want a consistent look and reused components across every screen,
So that the app feels like one product and works identically in light and dark mode.

**Acceptance Criteria:**

**Given** spacing, typography, and the button/card/table usage across screens
**When** the refresh is applied
**Then** they are consistent screen-to-screen via shared shadcn components reused (not re-implemented per page), and every money amount / count / capacity / stat value uses `tabular-nums` weight 600 (FR-14, UX-DR3).

**Given** the recurring UI patterns
**When** screens are refreshed
**Then** shared components cover the payment status badge (color **and** text label, never color-only — UX-DR6), the unpaid banner (UX-DR7), stat cards (UX-DR8), the community identity mark (UX-DR9), and the semantic payment-state tokens (`success` CONFIRMED-only, `warning` PENDING/unpaid, `destructive` REJECTED — UX-DR2) with the Deep Teal accent as the single platform accent (UX-DR1).

**Given** cold load, empty, pending, rejected, and submit-fail conditions
**When** any refreshed screen reaches them
**Then** the state patterns render — shadcn `Skeleton` matching shape, role-appropriate empty states (with admin create variant), PENDING/REJECTED proof states, and `sonner` destructive toast on submit-fail with input retained (UX-DR17).

**Given** dark mode + theming via `next-themes`
**When** every refreshed screen is viewed in dark mode
**Then** it works and contrast is verified to WCAG 2.2 AA on each screen; no new heavyweight UI dependency or design system is added (FR-14, UX-DR19, AD-11).

### Story 4.4: Settings information architecture cleanup

As an Admin/Owner,
I want each setting to live in exactly one obvious place,
So that no fee or identity field is duplicated, orphaned, or wrong in two homes.

**Acceptance Criteria:**

**Given** General Settings
**When** an Admin/Owner opens it
**Then** it holds community identity only — name, logo, location, WhatsApp — and no fee or payment-mode field appears there (FR-15, AD-8).

**Given** Activity (Ekskul) configuration
**When** an Admin/Owner opens it
**Then** all money config — Monthly Fee, Session Fee, allowed-mode toggles — lives there and only there (FR-15, AD-8, consistent with Story 2.2 / 2.3).

**Given** the full settings surface after fee consolidation
**When** audited
**Then** no setting appears in two places and there are no orphaned or dead fields left behind by the removed global `defaultMonthlyFee` (FR-15, SM-2, NFR-8).

**Given** the refreshed Settings screens
**When** viewed across breakpoints and in dark mode
**Then** they meet the same responsiveness, shared-component, and accessibility bars as Stories 4.1–4.3 (FR-13, FR-14, NFR-4).

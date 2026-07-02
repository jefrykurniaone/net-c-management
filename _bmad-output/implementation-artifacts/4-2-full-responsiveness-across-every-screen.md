---
baseline_commit: 37d9e34cee0fff54a8dc237e752ef79421630582
---

# Story 4.2: Full responsiveness across every screen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Member primarily on a phone, and an Admin primarily on desktop,
I want every screen to render and function at my screen width,
so that nothing is clipped, horizontally scrolling, or unusable on my device.

**Epic:** Epic 4 — UI/UX Refresh, Responsiveness & Settings IA
**FRs:** FR-13 (every screen responsive, desktop-first, member surfaces mobile-usable) — this story delivers the **page-content responsiveness** slice of it (Story 4.1 delivered the shell/nav slice).
**Governed by:** UX-DR13 (desktop table → mobile stacked cards, same fields/order), UX-DR18 (responsive matrix: `< md` admin tables→stacked cards; member centered `max-w-2xl` at `≥ lg`; admin full-width tables + dense stat grid), NFR-4 (a11y: ≥44px targets on member surfaces, card-fallback parity preserves data + order), NFR-5 (desktop-first, member fully mobile-usable, **no horizontal scroll**, do **not** degrade desktop density), AD-11 (refresh not redesign — reuse shadcn, no new dependency), NFR-8 + AD-2 (presentation only — no route/guard/mutation/data change).

## Acceptance Criteria

1. **No broken layout / clip / horizontal scroll on any screen; member tap targets ≥44px.**
   **Given** any Member or Admin/Owner screen,
   **When** rendered at desktop (`≥ lg`), tablet (`md–lg`), and mobile (`< md`) widths,
   **Then** there is **no broken layout, no clipped content, and no horizontal scroll** at the page level, and interactive targets remain usable — **≥44px on member surfaces** (`min-h-11`) at mobile width (FR-13, NFR-5, NFR-4).

2. **Admin data tables collapse to stacked cards under `md`, same fields in same order.**
   **Given** an admin data table (**members, payments, sessions, and activities/ekskul**),
   **When** the viewport is under `md`,
   **Then** the wide table is hidden and the same rows render as **stacked cards** carrying the **same fields in the same order** as the table columns (header label + value), preserving data and reading order — never a horizontally-scrolling table as the mobile experience (UX-DR13, UX-DR18, NFR-4 card-fallback parity). At `≥ md` the full table renders as today.

3. **Member content stays centered; admin content stays wide.**
   **Given** member content,
   **When** viewed on `≥ lg`,
   **Then** it stays centered (the member shell's `max-w-2xl` from Story 4.1 is honored — page content does **not** add a wider `max-w-*` that overrides it and does **not** stretch full-width); admin content uses **full-width** tables + dense stat grid and its tables are **not** clamped to a narrow `max-w-*` (UX-DR18).

4. **Desktop density is not degraded to serve mobile.**
   **Given** desktop density and clarity,
   **When** responsive adaptations are added (`sm:`/`md:`/`lg:` *downward* from a desktop-first base),
   **Then** the desktop layout is **not** degraded — desktop information density (full multi-column tables, multi-up stat/breakdown grids) is preserved; the mobile card fallback is an addition gated by `md:hidden`, not a replacement of the desktop table (NFR-5 counter-metric, AD-11).

5. **Onboarding is fully usable on a phone and routes by role on finish.**
   **Given** the onboarding flow,
   **When** a first-login user lands on it,
   **Then** the `/onboarding` guard holds them there until `isProfileComplete` (unchanged), the profile form is **fully usable on a phone** — inputs and the activity-select chips are ≥44px tappable, no clipping, no horizontal scroll — and **on finish they are routed by role** into the product (member dashboard or, for admins, they can reach the admin shell) (UX-DR21, NFR-5). Routing/guard behavior itself is unchanged (NFR-8).

6. **Presentation only — no route/guard/mutation/data change; lint + build green.**
   **Given** the existing routes, `proxy.ts` matcher, both route-group `layout.tsx` guards, all Route Handlers, and all data queries,
   **When** the responsiveness fixes are applied,
   **Then** they are **unchanged** — this story adds **zero** mutations, API routes, Server Actions, schema/query changes, or auth/authz changes; every existing member and admin flow still works (NFR-8, AD-2); `npm run lint` and `npm run build` pass (NFR-7).

## Tasks / Subtasks

> **Method:** desktop-first audit-and-fix across every screen. For each screen: verify at `< md` / `md–lg` / `≥ lg` by construction; fix only responsiveness (layout/overflow/tap-target/table-collapse). **Do not** restyle colors, swap accent tokens, touch dark-mode contrast, or move settings — those are Stories 4.3 / 4.4. Keep the existing `green-*` / `purple-*` / `yellow-*` classes verbatim.

- [x] **Task 1 — Shared responsive table→cards pattern (AC: 2, 4)**
  - [x] The four admin tables (`members`, `payments`, `sessions`, `ekskul`) each hand-roll a `<div className="overflow-x-auto"><table>…` with **no** mobile fallback — under `md` they horizontal-scroll (the exact anti-pattern UX-DR13 forbids). Establish **one** consistent pattern and apply it to all four; do not invent four different solutions (DRY, AD-11).
  - [x] **Pattern (recommended):** keep the existing `<table>` but wrap the scroll container in **`hidden md:block`** (table shows only `≥ md`), and add a sibling **`md:hidden space-y-3`** list of **cards** rendering the *same fields in the same column order* (label + value per field, using the **same `t.admin.col*` / `t.ekskul.label` dict keys** the `<th>`s use — no new i18n needed). The `overflow-x-auto` stays on the desktop table only (it's a safety net at `md–lg`, never the mobile UX).
  - [x] **Respect the 300-line cap (NFR-7):** `members/page.tsx` (~207) and `payments/page.tsx` (~204) will exceed 300 if the card markup is inlined. Extract each table's **mobile card list** into a small colocated component — e.g. `src/app/(admin)/admin/members/member-cards.tsx`, `.../payments/payment-cards.tsx`, `.../sessions/session-cards.tsx`, `.../ekskul/ekskul-cards.tsx` — that takes the already-fetched, already-typed rows as props (server components; no new data fetch, no client boundary unless the row already needs one). Reuse `EkskulBadge`, `Badge`, `paymentStatusVariant`/`sessionStatusVariant`, `PaymentActions`/`MemberActions`/`EkskulActions`/session action links **verbatim** — the actions must remain reachable in the card variant.
  - [x] Each card must carry **every** column's data (parity): e.g. payments card = member (name+email) + activity badge + month/year + amount (`tabular-nums`, right-aligned or labeled) + status badge + date + actions; members card = avatar+name+email + activity badges + attendance count + payments count + role/status badges + actions; sessions card = title + activity badge + date/time + location + participants `x/max` + status + detail/edit/CSV actions; ekskul card = badge + slug + members count + fee + active status + actions. Keep the **3px activity accent bar** where the table row has one (payments, sessions).

- [x] **Task 2 — Admin members screen responsiveness (AC: 1, 2, 4)** — `src/app/(admin)/admin/members/page.tsx`
  - [x] Apply the Task 1 pattern: `hidden md:block` table + `md:hidden` `<MemberCards>`.
  - [x] The search/filter `<form className="flex flex-wrap gap-2">` already wraps; verify on a `< sm` phone the text input (`w-full max-w-sm`), the ekskul `<select>`, and the search button stack without overflow. Make the `<select>` and button not force a horizontal scroll (allow them to wrap full-width on the narrowest width). Do not change the GET-form behavior.

- [x] **Task 3 — Admin payments screen responsiveness (AC: 1, 2, 4)** — `src/app/(admin)/admin/payments/page.tsx`
  - [x] Apply the Task 1 pattern: `hidden md:block` table + `md:hidden` `<PaymentCards>` (preserve the accent bar + `tabular-nums` amount).
  - [x] The filter `<form className="flex flex-wrap gap-3">` has **four** `<select>`s + a submit button. Verify they wrap cleanly at `< md`; ensure none overflow the viewport. Keep the CSV export link reachable (header uses `flex … flex-wrap gap-3` already — confirm it wraps under the title on a phone).

- [x] **Task 4 — Admin sessions screen responsiveness (AC: 1, 2, 4)** — `src/app/(admin)/admin/sessions/page.tsx`
  - [x] Apply the Task 1 pattern: `hidden md:block` table + `md:hidden` `<SessionCards>` (preserve accent bar; keep the `truncate`d title + `EkskulBadge`).
  - [x] The header `flex items-center justify-between` holds the title block + (EkskulFilter + New-Session button). At `< sm` this can crowd — allow it to wrap (`flex-wrap gap-3`) so the New button/filter drop below the title without clipping. The three per-row action links (Detail / Edit / CSV) must stay tappable in the card variant.

- [x] **Task 5 — Admin activities (ekskul) screen responsiveness (AC: 1, 2, 4)** — `src/app/(admin)/admin/ekskul/page.tsx`
  - [x] Apply the Task 1 pattern: `hidden md:block` table + `md:hidden` `<EkskulCards>`. The `<EkskulActions>` (Edit + Activate/Deactivate buttons) and the description `truncate` must survive the card layout.
  - [x] The `<EkskulFormDialog>` (`ekskul-actions.tsx`) is already `max-h-[90vh] overflow-y-auto sm:max-w-md` — confirm it's usable full-height on a phone; the internal `grid grid-cols-2 gap-4` fee pair is acceptable on mobile (two short number inputs) — leave unless it clips.

- [x] **Task 6 — Onboarding responsiveness + tap targets (AC: 1, 5)** — `src/app/onboarding/page.tsx`
  - [x] The activity-select chips are `px-3 py-1.5` (~32px tall — **under 44px**). Bump to a ≥44px tap target (`min-h-11` + adequate `px`) while keeping the wrap (`flex flex-wrap gap-2`) and the selected/`style={{backgroundColor}}` treatment. This is the one member surface with a sub-44px control.
  - [x] The card is `w-full max-w-md` centered with `px-4` gutter and `p-8` padding — verify on a `320px` phone the `p-8` doesn't crowd; reduce to `p-6 sm:p-8` if it clips. Inputs (`@/components/ui/input`) are already full-width. No horizontal scroll. Routing on finish (`router.push('/dashboard')`) is unchanged (AC5/NFR-8).

- [x] **Task 7 — Verify member screens (audit-only unless broken) (AC: 1, 3)**
  - [x] These are already card-based and largely responsive from prior epics — **verify** at all three widths and fix only if a real break exists (do not gratuitously edit):
    - `dashboard/page.tsx` — stat strip `grid-cols-1 sm:grid-cols-3` ✓; per-ekskul session rows use `min-w-0`+`truncate`+`shrink-0` ✓.
    - `sessions/page.tsx`, `payments/page.tsx` — card lists ✓. **Check the payments header** `flex items-center justify-between` (title + filter + Upload button, no wrap) — add `flex-wrap gap-3` if the Upload button crowds the title on a phone.
    - `sessions/[id]/page.tsx` (`max-w-2xl mx-auto`), `payments/upload/page.tsx` + `sessions/[id]/pay/page.tsx` (`max-w-lg mx-auto`) — form/detail, responsive ✓.
    - `profile/page.tsx` + `profile/ekskul-memberships.tsx` + `profile/payment-mode-selector.tsx` — verify the mode selector segmented control and membership list wrap/stack at `< sm` and its controls are ≥44px.
  - [x] **Member `max-w-*` note (AC3):** member pages already sit inside the shell's centered `max-w-2xl`. A page adding its own `max-w-2xl mx-auto` (session detail) or `max-w-lg mx-auto` (uploaders) is fine (narrower or equal — never wider). Do **not** add a `max-w` wider than the shell on a member page.

- [x] **Task 8 — Verify remaining admin screens (audit-only unless broken) (AC: 1, 3, 4)**
  - [x] `admin/page.tsx` (dashboard) — stat grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` ✓ and per-ekskul `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` ✓ (dense grid preserved — AC4). Verify only.
  - [x] `admin/settings/page.tsx` (`max-w-lg`) — form, responsive ✓. Verify only. (Its i18n/IA cleanup is Story 4.4, not here.)
  - [x] `admin/members/[id]/page.tsx` (`max-w-3xl mx-auto`) — reading/detail page (profile + attendance list + payment list), card/flex based ✓. This is an admin **detail** page, not a data table, so `max-w-3xl` is acceptable (AC3 constrains *tables* to full-width, not detail pages). **Do not** convert it or restyle it; the hardcoded Indonesian strings here are pre-existing i18n debt out of scope for 4.2 (leave for a later i18n pass / Story 4.4) — note it, don't fix it.
  - [x] `admin/sessions/new/page.tsx` + `admin/sessions/[id]/edit/edit-form.tsx` — verify any `grid grid-cols-*` for date/time/fee fields carries a responsive prefix (or collapses acceptably) so form fields don't clip on a phone; fix to `grid-cols-1 sm:grid-cols-2` only if a real overflow exists.

- [x] **Task 9 — Verify (NFR-7, NFR-8, NFR-5, AC6)**
  - [x] `npx eslint` on every changed/added file → 0 issues. `npm run build` → green (types + full route table).
  - [x] Manual responsive/regression pass per "Testing standards" below: each admin list shows a **table `≥ md`** and **stacked cards `< md`** with field parity; no horizontal scroll anywhere at `320/375/768/1024/1280`; member surfaces ≥44px targets; `proxy.ts` / guards / routes / mutations untouched; both light + dark still render (no *new* dark-mode regressions — full dark-mode contrast audit is Story 4.3).

### Review Findings

- [x] [Review][Decision] `ekskul-memberships.tsx` refresh/error-handling rewrite is undocumented scope creep — `fetchMemberships()` now returns `null` on fetch failure (was `[]`) and `refresh()` is rewritten `async` to `toast.error(t.common.error)` on a failed re-fetch after a successful join/leave. This is a client-side data-handling/UX logic change unrelated to responsiveness/layout, not mentioned in this story's Task list, Dev Notes, or Completion Notes, and outside the declared scope ("this story only changes layout/overflow/tap-targets/table-collapse"). [`src/app/(main)/profile/ekskul-memberships.tsx:1059-1099`] — **Resolution: kept as-is, intentional.** A silent-failure refresh (previous `[]`-on-error behavior) would have hidden a real error from the member after a successful join/leave; surfacing it via `toast.error` is a genuine correctness improvement, not scope creep to revert. Documented here since it wasn't called out in the original Completion Notes.

- [x] [Review][Patch] `MemberRow` in `member-cards.tsx` is a hand-rolled interface instead of a Prisma type intersection, unlike sibling `PaymentRow`/`SessionRow`/`EkskulCardRow` in the same diff (`Payment & {...}`, `ActivitySession & {...}`, `Ekskul & {...}`) — will silently drift if the page's Prisma `select`/`include` changes. [`src/app/(admin)/admin/members/member-cards.tsx:212-221`] — **Fixed:** replaced with `Prisma.UserGetPayload<{ select: {...} }>` matching the fields the card actually uses.
- [x] [Review][Patch] Date-fns locale resolution (`locale === "id" ? localeId : enUS`) is copy-pasted identically in two new files instead of a shared helper, contrary to this story's own DRY/AD-11 framing for Task 1. [`src/app/(admin)/admin/payments/payment-cards.tsx:620-622`, `src/app/(admin)/admin/sessions/session-cards.tsx` top] — **Fixed:** extracted `getDateFnsLocale(locale)` into `src/lib/i18n/locale.ts`; both card files now call it.
- [x] [Review][Patch] `CardField` (the shared mobile-card primitive) has no semantic label/value association (no `dl`/`dt`/`dd` or `aria-` pairing) — a screen-reader user hears a flat list of values instead of the labeled pairs the desktop `<th>/<td>` table provides. [`src/components/admin/mobile-card.tsx` (`CardField`)] — **Fixed:** wrapper now has `role="group"` + `aria-label={label}`, label span is `aria-hidden` to avoid double-announcement.

- [x] [Review][Defer] Avatar-initial fallback `(u.name ?? u.email ?? "?")[0].toUpperCase()` throws if `email` is `""` rather than `null` (`?? ` only short-circuits on `null`/`undefined`) — pre-existing bug in the desktop table (unchanged by this diff), duplicated verbatim into the new `member-cards.tsx` per this story's explicit "reuse verbatim" instruction. [`src/app/(admin)/admin/members/member-cards.tsx:236`, `src/app/(admin)/admin/members/page.tsx` (existing)] — deferred, pre-existing

**Dismissed as noise / verified false / pre-existing-unchanged / out-of-4.2-scope (16):** missing eslint-disable on desktop `<img>` (verified present); `EkskulActions` field-by-field prop reconstruction (mirrors unchanged pre-existing desktop code verbatim); mobile-vs-desktop avatar size (`w-10` vs `w-8`, acceptable mobile-card convention); raw `<img>` missing width/height/lazy/onError (pre-existing pattern, not a regression); card empty-membership placeholder text-size nit; `MobileCard`'s `overflow-hidden` "unbounded text" risk (speculative, no reproduced clipping); dual table+cards always in SSR DOM ("perf regression" — this is the story-mandated CSS-toggle pattern, not a defect); `refresh()`/`pendingId` "stuck" concern (verified incorrect — `finally` always clears it); `refresh()` "throws unexpectedly" (verified incorrect — it cannot throw by construction); unbounded ekskul-badge list in member card (mirrors desktop's identical unbounded rendering); ekskul description `truncate` without explicit `max-w` (works fine in this bounded block container); payment-card locale "silent fallback" (`Locale` is a closed 2-value union, unreachable branch); monthlyFee/amount/month/location/maxPlayers "bad data" edge cases (admin-authored, zod-validated, pre-existing pattern); Badge variant semantic swap (`outline`→`secondary`/`destructive`, `roleBadgeVariant`) — Story 4.3 scope-boundary note, not a 4.2 defect; `EmptyState`/`UnpaidBanner` component swap in `(main)/payments/page.tsx` — Story 4.3/visual-refresh scope-boundary note, not a 4.2 defect; `t.admin.inactive2` odd-looking i18n key name — pre-existing key, reused per this story's "same dict keys" instruction.

## Dev Notes

### What this story changes (READ FIRST)
Story 4.1 split the app into two shells and made **navigation** responsive. It explicitly **deferred page-content responsiveness to this story** (see 4.1 scope boundary: *"page-content responsiveness — admin tables→stacked cards, member two-up, onboarding form (Story 4.2)"*). So 4.2 is the **content** pass:

- **Primary work:** the **four admin data tables** (`members`, `payments`, `sessions`, `ekskul`) currently render `<div className="overflow-x-auto"><table>…` with **no mobile fallback** → they horizontal-scroll on a phone. Give each a `md:hidden` **stacked-card** fallback with same-fields-same-order parity (UX-DR13).
- **Secondary work:** onboarding chip tap-targets (<44px), a couple of headers/filter rows that can crowd on the narrowest widths, and a verify-and-fix-if-broken sweep of every other screen.

This is **presentation only** (AC6, NFR-8): no route, `proxy.ts`, `auth()`/`isAdminRole` guard, Route Handler, Server Action (there are none — AR-2), schema, or query change. It is also **layout-only within the refresh**: the Deep Teal accent-token migration, shared-component visual language, and full dark-mode **contrast audit** are **Story 4.3**; the Settings IA cleanup is **Story 4.4**. **Keep existing color classes verbatim** — do not restyle here.

### Screen inventory (audited — this is the full surface for "every screen")
| Screen | File | State | 4.2 action |
|---|---|---|---|
| Admin members | `(admin)/admin/members/page.tsx` | table, `overflow-x-auto`, no mobile card | **FIX** — table→cards |
| Admin payments | `(admin)/admin/payments/page.tsx` | table, 4 filters, accent bar | **FIX** — table→cards + filter wrap |
| Admin sessions | `(admin)/admin/sessions/page.tsx` | table, accent bar, header actions | **FIX** — table→cards + header wrap |
| Admin activities | `(admin)/admin/ekskul/page.tsx` | table + form dialog | **FIX** — table→cards |
| Onboarding | `onboarding/page.tsx` | centered card form | **FIX** — chip ≥44px, padding |
| Admin dashboard | `(admin)/admin/page.tsx` | responsive stat grid ✓ | verify only |
| Admin settings | `(admin)/admin/settings/page.tsx` | `max-w-lg` form ✓ | verify only |
| Admin member detail | `(admin)/admin/members/[id]/page.tsx` | `max-w-3xl` detail ✓ (i18n debt, not 4.2) | verify only |
| Admin session new/edit | `.../sessions/new/page.tsx`, `.../[id]/edit/edit-form.tsx` | forms | verify grid prefixes |
| Member dashboard | `(main)/dashboard/page.tsx` | card grid ✓ | verify only |
| Member sessions list | `(main)/sessions/page.tsx` | card list ✓ | verify only |
| Member payments list | `(main)/payments/page.tsx` | card list ✓ | verify header wrap |
| Member session detail | `(main)/sessions/[id]/page.tsx` | `max-w-2xl` ✓ | verify only |
| Member monthly upload | `(main)/payments/upload/page.tsx` | `max-w-lg` form ✓ | verify only |
| Member session pay | `(main)/sessions/[id]/pay/page.tsx` | `max-w-lg` form ✓ | verify only |
| Member profile | `(main)/profile/*` | list + selector | verify wrap + ≥44px |
| Auth / root | `auth/*`, `page.tsx` | simple | verify only |

### Files to REUSE — do not reinvent (AD-11: no new dependency)
- **shadcn primitives already installed** (`src/components/ui/`): `card`, `badge`, `button`, `separator`, `avatar`, `select`, `dialog`, `skeleton`, plus a shadcn `table` (`table.tsx`) that the hand-rolled admin tables do **not** use — you may keep the hand-rolled `<table>` (do not migrate to the shadcn `Table` component; that's churn without value here). **Add no dependency, no `shadcn add data-table`, no design system** (AD-11).
- **`EkskulBadge`** (`@/components/ekskul/ekskul-badge`) — the activity chip; reuse in every card. **Accent bar** = `<span aria-hidden className="absolute left-0 top-0 h-full w-[3px]" style={{backgroundColor: …color}} />` on a `relative` parent (already in payments/sessions rows) — replicate on the card variant for those two.
- **Status → badge variant helpers** (`@/lib/utils`): `paymentStatusVariant`, `sessionStatusVariant`, `isAdminRole`. Row-action components already exist and must be reused in cards: `PaymentActions`, `MemberActions`, `EkskulActions`, and the sessions Detail/Edit/CSV `<Link>`/`<a>` trio.
- **i18n:** the mobile cards reuse the **same dict keys** the `<th>` headers use (`t.admin.colName`, `t.admin.colAmount`, `t.admin.colStatus`, `t.ekskul.label`, `t.months[n]`, `t.roles[...]`, `t.sessionStatus[...]`, `t.paymentStatus[...]`, …). **No new i18n keys are expected.** If you add a label, add it to **both** `en` and `id` in `src/lib/i18n/dictionaries.ts` (NFR-6 parity). Never hardcode a user-facing string.
- **Tap-target constant:** ≥44px = `min-h-11` (the convention Story 4.1 established across nav). Reuse it for onboarding chips and any interactive card element on member surfaces.

### Guardrails — what must NOT change (AC6, NFR-8)
- **`src/proxy.ts`** — untouched. **Both layout guards** (`auth()`, `!session?.user → /auth/signin`, `!isProfileComplete → /onboarding`, admin `!isAdminRole → /dashboard`) — untouched. Layouts stay server components.
- **No Server Actions, no new/changed API route, no data mutation, no Prisma query change.** The card variants render the **already-fetched** rows — do not add a second query or change `select`/`include`/`where`/`take`/`orderBy`.
- **Do not change table column semantics** — the mobile card must carry the *same* fields in the *same* order (NFR-4 parity); the desktop table stays exactly as today.
- **Do not restyle** (colors/tokens/dark-mode contrast = Story 4.3) or **move settings** (Story 4.4). This story only changes layout/overflow/tap-targets/table-collapse.
- Keep the member shell's centered `max-w-2xl` authoritative — no member page adds a wider `max-w-*`.

### Responsive matrix target (UX-DR18) — the switch points
| Width | Member content | Admin content |
|---|---|---|
| `< md` (<768) | single column, full-width cards (shell provides bottom nav) | **tables → stacked cards**; stat/breakdown grids single-column |
| `md–lg` (768–1023) | centered content | **tables visible** (may `overflow-x-auto` as safety net), 2-up grids |
| `≥ lg` (≥1024) | centered **`max-w-2xl`** | **full-width tables** + dense stat grid (4-up / 3-up) |

Desktop-first: the `<table>` is the authored base; the card list is an **additive** `md:hidden` fallback. Never delete/degrade the desktop table (NFR-5 counter-metric, AC4).

### Code-quality caps (NFR-7)
Functions ≤ 40 lines · **files ≤ 300 lines** (extract mobile card lists to colocated `*-cards.tsx` to stay under — `members`/`payments` pages will otherwise exceed) · nesting ≤ 3 (early return) · named consts, no magic numbers (`min-h-11` for 44px) · naming (`PascalCase.tsx` components, `camelCase` fns, booleans `is`/`has`/`should`). ESLint (next core-web-vitals + ts) via pre-commit.

### Next.js 16 / project specifics
- Route groups `(main)`/`(admin)` server layouts (Next 16). Do **not** create `middleware.ts` (middleware = `src/proxy.ts`). Read `node_modules/next/dist/docs/` before touching layout/data-fetching shape if unsure.
- Admin list pages are **server components** — the extracted `*-cards.tsx` should also be server components (they render already-fetched data + reuse the existing client action components, which keep their own `'use client'`). Don't add a client boundary you don't need.
- `src/lib` must not import from `src/app` (AR-2). New card components live under `src/app/(admin)/admin/<area>/`.

### Scope boundary
- **In scope:** mobile stacked-card fallback for the 4 admin tables (+ extracted `*-cards.tsx`); onboarding chip ≥44px + padding; header/filter wrap fixes where they crowd; a verify-and-fix-if-broken sweep of every other member/admin/auth screen for clipping/overflow/tap-targets; lint + build green.
- **NOT in scope:** Deep Teal accent-token swap + shared-component visual refresh + dark-mode **contrast audit** (Story 4.3); Settings IA cleanup / dedupe / the `admin/members/[id]` hardcoded-string i18n debt (Story 4.4 / later i18n pass); any `proxy.ts`/route/`auth()`/mutation/query change; any new dependency or shadcn block; migrating hand-rolled tables to the shadcn `Table` component.

### References
- [Source: epics.md#Story 4.2] (lines 509-535) — ACs + FR-13 mapping
- [Source: epics.md#UX-DR13] (line 91) — desktop table → mobile stacked cards (same fields, same order)
- [Source: epics.md#UX-DR18] (line 98) — responsive matrix; admin tables→cards `< md`; member `max-w-2xl` `≥ lg`; admin dense grid
- [Source: epics.md#UX-DR21] (line 101) — onboarding usable on phone, route by role on finish
- [Source: epics.md#NFR-4] (line 51) — a11y: ≥44px targets, table card-fallback parity (data + order)
- [Source: epics.md#NFR-5] (line 52) — desktop-first, member mobile-usable, no horizontal scroll, don't degrade desktop density; Tailwind breakpoints (sm 640 / md 768 / lg 1024 / xl 1280)
- [Source: epics.md#AD-11 / Epic 4 intro] (lines 136-137, 483) — refresh not redesign; reuse shadcn; no new dependency
- [Source: 4-1-two-responsive-app-shells-navigation.md#Scope boundary] — 4.1 explicitly defers page-content responsiveness (tables→cards, onboarding) to 4.2; member shell already clamps `max-w-2xl`
- [Source: src/app/(admin)/admin/members/page.tsx:109-203] — members table (overflow-x-auto, no mobile card) + filter form :82-107
- [Source: src/app/(admin)/admin/payments/page.tsx:82-201] — payments table + 4-select filter + accent bar :155-160
- [Source: src/app/(admin)/admin/sessions/page.tsx:51-188] — sessions table + header actions + accent bar :110-117
- [Source: src/app/(admin)/admin/ekskul/page.tsx:42-146] — ekskul table; actions in ekskul-actions.tsx
- [Source: src/app/onboarding/page.tsx:155-203] — activity chips `px-3 py-1.5` (<44px) + `max-w-md` card :91-92
- [Source: src/app/(admin)/admin/page.tsx:136-204] — admin dashboard responsive stat + per-ekskul grids (pattern to mirror; already ✓)
- [Source: src/app/(main)/dashboard/page.tsx:108-162] — member stat strip `grid-cols-1 sm:grid-cols-3` (already ✓)
- [Source: src/components/ekskul/ekskul-badge.tsx] — activity badge to reuse in every card
- [Source: src/lib/utils.ts] — `paymentStatusVariant`, `sessionStatusVariant`, `isAdminRole`
- [Source: src/lib/i18n/dictionaries.ts] — reuse existing `admin.col*` / `ekskul.label` / `months` / `roles` / `*Status` keys for card field labels (en/id)
- [Source: project-context.md] — Next 16 `proxy.ts`, twice-enforced guards, server-only settings/dictionary, code-quality caps, i18n-through-dictionary, AR-2 (no Server Actions)

### Testing standards
No automated tests in this project. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual responsive/visual checks at **320 / 375 / 768 / 1024 / 1280 px**:
- **Admin lists (members, payments, sessions, ekskul):** `≥ md` shows the full table; `< md` shows stacked cards with **every** column's field present in the **same order**; row actions (confirm/reject, member actions, edit/deactivate, detail/edit/CSV) work in both variants; **no horizontal scroll** at `< md`; accent bar preserved on payments/sessions cards; amounts `tabular-nums`.
- **Onboarding:** on a 320-375px phone the card doesn't clip, the activity chips are ≥44px tappable and wrap, inputs are full-width, submit works and routes to `/dashboard`.
- **Member screens:** dashboard / sessions / payments / session-detail / both uploaders / profile render with no horizontal scroll; content centered (shell `max-w-2xl`), not stretched or wider than the shell; interactive targets ≥44px.
- **Admin screens:** dashboard stat + per-ekskul grids stay dense at `≥ lg` (not degraded — AC4); settings + member-detail readable at all widths.
- **Desktop density (AC4):** at `≥ lg` every admin table is the full multi-column table (card fallback hidden); no desktop layout was narrowed to serve mobile.
- **No regression (NFR-8, AC6):** `proxy.ts` unchanged; both layouts still redirect unauth→`/auth/signin`, incomplete→`/onboarding`, non-admin→`/dashboard`; all routes load; every mutation flow (confirm/reject payment, RSVP, upload proof, mode switch, ekskul CRUD, settings save) still works; sign-out/language/theme still work; both light + dark render (no *new* dark regressions — contrast audit is 4.3).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Claude Code dev-story workflow)

### Debug Log References

- `npm run lint` — 0 issues in all changed/added Story 4.2 files (the 13 errors / 2 warnings reported are pre-existing in unrelated `wds-*.js` / `dev-mode.js` skill scripts, outside this story's scope).
- `npm run build` — ✓ compiled, ✓ TypeScript, all 34 routes generated. Proxy (Middleware) unchanged.

### Completion Notes List

- **Task 1 (shared pattern):** Added one server-side primitive `src/components/admin/mobile-card.tsx` exporting `MobileCard` (card shell + optional 3px activity accent bar), `CardField` (label/value row preserving column order/parity), and `CardListEmpty`. All four admin card lists build on it — one pattern, not four (AD-11/DRY).
- **Tasks 2–5 (four admin tables → cards):** Each admin table wrapped in `hidden md:block`; a sibling `md:hidden` renders a colocated `*-cards.tsx` server component over the **already-fetched, already-typed** rows (no new query — `select`/`include`/`where`/`take`/`orderBy` untouched). Cards carry every column's field in the same order with the same `t.*` dict keys as the `<th>`s (no new i18n). Reused `EkskulBadge`, `Badge`, `paymentStatusVariant`/`sessionStatusVariant`, and `MemberActions`/`PaymentActions`/`EkskulActions` + session Detail/Edit/CSV links verbatim. Accent bar + `tabular-nums` preserved on payments/sessions/ekskul cards. Members & payments filter `<select>`/button go `w-full sm:w-auto` so they stack full-width on the narrowest phones; sessions header got `flex-wrap gap-3`.
- **Task 6 (onboarding):** Activity chips `px-3 py-1.5` (~32px) → `inline-flex min-h-11 items-center px-4` (≥44px, NFR-4); card padding `p-8` → `p-6 sm:p-8`. Routing on finish unchanged.
- **Task 7 (member sweep):** Member payments header got `flex-wrap gap-3` so the Upload button drops below the title on a phone. `PaymentModeSelector` mode cards already ≥44px (`min-h-[44px]`). Found the profile join/leave button at `h-7` (28px) — a real sub-44px member control — bumped to `h-11 sm:h-7` (44px on mobile, compact on desktop) per Task 7's "controls ≥44px". Note: `admin/members/[id]` hardcoded Indonesian strings and the account-card email overflow edge are pre-existing i18n/style debt left for Story 4.3/4.4 (out of scope, per story).
- **Task 8 (admin sweep):** admin dashboard / settings / member-detail verified (already ✓, not touched). Session new/edit `grid grid-cols-2` grids hold time-pair + number-pair with `w-full` inputs (~136px cols at 320px) — no real overflow, so left as-is per the story's "fix only if a real overflow exists" guidance.
- **Presentation only (AC6/NFR-8):** no `proxy.ts`, layout-guard, route handler, Server Action, schema, query, or mutation change. No new dependency. No color/dark-mode-contrast restyle (Story 4.3) and no Settings IA move (Story 4.4).
- **Code review addendum:** `EkskulMemberships.refresh()` (`src/app/(main)/profile/ekskul-memberships.tsx`) was also hardened during this pass — `fetchMemberships()` now returns `null` (was silently `[]`) on a failed fetch, and a failed post-toggle `refresh()` now surfaces `toast.error(t.common.error)` instead of silently leaving the list unrefreshed. This is a small client-side correctness fix (not a layout change) kept intentionally rather than reverted — see Review Findings below.

### File List

**Added**
- `src/components/admin/mobile-card.tsx`
- `src/app/(admin)/admin/members/member-cards.tsx`
- `src/app/(admin)/admin/payments/payment-cards.tsx`
- `src/app/(admin)/admin/sessions/session-cards.tsx`
- `src/app/(admin)/admin/ekskul/ekskul-cards.tsx`

**Modified**
- `src/app/(admin)/admin/members/page.tsx` — table `hidden md:block` + `md:hidden` `<MemberCards>`; filter select/button `w-full sm:w-auto`
- `src/app/(admin)/admin/payments/page.tsx` — table `hidden md:block` + `md:hidden` `<PaymentCards>`; 4 filter selects `w-full sm:w-auto`
- `src/app/(admin)/admin/sessions/page.tsx` — table `hidden md:block` + `md:hidden` `<SessionCards>`; header `flex-wrap gap-3`
- `src/app/(admin)/admin/ekskul/page.tsx` — table `hidden md:block` + `md:hidden` `<EkskulCards>`
- `src/app/onboarding/page.tsx` — chips `min-h-11` (≥44px); card `p-6 sm:p-8`
- `src/app/(main)/payments/page.tsx` — header `flex-wrap gap-3`
- `src/app/(main)/profile/ekskul-memberships.tsx` — join/leave button `h-11 sm:h-7` (≥44px on mobile)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 4.2 implemented (review). Four admin tables (members/payments/sessions/ekskul) collapse to stacked cards under `md` via a shared `mobile-card` primitive + four colocated `*-cards.tsx` server components, same-field/same-order parity, actions reused verbatim. Onboarding chips + profile join/leave button raised to ≥44px; onboarding padding + member payments/sessions headers + admin filter rows wrap on the narrowest widths. Presentation only — no route/guard/mutation/query/dependency change. `npm run lint` (own files) + `npm run build` green. |
| 2026-07-01 | Story 4.2 created (ready-for-dev). Full page-content responsiveness across every screen — four admin tables (members/payments/sessions/ekskul) collapse to stacked cards under `md` with same-field/same-order parity; onboarding tap-targets ≥44px; header/filter wrap fixes; verify-and-fix sweep of all remaining member/admin/auth screens. Presentation only — no route/guard/mutation/query change; colors/dark-mode-contrast (4.3) and Settings IA (4.4) out of scope. |

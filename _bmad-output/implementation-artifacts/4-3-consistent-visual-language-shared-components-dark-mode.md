---
baseline_commit: 37d9e34cee0fff54a8dc237e752ef79421630582
base_working_tree: Story 4.2 (review) changes are UNCOMMITTED in the working tree — build 4.3 on top of them (they add mobile-card.tsx + four *-cards.tsx + shell/responsive edits). Do NOT revert or re-do 4.2.
---

# Story 4.3: Consistent visual language, shared components & dark mode

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any user,
I want a consistent look and reused components across every screen,
so that the app feels like one product and works identically in light and dark mode.

**Epic:** Epic 4 — UI/UX Refresh, Responsiveness & Settings IA
**FRs:** FR-14 (consistent visual language — refresh not redesign; shared components reused not re-implemented; dark mode + theming on every refreshed screen; no new heavyweight UI dependency or design system).
**Governed by:** UX-DR1 (Deep Teal `#0F766E`/`#2DD4BF` = single platform accent), UX-DR2 (payment-state semantic tokens: `success` CONFIRMED-only, `warning` PENDING/unpaid, `destructive` REJECTED — money colors scarce), UX-DR3 (numeric role: `tabular-nums` weight 600 on every amount/count/capacity/stat value), UX-DR6 (payment status badge = color AND text label, never color-only), UX-DR7 (unpaid banner), UX-DR8 (stat card), UX-DR9 (community identity mark), UX-DR17 (state patterns: Skeleton / empty / pending / rejected / submit-fail toast), UX-DR19 + NFR-4 (WCAG 2.2 AA: dark-mode contrast verified every screen, text+icon state, focus ring), AD-11 (refresh not redesign — reuse shadcn, no new dependency), NFR-6 (i18n through dictionary), NFR-7 (code-quality caps), NFR-8 + AD-2 (presentation only — no route/guard/mutation/query/data/auth change).

## Acceptance Criteria

1. **Consistency via shared components + numeric typography (FR-14, UX-DR3).**
   **Given** spacing, typography, and button/card/table usage across every Member and Admin/Owner screen,
   **When** the refresh is applied,
   **Then** they are consistent screen-to-screen through shared shadcn-based components **reused, not re-implemented per page**, and **every** money amount, count, capacity figure (`x/max`), and stat-card value renders with `tabular-nums` and weight 600 (font-semibold). No screen hand-rolls a stat card, empty state, unpaid banner, or identity mark that a shared component already covers.

2. **Shared components + semantic tokens cover the recurring patterns (UX-DR1/2/6/7/8/9).**
   **Given** the recurring UI patterns,
   **When** screens are refreshed,
   **Then** shared components/tokens exist and are used for: the **payment status badge** (color AND text label together, never color-only — PENDING→`warning`, CONFIRMED→`success`, REJECTED→`destructive`, UX-DR6/UX-DR2); the **unpaid banner** (UX-DR7); the **stat card** (UX-DR8); the **community identity mark** (UX-DR9); with the **Deep Teal accent** (`--primary`) as the single platform accent replacing every legacy green/purple accent (UX-DR1). `success` and `warning` are used **only** for payment state (never generic good/warn UI).

3. **State patterns render on every refreshed screen (UX-DR17).**
   **Given** cold-load, empty, pending, rejected, and submit-fail conditions,
   **When** any refreshed screen reaches them,
   **Then** the shadcn `Skeleton` (matching shape) shows on cold load, role-appropriate empty states render (with admin create variant where applicable), PENDING/REJECTED proof states render with text+icon (never color alone), and a `sonner` **destructive** toast fires on submit-fail with the user's input retained.

4. **Dark mode + theming verified WCAG 2.2 AA on every screen; no new dependency (FR-14, UX-DR19, AD-11).**
   **Given** dark mode + theming via `next-themes`,
   **When** every refreshed screen is viewed in dark mode,
   **Then** it works and contrast meets WCAG 2.2 AA on each screen (no hardcoded `text-gray-*`/`bg-white`/`bg-*-500` that break in dark — all chrome uses semantic tokens `bg-card`/`bg-background`/`text-foreground`/`text-muted-foreground`/`border-border`), a visible focus ring is present on interactives, and **no new heavyweight UI dependency or design system** is added; `npm run lint` and `npm run build` pass (NFR-7).

## Tasks / Subtasks

> **Method:** token-first, then components, then a mechanical screen-by-screen migration using the fixed **Color Migration Map** (Dev Notes). Do the token + badge-variant + `paymentStatusVariant` work FIRST — every later screen edit depends on those utilities existing. This is a **visual refresh only**: change classNames/tokens/shared-component usage; do NOT change routes, guards, Route Handlers, Prisma queries (`select`/`include`/`where`/`take`/`orderBy`), data shapes, or copy semantics. Do NOT migrate the hand-rolled `<table>`s to the shadcn `Table` component (churn without value — same call as 4.2).

- [x] **Task 1 — Design tokens: Deep Teal primary + success/warning semantics (AC: 2, 4)** — `src/app/globals.css`
  - [x] In `:root`, replace the neutral `--primary`/`--primary-foreground` with Deep Teal: `--primary: #0F766E;` `--primary-foreground: #FFFFFF;`. Add `--success: #16A34A; --success-foreground: #FFFFFF; --warning: #B45309; --warning-foreground: #FFFFFF;`.
  - [x] In `.dark`, set `--primary: #2DD4BF; --primary-foreground: #09090B; --success: #4ADE80; --success-foreground: #052E16; --warning: #FBBF24; --warning-foreground: #1A1208;`.
  - [x] In the `@theme inline` block, add the four new mappings so Tailwind emits the utilities: `--color-success: var(--success);` `--color-success-foreground: var(--success-foreground);` `--color-warning: var(--warning);` `--color-warning-foreground: var(--warning-foreground);`. (`--color-primary`/`--color-primary-foreground` already map — no change needed there.)
  - [x] Hex is valid CSS; keep the existing oklch tokens untouched. Do NOT alter `background`/`foreground`/`card`/`muted`/`border`/`input`/`ring`/`destructive` — they inherit shadcn (UX-DR2/DESIGN). Verify `bg-primary`, `bg-success`, `text-success`, `bg-warning`, `text-warning-foreground` all resolve after `npm run build`.

- [x] **Task 2 — Badge success/warning variants + status-variant remap (AC: 2)** — `src/components/ui/badge.tsx`, `src/lib/utils.ts`
  - [x] Add two soft-tint variants to `badgeVariants` mirroring the existing `destructive` treatment (so all three payment badges are one visual family, differing only in hue): `success: "bg-success/15 text-success dark:bg-success/20"` and `warning: "bg-warning/15 text-warning dark:bg-warning/20"`. (Soft tint, not solid fill — the solid `warning` fill is reserved for the unpaid banner in Task 3.)
  - [x] Remap `paymentStatusVariant` (`src/lib/utils.ts`) → `CONFIRMED: 'success'`, `REJECTED: 'destructive'`, else (PENDING): `'warning'`. Widen the return type to include `'success' | 'warning'`. **Critical:** without this remap, CONFIRMED currently returns `'default'` which becomes **teal** after Task 1 — wrong signal.
  - [x] Leave `sessionStatusVariant` on shadcn variants (sessions are not money — `success`/`warning` stay scarce; `ONGOING→default`=teal is the correct "active" read).
  - [x] Add `roleBadgeVariant(role)` in `src/lib/utils.ts`: `OWNER: 'default'`, `ADMIN: 'secondary'`, else `'outline'`. Replaces the hardcoded `bg-purple-600 text-white` OWNER badge in `admin/members/page.tsx` and `profile/page.tsx`.

- [x] **Task 3 — Shared components (AC: 1, 2, 3)** — new files under `src/components/`
  - [x] **`src/components/community/identity-mark.tsx`** — `CommunityIdentityMark({ communityName, logoUrl, size? })` (server-safe, no `'use client'`): configured `<Image>` logo if set, else a circular abbr token `bg-muted text-primary font-bold` using `communityAbbr(communityName)` (UX-DR9 "in primary on muted"). Replace the 4 duplicated inline circles (all `bg-green-600`) in `member-nav.tsx` (its local `IdentityMark`), `sidebar.tsx`, `mobile-nav.tsx`. Accept a `size` prop (nav uses `w-7 h-7`, sidebar `w-9 h-9`).
  - [x] **`src/components/ui/stat-card.tsx`** — `StatCard({ label, value, sub?, icon?, href? })`: shadcn `<Card>` + label (`text-muted-foreground`) + value (`text-2xl font-bold tabular-nums text-foreground`) + optional `sub` + optional icon slot + optional link wrap (UX-DR8, UX-DR3). Reuse on member dashboard (3) and admin dashboard (4). Icon tint uses `text-muted-foreground` (drop the hardcoded per-stat blue/green/yellow/purple icon backgrounds).
  - [x] **`src/components/payments/unpaid-banner.tsx`** — `UnpaidBanner({ amount, month, year, activityName?, href })`: full-width **solid** `bg-warning text-warning-foreground` banner stating the amount (`tabular-nums`) + a primary CTA to pay (UX-DR7, UX-DR22 money-honest copy). Replace the hardcoded yellow banner in `payments/page.tsx:79-96`. Route new copy through `dictionaries.ts` (en/id parity) — reuse existing dues keys where present; add only if missing.
  - [x] **`src/components/ui/empty-state.tsx`** — `EmptyState({ icon?, title, description?, action? })`: centered `bg-card border border-border rounded-xl` shell + muted icon + text + optional action (UX-DR17). Replace the ~13 inlined member/pay empty states (dashboard no-ekskul, sessions none, payments none, upload none, session-not-found). Admin table empty rows (`<tr><td colspan>`) stay as table cells but adopt semantic `text-muted-foreground`.
  - [x] All new shared components: `PascalCase.tsx`, ≤300 lines, functions ≤40 lines, no magic numbers, semantic tokens only (no `gray-*`/`green-*`).

- [x] **Task 4 — Migrate shells & nav to tokens (AC: 2, 4)** — `member-nav.tsx`, `sidebar.tsx`, `mobile-nav.tsx`, `ThemeToggle.tsx`
  - [x] Apply the Color Migration Map: active nav (member `green-*`, admin `purple-*`) → `bg-primary/10 text-primary`; inactive → `text-muted-foreground hover:bg-muted hover:text-foreground`; chevron `text-purple-*` → `text-primary`; avatar fallback `bg-green-100 text-green-700` → `bg-muted text-muted-foreground` (or `bg-primary/10 text-primary`); sign-out `text-red-*` → keep destructive intent via `text-destructive hover:bg-destructive/10`; shell chrome `bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700` → `bg-card border-border`.
  - [x] Swap the three inline identity circles for `<CommunityIdentityMark>` (Task 3).
  - [x] `ThemeToggle.tsx`: the custom Switch `bg-green-600`/`bg-gray-300`/`bg-white` → `bg-primary`/`bg-input`/`bg-background`; button hover grays → `text-muted-foreground hover:text-foreground`.

- [x] **Task 5 — Migrate member screens to tokens + tabular-nums + shared components (AC: 1, 2, 3, 4)**
  - [x] `(main)/dashboard/page.tsx` — 3 stat cards → `<StatCard>` (adds `tabular-nums`); progress bar `bg-gray-100`/`bg-green-500` → `bg-muted`/`bg-primary`; per-ekskul card chrome grays → `bg-card`/`border-border`/`text-foreground`/`text-muted-foreground`; "not paid" button `text-red-500 border-red-200` → `variant="outline"` with `text-warning` (dues-owed = warning, not destructive); `hover:border-green-200` → `hover:border-primary/40`; "registered" badge `text-green-600 border-green-200` → `variant="success"` or `outline` + `text-success`; viewAll link `text-green-600` → `text-primary`. No-ekskul empty → `<EmptyState>`.
  - [x] `(main)/payments/page.tsx` — yellow banner → `<UnpaidBanner>`; title icon `text-green-600` → `text-primary`; Upload button `bg-green-600` → default `<Button>` (inherits teal); amount `:134` add `tabular-nums`; view-proof link `text-blue-500` → `text-primary`; empty → `<EmptyState>`; card chrome grays → tokens.
  - [x] `(main)/sessions/page.tsx` + `(main)/sessions/[id]/page.tsx` — chrome grays → tokens; `hover:border-green-200` → `hover:border-primary/40`; registered badge greens → success/outline; attendance status inline badge → keep variant logic but tokenized; add `tabular-nums` to fee + `x/max` participant counts; avatar fallback + "(you)" green → tokens/`text-primary`; empty (no attendees) → tokenized.
  - [x] `(main)/payments/upload/page.tsx` + `(main)/sessions/[id]/pay/page.tsx` — file drop zone `border-gray-200 hover:border-green-400 hover:bg-green-50` → `border-border hover:border-primary/50 hover:bg-primary/5`; submit buttons `bg-green-600` → default `<Button>`; readonly amount input already `tabular-nums` — migrate its `bg-gray-50 dark:bg-gray-800` → `bg-muted`; back links + card chrome grays → tokens; not-found/empty → `<EmptyState>`.
  - [x] `(main)/profile/page.tsx` + `profile/ekskul-memberships.tsx` + `profile/payment-mode-selector.tsx` — OWNER badge purple → `roleBadgeVariant`; save button `bg-green-600` → default `<Button>`; avatar fallback + icon greens → tokens; `payment-mode-selector` selected state `border-green-600 ring-green-600 bg-green-50` → `border-primary ring-primary bg-primary/5`, check icon `text-green-600` → `text-primary`, pending note `text-amber-700 dark:text-amber-500` → `text-warning`; keep its existing `tabular-nums` on fees; card chrome grays → tokens.

- [x] **Task 6 — Migrate admin screens to tokens + tabular-nums (AC: 1, 2, 4)**
  - [x] `(admin)/admin/page.tsx` — 4 stat cards → `<StatCard>` (drop the hardcoded per-stat `text-*-600 bg-*-50` icon backgrounds; adds `tabular-nums`); per-ekskul breakdown counts add `tabular-nums`; title/subtitle grays → tokens.
  - [x] `(admin)/admin/members/page.tsx` + `member-cards.tsx` + `member-actions.tsx` — table header `bg-gray-50 dark:bg-gray-800 border-gray-100` → `bg-muted border-border`; `<th>`/cell grays → `text-muted-foreground`/`text-foreground`; row hover `hover:bg-gray-50 dark:hover:bg-gray-800/50` → `hover:bg-muted`; avatar fallback greens → tokens; OWNER badge purple → `roleBadgeVariant`; inactive badge `text-red-500 border-red-200` → `variant="destructive"` (soft-tint); counts add `tabular-nums`; title icon green → `text-primary`; search input/select `bg-white dark:bg-gray-900` → `bg-background`. Mirror ALL changes into `member-cards.tsx` (parity — same tokens).
  - [x] `(admin)/admin/payments/page.tsx` + `payment-cards.tsx` + `payment-actions.tsx` — header/cell/hover grays → tokens; amount `:180` + card amount add `tabular-nums`; export link `text-green-600 border-green-200` → `text-primary`; filter selects `bg-white dark:bg-gray-900` → `bg-background`; title icon green → `text-primary`. Keep the 3px accent bar (runtime activity color — untouched).
  - [x] `(admin)/admin/sessions/page.tsx` + `session-cards.tsx` — header/cell/hover grays → tokens; participant count add `tabular-nums`; New-session button `bg-green-600` → default `<Button>`; Detail link `text-blue-500` → `text-primary`, CSV link `text-green-600` → `text-primary`, Edit link gray → `text-muted-foreground`; title icon green → `text-primary`. Keep accent bar.
  - [x] `(admin)/admin/ekskul/page.tsx` + `ekskul-cards.tsx` + `ekskul-actions.tsx` — header/cell/hover grays → tokens; fee already `tabular-nums` (keep); inactive badge `text-gray-400 border-gray-200` → `variant="outline"`/`secondary`; title icon green → `text-primary`; member count add `tabular-nums`.
  - [x] `(admin)/admin/members/[id]/page.tsx` + `(admin)/admin/settings/page.tsx` + `sessions/new/page.tsx` + `sessions/[id]/edit/edit-form.tsx` — chrome grays → tokens; any `bg-green-600` submit → default `<Button>`. Note: `admin/members/[id]` hardcoded-Indonesian-string i18n debt stays out of scope (Story 4.4 / later i18n pass) — tokenize colors only, do not touch its copy.

- [x] **Task 7 — Migrate shared/remaining components (AC: 1, 2, 4)** — `mobile-card.tsx`, `page-skeletons.tsx`, `rsvp-button.tsx`, `ekskul-badge.tsx`
  - [x] `src/components/admin/mobile-card.tsx` — `bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800` → `bg-card border-border`; `text-gray-500`/`text-gray-700 dark:text-gray-200`/`text-gray-400` → `text-muted-foreground`/`text-foreground`. (This is 4.2's primitive — migrate its tokens, keep its API.)
  - [x] `src/components/skeletons/page-skeletons.tsx` — the `CARD` const `bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800` → `bg-card rounded-xl border border-border`; the `TableRow`/`TableSkeleton` border grays → `border-border`.
  - [x] `src/components/sessions/rsvp-button.tsx` — register / register-&-pay buttons `bg-green-600 hover:bg-green-700` → default `<Button>`; cancel `border-red-200 text-red-500 hover:bg-red-50` → `variant="outline"` + `text-destructive hover:bg-destructive/10`; paid text `text-green-600` → `text-success`; rejected text `text-red-500` → `text-destructive`; pending text `text-amber-600` → `text-warning`. Keep the existing `tabular-nums` fee spans. Behavior/state machine unchanged.
  - [x] `src/components/ekskul/ekskul-badge.tsx` — **deferred-work pickup**: expand `parseHex` to also accept 3-digit hex (`#fff` → `#ffffff`) so the readable-foreground calc never falls back to white on a light bg. Verify the badge icon renders small (badge.tsx already forces `[&>svg]:size-3!` — confirm, no change if already constrained). Do NOT change the WCAG contrast math.

- [x] **Task 8 — Dark-mode + a11y contrast audit (AC: 3, 4)**
  - [x] Toggle every screen light↔dark (member: dashboard, sessions list, session detail, payments list, monthly upload, session pay, profile, onboarding; admin: dashboard, members, payments, sessions, ekskul, member-detail, settings, new/edit session). Confirm NO screen still contains `bg-white`, `dark:bg-gray-900`, `text-gray-900 dark:text-white`, `bg-*-500`, `text-green-*`, `text-purple-*`, `bg-yellow-*` etc. — grep for residue (see Testing standards).
  - [x] Verify AA contrast: `success`/`warning` soft-tint badges legible in both modes; the solid `warning` unpaid banner legible; teal primary buttons/links/active-nav legible; focus ring visible on all interactives (`focus-visible:ring-ring` already on nav — confirm on new buttons).
  - [x] Confirm every payment/session state still conveys text+icon (not color alone) after the token swap (NFR-4).

- [x] **Task 9 — Verify (NFR-7, NFR-8, AC: 1-4)**
  - [x] `npx eslint` on every changed/added file → 0 issues. `npm run build` → green (types + all routes).
  - [x] Regression pass: `proxy.ts`, both layout guards, all Route Handlers, all Prisma queries, all mutation flows (confirm/reject payment, RSVP, upload proof, mode switch, ekskul CRUD, settings save, sign-out, language, theme toggle) unchanged and working. No new dependency in `package.json`.
  - [x] Confirm `success`/`warning` are used ONLY on payment surfaces (grep), and that no second brand color remains (no `green`/`purple` accent anywhere).

## Dev Notes

### What this story changes (READ FIRST)
Stories 4.1 (shells/nav) and 4.2 (page-content responsiveness) explicitly **deferred all color/token/visual-language work and the dark-mode contrast audit to this story**. 4.2's own scope boundary says: *"the Deep Teal accent-token migration, shared-component visual language, and full dark-mode contrast audit are Story 4.3."* So 4.3 is the **visual/token pass**:

1. **Tokens (do first):** the app currently ships shadcn's **neutral gray `--primary`** — Deep Teal (UX-DR1) is **not applied yet**. There are **no `success`/`warning` tokens**. Add them (Task 1). Everything else depends on this.
2. **App-wide color convention to unify:** the codebase uses **green as the de-facto accent + success**, **purple as the admin accent**, **amber/yellow as pending**, **red as error**, and **`bg-white dark:bg-gray-900` / `gray-*` as chrome** — ~**298 hardcoded color-utility instances across 15 files**. Migrate all of them to the single Deep Teal `primary` + the semantic tokens per the fixed **Color Migration Map** below.
3. **Shared components:** stat cards, empty states, the unpaid banner, and the identity mark are **inline-duplicated** (stat cards 7×, empty states ~13×, identity mark 4×). Extract shared components (Task 3) and reuse them (UX-DR7/8/9, AC1).
4. **`tabular-nums`:** present in only ~5 of ~16 numeric spots. Add it to **every** amount/count/capacity/stat value (UX-DR3, AC1).
5. **Dark mode:** wiring (`next-themes`) is already correct — this story does NOT touch theme setup. It fixes the hardcoded classes that break dark contrast and audits every screen (Task 8, AC4).

This is **presentation only** (AC4/NFR-8, AD-2): no route, `proxy.ts`, `auth()`/`isAdminRole` guard, Route Handler, Server Action (there are none — AR-2), schema, Prisma query, or copy-semantics change. **Build on top of 4.2's uncommitted working-tree changes** — do not revert them.

### Design tokens — exact values (UX-DR1, UX-DR2; DESIGN.md front-matter)
| Token | Light | Dark | Used for |
|---|---|---|---|
| `--primary` | `#0F766E` | `#2DD4BF` | primary buttons, active nav, links, focus, identity abbr text — **single** platform accent |
| `--primary-foreground` | `#FFFFFF` | `#09090B` | text on primary fill |
| `--success` | `#16A34A` | `#4ADE80` | payment **CONFIRMED** only |
| `--success-foreground` | `#FFFFFF` | `#052E16` | (reserved; badges use soft tint) |
| `--warning` | `#B45309` | `#FBBF24` | payment **PENDING** + unpaid banner only |
| `--warning-foreground` | `#FFFFFF` | `#1A1208` | text on solid warning banner |
| REJECTED / destructive | shadcn `destructive` (unchanged) | | REJECTED + destructive actions |
All other tokens (`background`/`foreground`/`card`/`popover`/`muted`/`muted-foreground`/`border`/`input`/`ring`/`secondary`/`accent`) **inherit shadcn** — do not touch (UX-DR2/DESIGN). Dark pairs are tuned for AA on shadcn's dark surface.

### Color Migration Map (apply mechanically, everywhere)
| Legacy (remove) | Semantic token (use) | Meaning |
|---|---|---|
| `bg-green-600 hover:bg-green-700` (buttons) | default `<Button>` (drop the class — inherits `bg-primary`) | primary CTA |
| `text-green-600` / `text-green-700` (accent/links) | `text-primary` | accent/link |
| active nav `bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400` / admin `bg-purple-50 text-purple-700 …` | `bg-primary/10 text-primary` | active nav |
| inactive nav `text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:…` | `text-muted-foreground hover:bg-muted hover:text-foreground` | inactive nav |
| chevron/icon `text-purple-*` | `text-primary` | admin accent |
| identity circle `bg-green-600` + `text-white` | `<CommunityIdentityMark>` → `bg-muted text-primary` | identity (UX-DR9) |
| avatar fallback `bg-green-100 text-green-700` | `bg-primary/10 text-primary` | avatar |
| CONFIRMED / "paid" `text-green-600` | `text-success` / badge `variant="success"` | payment CONFIRMED (UX-DR2) |
| PENDING / dues-owed `text-amber-*` / `text-yellow-*` / `bg-yellow-*` | `text-warning` / badge `variant="warning"` / banner `bg-warning text-warning-foreground` | payment PENDING/unpaid (UX-DR2) |
| REJECTED / destructive `text-red-500 border-red-200 bg-red-50` | `variant="destructive"` / `text-destructive hover:bg-destructive/10` | REJECTED/destructive |
| OWNER badge `bg-purple-600 text-white` | `roleBadgeVariant(role)` (OWNER→`default`) | role badge |
| card chrome `bg-white dark:bg-gray-900` | `bg-card` | card surface |
| input/select bg `bg-white dark:bg-gray-900` | `bg-background` | field surface |
| table header `bg-gray-50 dark:bg-gray-800` | `bg-muted` | table header |
| row hover `hover:bg-gray-50 dark:hover:bg-gray-800/50` | `hover:bg-muted` | row hover |
| border `border-gray-100/200 dark:border-gray-700/800` | `border-border` | borders |
| heading `text-gray-900 dark:text-white` | `text-foreground` | primary text |
| secondary/label `text-gray-500` / `text-gray-400` / `text-gray-700 dark:text-gray-300` | `text-muted-foreground` | muted text |
| empty icon `text-gray-300` | `text-muted-foreground/50` | empty-state icon |
| progress `bg-gray-100` + fill `bg-green-500` | `bg-muted` + `bg-primary` | progress bar |
| drop-zone `border-gray-200 hover:border-green-400 hover:bg-green-50` | `border-border hover:border-primary/50 hover:bg-primary/5` | file drop zone |

Rule of thumb: **chrome → semantic neutral tokens; accent → `primary`; money-state → `success`/`warning`/`destructive` (and money-state ONLY).** Never introduce a solid `success`/`warning` fill outside the unpaid banner; badges are soft-tint.

### Files to touch — full surface (from the audit; ~298 hardcodes / 15 files)
**Tokens/primitives:** `src/app/globals.css`, `src/components/ui/badge.tsx`, `src/lib/utils.ts`, `src/components/admin/mobile-card.tsx`, `src/components/skeletons/page-skeletons.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ekskul/ekskul-badge.tsx`, `src/components/sessions/rsvp-button.tsx`.
**New shared:** `src/components/community/identity-mark.tsx`, `src/components/ui/stat-card.tsx`, `src/components/payments/unpaid-banner.tsx`, `src/components/ui/empty-state.tsx`.
**Shells/nav:** `src/components/layout/member-nav.tsx`, `sidebar.tsx`, `mobile-nav.tsx`.
**Member screens:** `(main)/dashboard/page.tsx`, `(main)/payments/page.tsx`, `(main)/payments/upload/page.tsx`, `(main)/sessions/page.tsx`, `(main)/sessions/[id]/page.tsx`, `(main)/sessions/[id]/pay/page.tsx`, `(main)/profile/page.tsx`, `(main)/profile/ekskul-memberships.tsx`, `(main)/profile/payment-mode-selector.tsx`, `onboarding/page.tsx` (chip selected-state color if green).
**Admin screens + their 4.2 card siblings:** `(admin)/admin/page.tsx`, `members/page.tsx` + `member-cards.tsx` + `member-actions.tsx`, `payments/page.tsx` + `payment-cards.tsx` + `payment-actions.tsx`, `sessions/page.tsx` + `session-cards.tsx`, `ekskul/page.tsx` + `ekskul-cards.tsx` + `ekskul-actions.tsx`, `members/[id]/page.tsx`, `settings/page.tsx`, `sessions/new/page.tsx`, `sessions/[id]/edit/edit-form.tsx`.

Per-file hardcode counts (audit): dashboard 11 · payments(member) 12 · admin dashboard 7 · members 13 · payments(admin) 15 · sessions(admin) 11 · sessions(member) 9 · session-detail 9 · profile 6 · upload 5 · session-pay 5 · member-nav 8 · sidebar 8 · mobile-nav 8 · rsvp-button 8 · ekskul(admin) 8 · ThemeToggle 4 · page-skeletons 1.

### `tabular-nums` targets (currently MISSING — UX-DR3, AC1)
Add `tabular-nums` (+ `font-semibold` on stat values) to: member dashboard stat values + `x/max` (`dashboard/page.tsx:117-152`); admin dashboard stat values + per-ekskul counts (`admin/page.tsx:149-150,173-197`); member payment amount (`payments/page.tsx:134`); admin payment amount (`payments/page.tsx:180`); admin sessions participant count (`sessions/page.tsx:148-151`); member sessions fee + count (`sessions/page.tsx:119,125`); session detail count+fee (`sessions/[id]/page.tsx:167-182`); admin members attendance/payment counts (`members/page.tsx:175-179`); and mirror all into the 4.2 `*-cards.tsx`. Already present (keep): readonly amount inputs, rsvp-button fee spans, admin ekskul fee, payment-mode-selector fees. The `<StatCard>` component bakes `tabular-nums` in, so migrating dashboards to it covers the stat values automatically.

### Shared components to CREATE (UX-DR7/8/9, AC1/2)
- **`CommunityIdentityMark`** — server-safe; logo `<Image>` or circular `bg-muted text-primary font-bold` abbr via `communityAbbr()`. Replaces 4 inline copies. `size` prop for nav (28px) vs sidebar (36px).
- **`StatCard`** — shadcn `<Card>`; `label` muted, `value` `text-2xl font-bold tabular-nums`, optional `sub`/`icon`/`href`. Replaces 7 inline stat cards.
- **`UnpaidBanner`** — solid `bg-warning text-warning-foreground` full-width; amount `tabular-nums`; primary CTA; i18n copy names amount+activity+period (UX-DR22). Replaces the yellow banner.
- **`EmptyState`** — `bg-card border-border rounded-xl` centered; icon/title/description/action. Replaces ~13 inline empties (member surfaces). Admin table empties stay `<td colspan>` but tokenized.

### Reuse — do not reinvent (AD-11: no new dependency)
- shadcn primitives in `src/components/ui/` (`card`,`badge`,`button`,`skeleton`,`avatar`,`select`,`dialog`,`sheet`,`separator`,`table`,`sonner`) — reuse; add NO dependency, NO `shadcn add`, NO design system.
- `EkskulBadge` (`@/components/ekskul/ekskul-badge`) + the 3px runtime accent bar — **untouched** by the token swap (they use the Activity's runtime color, the intended chromatic carrier). Only Task 7's 3-digit-hex fix touches ekskul-badge.
- `communityAbbr`, `isAdminRole`, `paymentStatusVariant`, `sessionStatusVariant`, `roleBadgeVariant`, `cn` in `@/lib/utils`.
- Shared skeletons in `@/components/skeletons/page-skeletons.tsx` (already reused via each `loading.tsx`) — migrate their tokens only.
- i18n: route all user-facing strings through `@/lib/i18n/dictionaries.ts` (en/id parity, NFR-6). This story adds almost no copy; if a banner/empty-state string is missing, add to **both** `en` and `id`. Never hardcode.

### Guardrails — what must NOT change (AC4, NFR-8, AD-2)
- `src/proxy.ts`, both route-group `layout.tsx` guards — untouched. Layouts stay server components.
- No Server Actions, no new/changed API route, no data mutation, no Prisma `select`/`include`/`where`/`take`/`orderBy` change, no schema change. Screens render the **already-fetched** data.
- Do NOT change table column semantics or the 4.2 card field parity — only colors/tokens/tabular-nums/shared-component substitution.
- Do NOT migrate hand-rolled `<table>`s to shadcn `<Table>` (churn; same call as 4.2).
- Do NOT restyle shadcn components "to make them ours" beyond the brand-layer delta (primary token + success/warning tokens + primary-button fill + the four product components). Everything else inherits shadcn (DESIGN Do's/Don'ts).
- Keep `next-themes` wiring (`layout.tsx:49` `attribute='class' defaultTheme='system' enableSystem`, `suppressHydrationWarning`) exactly as-is.

### deferred-work.md pickups (this story's `_bmad-output/implementation-artifacts/deferred-work.md`)
- **IN scope (visual):** 3-digit hex in `ekskul-badge.parseHex` (Task 7); confirm badge icon sizing (badge.tsx already forces `[&>svg]:size-3!`).
- **OUT of scope (behavior/validation, not visual language):** payment-mode ≥1 error attribution (`ekskul-actions.tsx` `path:['allowsPerSession']`) and `maxPlayers` number-input coercion. These are form-validation behavior; touching them risks the presentation-only guarantee. Leave for Story 4.4 / a validation pass. If you happen to be editing that file for colors, do NOT also change its validation logic.

### Next.js 16 / project specifics
- Middleware = `src/proxy.ts` (never create `middleware.ts`). Read `node_modules/next/dist/docs/` before any layout/data-fetching change (there should be none here).
- Server Components by default; new `StatCard`/`EmptyState`/`UnpaidBanner`/`CommunityIdentityMark` should be **server-safe** (no `'use client'`) — they render passed props. `member-nav`/`sidebar`/`mobile-nav`/`ThemeToggle`/`payment-mode-selector`/`rsvp-button` keep their existing `'use client'`.
- `src/lib` must not import from `src/app` (AR-2). New shared components live under `src/components/**`.
- Tailwind v4: tokens are wired via `@theme inline` in `globals.css` mapping `--color-*` → `var(--*)`. Adding `--color-success`/`--color-warning` there is what makes `bg-success`/`text-warning` compile.

### Code-quality caps (NFR-7)
Functions ≤40 lines · files ≤300 lines (extract if a page would exceed — e.g. moving stat cards to `<StatCard>` shrinks dashboards) · nesting ≤3 (early return) · no magic numbers · naming (`PascalCase.tsx` components, `camelCase` fns, booleans `is`/`has`/`should`). ESLint (next core-web-vitals + ts) via pre-commit.

### Testing standards
No automated tests. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual passes:
- **Residue grep (must return ONLY intentional keeps):** search `src/` for `bg-white`, `dark:bg-gray-`, `text-gray-`, `bg-gray-`, `border-gray-`, `text-green-`, `bg-green-`, `border-green-`, `text-purple-`, `bg-purple-`, `text-yellow-`, `bg-yellow-`, `text-amber-`, `bg-red-`, `text-red-`, `text-blue-`, `bg-*-500`. Expect ~0 (any leftover must be justified — none should be).
- **Accent:** every primary CTA/link/active-nav is teal (`primary`); no green/purple accent anywhere; a single platform accent (UX-DR1).
- **Payment state:** CONFIRMED=success (green tint), PENDING=warning (amber tint), REJECTED=destructive; each badge has color **and** text label (UX-DR6/NFR-4); `success`/`warning` appear on money surfaces only.
- **Numbers:** all amounts/counts/`x/max`/stat values are `tabular-nums` weight 600 and align in tables.
- **Dark mode (AC4):** toggle every screen (list in Task 8); no broken contrast; teal/success/warning/destructive all AA-legible in both modes; focus ring visible.
- **State patterns (AC3):** cold-load skeletons match shape; empty states render (admin create variant where applicable); PENDING/REJECTED show text+icon; a forced submit-failure fires a `sonner` destructive toast with input retained.
- **No regression (NFR-8):** `proxy.ts`/guards/routes/mutations unchanged; confirm/reject payment, RSVP (monthly + per-session register-&-pay), upload proof, mode switch, ekskul CRUD, settings save, sign-out, language, theme toggle all still work; `package.json` has no new dependency.

### References
- [Source: epics.md#Story 4.3] (lines 537-559) — ACs + FR-14 mapping
- [Source: epics.md#UX-DR1] (line 77) — Deep Teal single platform accent
- [Source: epics.md#UX-DR2] (line 78) — payment-state semantic tokens (success/warning/destructive, money-only)
- [Source: epics.md#UX-DR3] (line 79) — `tabular-nums` weight 600 on all amounts/counts/stats
- [Source: epics.md#UX-DR6/7/8/9] (lines 84-87) — payment status badge / unpaid banner / stat card / identity mark
- [Source: epics.md#UX-DR17] (line 97) — state patterns (skeleton/empty/pending/rejected/submit-fail)
- [Source: epics.md#UX-DR19 / NFR-4] (lines 99, 51) — WCAG 2.2 AA, dark-mode contrast every screen, text+icon, focus ring
- [Source: epics.md#AD-11 / Epic 4 intro] (lines 137, 481-483) — refresh not redesign; reuse shadcn; no new dependency
- [Source: DESIGN.md front-matter + Colors/Components] — exact token hex (light+dark), soft-tint badge vs solid banner, "inherit shadcn for everything not in the brand layer"
- [Source: 4-2-full-responsiveness-across-every-screen.md#Scope boundary] — 4.2 defers accent-token migration + shared-component visual language + dark-mode contrast audit to 4.3; 4.2 changes are the working-tree base
- [Source: src/app/globals.css:7-49,51-118] — `@theme inline` mapping block + `:root`/`.dark` token blocks (edit target)
- [Source: src/components/ui/badge.tsx:7-28] — `badgeVariants` cva (add success/warning)
- [Source: src/lib/utils.ts:42-57] — `sessionStatusVariant`/`paymentStatusVariant` (remap payment; add `roleBadgeVariant`)
- [Source: src/components/layout/member-nav.tsx:40-63,140-141,177-178] — inline `IdentityMark` + green active nav
- [Source: src/components/layout/sidebar.tsx:36-59,78-84,109] — inline green logo + purple active nav
- [Source: src/components/layout/mobile-nav.tsx:60,88-89,115] — inline green logo + purple active nav
- [Source: src/app/(main)/dashboard/page.tsx:108-162,206,249,271] — inline stat cards + green/red accents
- [Source: src/app/(admin)/admin/page.tsx:100-156] — inline stat cards + hardcoded per-stat icon colors
- [Source: src/app/(main)/payments/page.tsx:79-96,134] — yellow unpaid banner + amount missing tabular-nums
- [Source: src/components/sessions/rsvp-button.tsx:106-202] — green/red/amber CTA + state colors
- [Source: src/components/admin/mobile-card.tsx:21-54], [src/components/skeletons/page-skeletons.tsx:10] — hardcoded card-shell chrome
- [Source: src/app/(main)/profile/payment-mode-selector.tsx:59-63,159] — green selected state + amber pending note
- [Source: src/app/layout.tsx:47-49] — next-themes wiring (do not change)
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — 3-digit hex + badge icon size (in scope); mode-error attribution + maxPlayers coercion (out of scope)
- [Source: project-context.md] — Next 16 `proxy.ts`, twice-enforced guards, server-only helpers, code caps, i18n-through-dictionary, AR-2 (no Server Actions), Tailwind v4 + shadcn + next-themes

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (bmad-dev-story workflow)

### Debug Log References

- The bulk of Tasks 1–7's mechanical migration (tokens, badge variants, four shared components, screen-by-screen color migration, `tabular-nums`) was already present in the working tree/history (commit `347770b`) when this session picked up the story — the story file's own tracking (checkboxes/Status/File List) had not been updated to reflect it. This session's job was to audit the actual codebase against every AC/task, fix the gaps found, and bring the story file's bookkeeping in line with reality.
- Audit method: grepped `src/` for every legacy hardcoded color class in the Color Migration Map (0 residual matches), verified `globals.css`/`badge.tsx`/`utils.ts` token values against the exact Dev Notes spec (match), verified all four shared components exist and are wired into their target screens, then grepped every `text-success|bg-success|text-warning|bg-warning|variant="success"|variant="warning"` usage site to check the AC2 "money-state only" rule.
- Found and fixed 4 AC2 violations where `success`/`warning` had leaked onto non-payment UI (mechanical over-migration from the legacy amber/green mapping):
  - `dashboard/page.tsx` and `sessions/page.tsx`: the per-session "registered" (RSVP) badge used `variant="success"` — not a payment state. Changed to `variant="default"` (teal), consistent with `sessionStatusVariant`'s existing "sessions are not money" rule.
  - `admin/sessions/[id]/edit/edit-form.tsx`: the manual-attendance REGISTERED/PRESENT toggle colors used `text-warning`/`text-success` — attendance is not payment state. Changed to `text-muted-foreground`/`text-primary` (and the matching soft-tint `activeClass` backgrounds), consistent with the member-facing session-detail page's existing `default`/`destructive`/`secondary` attendance-badge pattern.
  - `auth/signin/page.tsx` + `auth/dev/page.tsx`: the dev-only "Dev login" link/"Development only" label used `text-warning` (mechanically mapped from the old ad-hoc amber). Changed to `text-muted-foreground` — a non-money, non-production affordance, not a UI state needing a semantic color.
- Found and fixed one AC1/AC2 reuse gap: `admin/members/[id]/page.tsx` had its own local `PAYMENT_BADGE_VARIANTS` map (`default`/`destructive`/`secondary`) instead of the shared `paymentStatusVariant` utility, so its payment-history badges didn't render `success`/`warning` like every other payment badge in the app. Replaced with `paymentStatusVariant` (the local `ATTENDANCE_BADGE_VARIANTS` map was left as-is — it already used the correct non-money `default`/`destructive`/`secondary` pattern).
- `npm run build` failed on first run with a pre-existing (not introduced by this session) TS error in `admin/members/[id]/page.tsx` — `resolvePaymentMode` rejected the Prisma `Membership` type because the generated Prisma Client predated the `paymentMode`/`effectiveFrom`/`pendingMode`/`pendingEffectiveFrom` schema fields. Fixed by running `npx prisma generate` (schema already had the fields from Story 3.1; the client just hadn't been regenerated) — no schema/query change.
- Final verification: `npm run lint` → 0 issues; `npm run build` → all 34 routes compile, typecheck clean; residue grep for every legacy color class (`bg-white`, `dark:bg-gray-*`, `text-gray-*`, `bg-gray-*`, `border-gray-*`, `text-green-*`, `bg-green-*`, `border-green-*`, `text-purple-*`, `bg-purple-*`, `text-yellow-*`, `bg-yellow-*`, `text-amber-*`, `bg-red-*`, `text-red-*`, `text-blue-*`) → 0 matches anywhere in `src/`; `success`/`warning` usage grep → confined to payment surfaces only after the fixes above; `package.json`/`package-lock.json` diff since baseline → empty (no new dependency, AD-11 intact).

### Completion Notes List

- All 4 ACs satisfied: shared components (`StatCard`, `EmptyState`, `UnpaidBanner`, `CommunityIdentityMark`) exist, are reused (not re-implemented) across member + admin screens, and every amount/count/capacity/stat value carries `tabular-nums font-semibold`.
- Deep Teal `--primary` + `--success`/`--warning` tokens in place in both `:root` and `.dark`; `paymentStatusVariant` remapped (CONFIRMED→success, PENDING→warning, REJECTED→destructive); `roleBadgeVariant` added and replaces the hardcoded purple OWNER badge everywhere it appeared.
- `success`/`warning` are now confined to payment-state surfaces only (fixed 4 leaks found during audit — see Debug Log).
- Dark-mode/contrast audit (Task 8) verified by construction + exhaustive grep per the story's own Testing standards (no automated visual test tooling exists in this project): zero residual hardcoded gray/green/purple/amber/red classes remain in `src/`.
- No route, guard, Server Action, Prisma query, or schema change — presentation only, per AC4/NFR-8/AD-2. `npx prisma generate` was run to sync the client with an already-existing schema field set (Story 3.1); it did not change the schema itself.
- Regenerated `npx prisma generate` also happened to unblock a pre-existing build break in `admin/members/[id]/page.tsx` unrelated to this story's own edits.

### File List

**Tokens/primitives:** `src/app/globals.css`, `src/components/ui/badge.tsx`, `src/lib/utils.ts`, `src/components/admin/mobile-card.tsx`, `src/components/skeletons/page-skeletons.tsx`, `src/components/ThemeToggle.tsx`, `src/components/ekskul/ekskul-badge.tsx`, `src/components/sessions/rsvp-button.tsx`

**New shared components:** `src/components/community/identity-mark.tsx`, `src/components/ui/stat-card.tsx`, `src/components/payments/unpaid-banner.tsx`, `src/components/ui/empty-state.tsx`

**Shells/nav:** `src/components/layout/member-nav.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`

**Member screens:** `src/app/(main)/dashboard/page.tsx`, `src/app/(main)/payments/page.tsx`, `src/app/(main)/payments/upload/page.tsx`, `src/app/(main)/sessions/page.tsx`, `src/app/(main)/sessions/[id]/page.tsx`, `src/app/(main)/sessions/[id]/pay/page.tsx`, `src/app/(main)/profile/page.tsx`, `src/app/(main)/profile/ekskul-memberships.tsx`, `src/app/(main)/profile/payment-mode-selector.tsx`, `src/app/onboarding/page.tsx`

**Admin screens + card/action siblings:** `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/members/page.tsx`, `src/app/(admin)/admin/members/member-cards.tsx`, `src/app/(admin)/admin/members/[id]/page.tsx`, `src/app/(admin)/admin/payments/page.tsx`, `src/app/(admin)/admin/payments/payment-cards.tsx`, `src/app/(admin)/admin/payments/payment-actions.tsx`, `src/app/(admin)/admin/sessions/page.tsx`, `src/app/(admin)/admin/sessions/session-cards.tsx`, `src/app/(admin)/admin/sessions/new/page.tsx`, `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx`, `src/app/(admin)/admin/ekskul/page.tsx`, `src/app/(admin)/admin/ekskul/ekskul-cards.tsx`, `src/app/(admin)/admin/ekskul/ekskul-actions.tsx`, `src/app/(admin)/admin/settings/page.tsx`

**Additional screens migrated to tokens (same mandate, beyond the original enumerated list):** `src/app/page.tsx` (landing), `src/app/auth/signin/page.tsx`, `src/app/auth/dev/page.tsx`, `src/app/auth/error/page.tsx`, `src/components/ekskul/ekskul-filter.tsx`, `src/components/language-switcher.tsx`

**i18n:** `src/lib/i18n/dictionaries.ts` (banner/empty-state copy, en/id parity)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 4.3 created (ready-for-dev). Visual-language refresh: add Deep Teal `--primary` + `--success`/`--warning` tokens (UX-DR1/2); badge success/warning variants + `paymentStatusVariant` remap + `roleBadgeVariant`; four shared components (CommunityIdentityMark, StatCard, UnpaidBanner, EmptyState); mechanical migration of ~298 hardcoded gray/green/purple/amber/red classes across 15 files to semantic tokens via a fixed Color Migration Map; `tabular-nums` on every amount/count/stat; 3-digit-hex fix in ekskul-badge; full dark-mode + AA contrast audit. Presentation only — no route/guard/mutation/query/dependency change. Builds on 4.2's uncommitted working tree. |
| 2026-07-01 | Story 4.3 dev pass: audited the existing migration against every AC, fixed 4 instances where `success`/`warning` had leaked onto non-payment UI (session "registered" badge, admin manual-attendance toggle, dev-only auth affordances), replaced a locally-reimplemented payment-badge variant map in `admin/members/[id]/page.tsx` with the shared `paymentStatusVariant`, ran `npx prisma generate` to unblock a stale-client build error, and verified `npm run lint` + `npm run build` + full residue grep all pass. Status → review. |

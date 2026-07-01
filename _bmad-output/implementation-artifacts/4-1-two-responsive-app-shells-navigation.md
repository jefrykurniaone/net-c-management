---
baseline_commit: 37d9e34cee0fff54a8dc237e752ef79421630582
---

# Story 4.1: Two responsive app shells & navigation

Status: review

## Story

As a Member or Admin/Owner on any device,
I want a shell and navigation that fits my role and screen,
so that I can move through the app on a phone or a desktop without a broken or cramped layout.

**Epic:** Epic 4 — UI/UX Refresh, Responsiveness & Settings IA
**FRs:** FR-13 (every screen responsive, desktop-first, member surfaces mobile-usable) — this story delivers the **shell + navigation** slice of it.
**Governed by:** AD-11 (refresh, not redesign — reuse shadcn primitives, no new UI dependency / design system), UX-DR16 (two app shells: member = top bar + bottom/sheet nav single-column `max-w-2xl`; admin = sidebar + wide content, sidebar→sheet on mobile), UX-DR18 (responsive matrix across `md`/`lg`), UX-DR19 + NFR-4 (a11y floor: ≥44px targets, visible focus ring, keyboard reachable, text+icon), NFR-5 (desktop-first, member fully mobile-usable, no horizontal scroll, do **not** degrade desktop density), AD-2 + NFR-8 (presentation only — access guards and routing behavior unchanged, no regression).

## Acceptance Criteria

1. **Member shell = top bar + bottom/sheet nav, single centered column.**
   **Given** a Member (or any signed-in user) viewing any `(main)` page,
   **When** the shell renders,
   **Then** it is a **member shell** — a top bar (community identity mark + theme/language/profile controls) with primary navigation as **bottom tab nav on `< md`** and **inline top-bar nav (or sheet) on `≥ md`**, page content in a **single column centered at `max-w-2xl`** — built only on existing shadcn primitives (`sheet`, `dropdown-menu`, `button`, `avatar`, `separator`), with **no new UI dependency or design system** introduced (UX-DR16, AD-11). The member shell does **not** use the desktop sidebar.

2. **Admin shell = sidebar + wide content, sidebar→sheet under `md`.**
   **Given** an Admin/Owner viewing any `(admin)` page,
   **When** the shell renders,
   **Then** it is an **admin shell** — a persistent left **sidebar** with **wide (full-width) content** on `≥ md`, the sidebar **collapsing to a `sheet`** (hamburger) under `md` — built on the **same** shadcn primitives (UX-DR16, UX-DR18). Admin content is **not** clamped to `max-w-2xl`.

3. **Navigation switches correctly at each breakpoint, and every target is a11y-compliant.**
   **Given** the navigation at each Tailwind breakpoint (defaults: sm 640 / md 768 / lg 1024 / xl 1280),
   **When** the viewport crosses `md`/`lg`,
   **Then** the member bottom-nav/sheet and the admin sidebar→sheet switch exactly per the UX-DR18 matrix (`< md`: member bottom nav + admin sheet; `md–lg`: admin sidebar visible; `≥ lg`: admin persistent sidebar + member centered `max-w-2xl`); **every nav target is ≥44px**, keyboard-reachable with a **visible focus ring**, and each item is **text + icon** (never icon-only without an accessible label) (UX-DR18, UX-DR19, NFR-4, NFR-5).

4. **Presentation only — routing and access guards are unchanged (no regression).**
   **Given** the existing routes and twice-enforced access guards,
   **When** the two shells are applied,
   **Then** route grouping (`(main)` / `(admin)`), the `proxy.ts` matcher, and both route-group `layout.tsx` `auth()`/`isAdminRole` redirects are **unchanged** — this is presentation only: **no mutation, no auth/authz, no routing behavior changes**, and no existing member/admin flow regresses (NFR-8, AD-2). Dark mode continues to work on both shells via `next-themes`.

5. **Role-correct nav content in each shell; an admin can reach both.**
   **Given** the split shells,
   **When** navigation renders,
   **Then** the **member shell shows member nav** (Dashboard, Sessions, Payments, Profile) and the **admin shell shows admin nav** (Admin Dashboard, Manage Sessions/Payments/Members/Activities, Settings); an Admin/Owner in the member shell has a way to **enter the admin shell** (an "Admin" nav entry/link) and vice-versa, so no destination becomes unreachable (parity with today's combined sidebar — NFR-8).

6. **No horizontal scroll; desktop density preserved; content not hidden behind fixed nav.**
   **Given** member surfaces on a phone and admin surfaces on desktop,
   **When** the shells render at mobile / tablet / desktop widths,
   **Then** there is **no horizontal scroll or clipped chrome**, the fixed member bottom nav does **not** overlap page content (content has bottom padding to clear it) and respects safe-area insets, and the desktop admin layout is **not degraded** to serve mobile — desktop information density is preserved (NFR-5 counter-metric, AD-11). The member top bar / admin sidebar stay put while content scrolls (existing `overflow` behavior retained).

## Tasks / Subtasks

- [x] **Task 1 — Split navigation data by role/shell (AC: 5)** — `src/components/layout/`
  - [x] The current `sidebar.tsx` and `mobile-nav.tsx` each **duplicate** a `MEMBER_NAV` + `ADMIN_NAV` array and the initials/logo/footer blocks. Extract the nav model + shared bits **once** to avoid drift: add `src/components/layout/nav-items.ts` (or a tiny hook) exporting `getMemberNav(t)` and `getAdminNav(t)` returning `{ label, href, icon }[]` from the existing `t.nav.*` keys. Both shells import from here (DRY — single source of nav truth). Keep it a plain module (no client-only imports) so either shell can use it.
  - [x] Member nav = Dashboard `/dashboard`, Sessions `/sessions`, Payments `/payments`, Profile `/profile`. Admin nav = Admin `/admin`, Sessions `/admin/sessions`, Payments `/admin/payments`, Members `/admin/members`, Activities `/admin/ekskul`, Settings `/admin/settings`. Reuse the exact `lucide-react` icons already used (`LayoutDashboard`, `CalendarDays`, `CreditCard`, `Users`, `Shapes`, `Settings`, `ShieldCheck`, `User`).
  - [x] Preserve the existing **active-link** rule verbatim: `isActive = pathname === href || pathname.startsWith(href + '/')`, with the admin-root special-case `href !== '/admin'` guard so `/admin` is not marked active on every `/admin/*` child. Do not change this logic. (Implemented as `isNavActive(pathname, href)` in `nav-items.ts`.)

- [x] **Task 2 — Member shell: top bar + bottom nav, single column `max-w-2xl` (AC: 1, 3, 6)**
  - [x] Rewrite `src/app/(main)/layout.tsx` to render the **member shell** (kept a server component: it still does `auth()` + `getSettings()` + the `!session.user` / `!isProfileComplete` redirects — untouched, AC4). Replaced the `Sidebar` + mobile-topbar markup with `MemberTopBar` (sticky) + a `<main>` whose content is wrapped `mx-auto w-full max-w-2xl` + `MemberBottomNav`. `<main>` uses `pb-24 md:pb-6` so the fixed bottom nav never overlaps content (AC6). Outer frame is `flex flex-col h-screen overflow-hidden`, `<main>` is `flex-1 overflow-y-auto` (header/bottom-nav stay put, content scrolls).
  - [x] New client component `src/components/layout/member-nav.tsx`: renders the member primary nav two ways from one `getMemberNav(t)` source — (a) `MemberBottomNav` = **fixed bottom tab bar** `fixed bottom-0 inset-x-0 md:hidden` with `pb-[env(safe-area-inset-bottom)]`, each tab an icon-over-shortLabel `<Link>` (`min-h-14`, ≥44px); (b) `MemberTopBar` inline horizontal links `hidden md:flex`. Both use `isNavActive` (Task 1). Admin users additionally get an **"Admin"** entry (icon `ShieldCheck`, href `/admin`) via `useMemberItems`. Uses `useSession()` for `isAdminRole`, `usePathname()` for active state, `useLocale()`+`getDictionary` for labels.
  - [x] Folded the top bar + profile menu into `member-nav.tsx` (`MemberTopBar` + internal `ProfileMenu`/`IdentityMark`): identity mark + a **profile/account menu** using shadcn `dropdown-menu` containing the user name label, Profile link, `LanguageSwitcher`, `ThemeToggle`, Sign Out. Reuses `Avatar`/`AvatarFallback` + `signOut({ callbackUrl: '/' })`. Top bar is `sticky top-0 z-30` (AC6).
  - [x] **Short labels for the bottom bar:** `t.nav.sessionsShort` / `t.nav.paymentsShort` (added in Task 5) are used by the bottom bar via `shortLabel`; the inline desktop nav uses the full labels. Dashboard/Profile/Admin have no short variant (their labels already fit).

- [x] **Task 3 — Admin shell: sidebar + sheet, wide content (AC: 2, 3, 6)**
  - [x] `src/app/(admin)/layout.tsx` renders the **admin shell** — left unchanged (server-component guards `auth()`/`getSettings()`/`!session.user`/`!isProfileComplete`/`!isAdminRole → /dashboard` intact, AC4). Structure stays `hidden md:flex` sidebar + mobile topbar-with-hamburger; content is already **full-width** (`flex-1`, no `max-w-2xl` clamp — AC2/NFR-5). The `Sidebar`/`MobileNav` prop contract (`communityName`/`logoUrl`) is unchanged, so no layout edit was needed.
  - [x] Refactored `src/components/layout/sidebar.tsx` into the **admin sidebar**: renders `getAdminNav(t)` as the primary section (dropped the now-duplicated member-nav block and the `isAdmin` conditional — the `(admin)` layout already gates admins), added a **"member view"** link back to `/dashboard` (icon `LayoutDashboard`, AC5). Kept the footer (avatar + name/email, Profile, `LanguageSwitcher`, `ThemeToggle`, Sign Out) and the `ChevronRight` active indicator; all `dark:` classes preserved; nav targets given `min-h-11` + `focus-visible:ring`.
  - [x] Refactored `src/components/layout/mobile-nav.tsx` (admin `Sheet`) to render the **same admin nav** via `getAdminNav(t)` + the member-view link. **Fixed the dark-mode gaps** in `NavLinks`: header/footer/label classes (`border-gray-100`, `text-gray-900`) now carry `dark:` variants at parity with `sidebar.tsx`; the hamburger `sr-only` + `SheetTitle` now route through `t.nav.navigationMenu`. No brand-token restyle (that is Story 4.3).
  - [x] Sidebar visible `≥ md` (`hidden md:flex` in the admin layout), sheet `< md` — unchanged `md:` switch, matches the UX-DR18 matrix.

- [x] **Task 4 — A11y + focus + tap targets on all nav (AC: 3)**
  - [x] Every nav `<Link>`/`<button>` (member bottom tab, member inline link, admin sidebar link, admin sheet link, hamburger trigger, profile-menu trigger) has a **visible focus ring** (`focus-visible:ring-2 focus-visible:ring-ring`; the `Button` hamburger keeps the shadcn default) and a **≥44px touch target** (`min-h-11` on links/buttons; bottom tabs `min-h-14`). Icon-only controls carry an `sr-only`/`aria-label`: the hamburger `sr-only` + `SheetTitle` use `t.nav.navigationMenu`; the profile-menu trigger uses `aria-label={t.nav.profile}`.
  - [x] Active nav links expose `aria-current='page'` (in addition to the visual active state). The member bottom nav + top-bar nav + admin sidebar/sheet nav are `<nav aria-label=…>` landmarks; the member top bar is a `<header>`.

- [x] **Task 5 — i18n: short nav labels, en/id parity (AC: 3, 5)** — `src/lib/i18n/dictionaries.ts`
  - [x] Added to the **`nav`** group (both `en` and `id`): `sessionsShort` (`'Sessions'` / `'Sesi'`), `paymentsShort` (`'Payments'` / `'Iuran'`), `admin` (`'Admin'` / `'Admin'`), and `memberView` (`'Member View'` / `'Tampilan Anggota'`) for the admin→member link. Reused existing `dashboard`/`profile`/`signOut`/`navigationMenu`/`mainLabel`/`adminLabel`/`admin*` keys. en/id parity kept (type-checked by the build).
  - [x] Every nav string routes through the dictionary — no hardcoded label in any new/edited shell component (NFR-6).

- [x] **Task 6 — Verify (NFR-7, NFR-8, NFR-5)**
  - [x] `npx eslint` on all 6 changed files → "No issues found" (exit 0). `npm run build` → green (types check; `/sessions/[id]/pay` + all routes present; Proxy/middleware intact).
  - [x] Manual reasoning/responsive/regression checks per "Testing standards" below (member top-bar/bottom-nav switch at `md`; admin sidebar↔sheet at `md`; light+dark; keyboard focus rings; `max-w-2xl` member / full-width admin; guards + `proxy.ts` untouched).

## Dev Notes

### What this story changes (READ FIRST)
Today **both** route groups share one combined shell: `(main)/layout.tsx` **and** `(admin)/layout.tsx` render the **same** `Sidebar` (desktop) + `MobileNav` (mobile sheet), and those components render **member nav always + admin nav when `isAdminRole`**. This story **splits them into two purpose-built shells** (UX-DR16):

1. **Member shell** (`(main)`): top bar + **bottom tab nav** (`< md`) / inline top nav (`≥ md`), content **centered `max-w-2xl`**. **Drops the desktop sidebar for members.**
2. **Admin shell** (`(admin)`): keeps the **sidebar** (`≥ md`) / **sheet** (`< md`), content **full-width**, nav = **admin nav** (+ a link back to the member view).

This is **presentation only** — no route, `proxy.ts`, `auth()` guard, mutation, or data change (AC4, NFR-8). It is also **structure/navigation only**: the Deep Teal accent-token migration (UX-DR1), the shared-component visual refresh, and the full dark-mode contrast audit are **Story 4.3** — keep the existing `green-*`/`purple-*` accent classes here (only bring the admin **sheet** up to the dark-mode parity the sidebar already has). Full-screen responsiveness of *page content* (tables→cards, onboarding) is **Story 4.2** — this story fixes only the **shell/nav**.

### ⚠️ UX divergence to confirm (member desktop loses its sidebar)
The current member experience on desktop is a **left sidebar**. UX-DR16 specifies the member shell as **"top bar + bottom/sheet nav"** — i.e. **no desktop sidebar** for members; on `≥ md` the primary nav lives **inline in the top bar**. Implement per UX-DR16 (top bar). If the product owner prefers to *retain* a member sidebar on desktop and only add the bottom nav on mobile, that is a smaller change — but it contradicts UX-DR16 as written. **Default: follow UX-DR16 (top bar, no member sidebar).**

### Files to REUSE — do not reinvent (AD-11: no new dependency)
- **shadcn primitives already installed** (`src/components/ui/`): `sheet`, `dropdown-menu`, `button` (has focus-visible ring + `size='icon'`), `avatar`, `separator`, `skeleton`, `card`. Build both shells from these — **add no dependency, no `shadcn add sidebar` block, no design system** (AD-11).
- **Identity mark pattern:** the logo-or-`communityAbbr()`-fallback block already exists (see `(main)/layout.tsx:42-61` mobile header and `sidebar.tsx:70-91`). Reuse it verbatim for the member top bar and admin sidebar header; `communityAbbr` + `isAdminRole` come from `@/lib/utils`.
- **Client-nav pattern:** `usePathname()` active state + `useSession()` role + `useLocale()`+`getDictionary(locale)` labels + `cn()` class-merge + `signOut({ callbackUrl: '/' })` — all demonstrated in `sidebar.tsx` / `mobile-nav.tsx`. Mirror them; do not invent a new nav abstraction or a route config framework.
- **Theme + language controls:** `ThemeToggle` (`@/components/ThemeToggle`) and `LanguageSwitcher` (`@/components/language-switcher`) already exist and are used in both current nav footers — reuse as-is (do not re-implement theme switching; `next-themes` is already wired in the root layout).
- **Settings source:** the layouts already fetch `getSettings()` (server-only) and pass `communityName`/`logoUrl` down. Keep that server→client prop flow; do not call `getSettings()` from a client component.

### Guardrails — what must NOT change (AC4, NFR-8)
- **`src/proxy.ts`** — untouched. No matcher change (all existing `(main)`/`(admin)` routes already covered).
- **Both layout guards** — the `auth()` call, the `!session?.user → /auth/signin`, `!isProfileComplete → /onboarding`, and (admin) `!isAdminRole → /dashboard` redirects stay **exactly** as they are. Layouts remain **server components** (they must, to run `auth()`); only the presentational children become/stay client components.
- **No Server Actions, no new API route, no data mutation** — AR-2 (single mutation boundary via `src/app/api/**`) is not touched; this story adds zero mutations.
- **`/onboarding` and `/auth/*`** live **outside** `(main)`/`(admin)` — they get neither shell and are out of scope here (onboarding responsiveness = Story 4.2).
- Keep the existing `h-screen overflow-hidden` outer frame + `overflow-y-auto` scroll region so the top bar/sidebar stay fixed while content scrolls (AC6) — don't regress into a doubly-scrolling body.

### Responsive matrix target (UX-DR18) — the switch points
| Width | Member shell | Admin shell |
|---|---|---|
| `< md` (<768) | single column, full-width cards, **bottom tab nav**; top bar with profile menu | content stacked; **sidebar → sheet** (hamburger in top bar) |
| `md–lg` (768–1023) | content centered, inline top-bar nav | **sidebar visible** + wide content |
| `≥ lg` (≥1024) | content **centered `max-w-2xl`**, inline top-bar nav | **persistent sidebar** + full-width content |

Member primary nav = **bottom bar `< md`**, **inline top-bar `≥ md`**. Admin primary nav = **sheet `< md`**, **sidebar `≥ md`**. Desktop-first: author the desktop layout, adapt **down** with `sm:`/`md:`; never degrade desktop density (NFR-5 counter-metric).

### Code-quality caps (NFR-7)
Functions ≤ 40 lines · files ≤ 300 lines · nesting ≤ 3 (early return) · named consts (no magic numbers — e.g. a `MAX_CONTENT = 'max-w-2xl'` or just the Tailwind class inline is fine; the 44px target as `min-h-11`) · naming (`PascalCase.tsx` components, `camelCase` fns, booleans `is`/`has`/`should`). If a shell component would exceed 300 lines, split the top bar / bottom nav / sidebar into their own files (the Task 2/3 breakdown already anticipates this). ESLint (next core-web-vitals + ts) via pre-commit.

### Next.js 16 / project specifics
- Route groups `(main)` / `(admin)` and their `layout.tsx` are Next 16 App Router server layouts — read `node_modules/next/dist/docs/` before altering layout/data-fetching shape if unsure. Do **not** create a `middleware.ts` (middleware is `src/proxy.ts` in Next 16).
- Client components need `'use client'` (the nav/top-bar/sidebar/sheet are interactive → client; the layouts stay server). `src/lib` must not import from `src/app` (AR-2) — `nav-items.ts` under `src/components/layout/` may import icons + dictionary types only.
- `next/image` for the logo (as today); the `communityAbbr` fallback avoids a broken-image placeholder (UX-DR9 lineage from Epic 1).

### Scope boundary
- **In scope:** rewrite `(main)/layout.tsx` (member shell) + `(admin)/layout.tsx` (admin shell); new `member-nav.tsx` (bottom + inline) and member top bar/profile menu; refactor `sidebar.tsx` → admin sidebar (+ member-view link) and `mobile-nav.tsx` → admin sheet (+ dark-mode fix); extract `nav-items.ts`; a11y (focus ring, 44px, `aria-current`); short nav i18n keys (en/id). Dark mode must **work** on both shells.
- **NOT in scope:** the Deep Teal accent-token swap + full visual-language refresh + dark-mode **contrast audit** (Story 4.3); page-content responsiveness — admin tables→stacked cards, member two-up, onboarding form (Story 4.2); the Settings IA cleanup (Story 4.4); any `proxy.ts` / route / `auth()` / mutation change; any new dependency or shadcn block install.

### References
- [Source: epics.md#Story 4.1] (lines 485-507) — ACs + FR-13 mapping
- [Source: epics.md#UX-DR16] (line 96) — two app shells (member top bar + bottom/sheet nav `max-w-2xl`; admin sidebar → sheet)
- [Source: epics.md#UX-DR18] (line 98) — responsive matrix (`< md` / `md–lg` / `≥ lg`)
- [Source: epics.md#UX-DR19] (line 99) + [#NFR-4] (line 51) — a11y floor (≥44px, focus ring, text+icon, keyboard)
- [Source: epics.md#NFR-5] (line 52) — desktop-first, member mobile-usable, don't degrade desktop density; Tailwind breakpoints
- [Source: epics.md#AD-11 / Epic 4 intro] (lines 136-137, 483) — refresh not redesign; reuse shadcn; no new dependency
- [Source: src/app/(main)/layout.tsx:1-71] — current member layout (server guards to preserve + mobile header pattern to reuse)
- [Source: src/app/(admin)/layout.tsx:1-69] — current admin layout (server guards to preserve; `isAdminRole` redirect)
- [Source: src/components/layout/sidebar.tsx:1-192] — combined sidebar → refactor to admin sidebar; dark-mode reference; active-link rule
- [Source: src/components/layout/mobile-nav.tsx:1-212] — combined mobile sheet → refactor to admin sheet; **dark-mode gaps to fix** in `NavLinks`
- [Source: src/lib/i18n/dictionaries.ts:12-30, 461-479] — `nav` group (en/id) to extend with short labels
- [Source: src/components/ui/] — installed shadcn primitives (`sheet`, `dropdown-menu`, `button`, `avatar`, `separator`, `skeleton`, `card`) — the only building blocks
- [Source: src/app/layout.tsx:36-60] — root layout: `ThemeProvider`/`AuthProvider`/`LocaleProvider` already wrap the app (theme/session/locale available to shells)
- [Source: project-context.md] — Next 16 `proxy.ts` rule, twice-enforced guards, server-only settings/dictionary, code-quality caps, i18n-through-dictionary
- [Source: 3-5-…atomic.md] — prior story: the new `/sessions/[id]/pay` member page must render correctly inside the new member shell (it is a `(main)` route); verify it isn't clipped by the bottom nav

### Testing standards
No automated tests in this project. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual reasoning/visual checks:
- **Member shell — mobile (`< md`):** bottom tab nav visible + fixed; content single-column, not hidden behind the nav; top-bar profile menu opens (Profile / language / theme / sign out); no horizontal scroll; the `/sessions/[id]/pay` uploader and dashboard/sessions/payments pages clear the bottom nav.
- **Member shell — desktop (`≥ md`, `≥ lg`):** inline top-bar nav; content centered `max-w-2xl` (not stretched); no member sidebar.
- **Admin shell — mobile (`< md`):** sidebar hidden, hamburger opens the sheet with **admin** nav; content full-width; sheet renders correctly in **dark mode** (the fixed gaps).
- **Admin shell — desktop (`≥ md`):** sidebar visible; content full-width (not `max-w-2xl`); active link + `ChevronRight` correct; `/admin` not marked active on `/admin/sessions`.
- **Cross-shell:** an admin in the member shell sees an "Admin" entry → `/admin` (enters admin shell); the admin sidebar has a "member view" → `/dashboard`. No destination reachable today becomes unreachable.
- **A11y:** keyboard-tab reaches every nav target with a visible focus ring; each target ≥44px on member surfaces; active link exposes `aria-current='page'`; icon-only controls have `sr-only` labels.
- **Both light + dark:** both shells render correctly in each theme (via `next-themes`); no light-only artifact in the admin sheet.
- **No regression (NFR-8, AC4):** `proxy.ts` unchanged; both layouts still redirect unauth→`/auth/signin`, incomplete→`/onboarding`, non-admin→`/dashboard`; all member and admin routes load; sign-out, language, and theme toggles still work.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npx eslint` on all 6 changed files → "No issues found" (exit 0).
- `npm run build` → green: full route table emitted (all `(main)`/`(admin)` routes + `/sessions/[id]/pay` present, `ƒ Proxy (Middleware)` intact); no type errors from the dictionary additions or the layout/nav refactor.
- Design fork confirmed with the product owner before coding: member desktop = **top bar, no sidebar** (UX-DR16 spec), not a retained member sidebar.

### Completion Notes List

- **Task 1 — `nav-items.ts` (shared nav model):** extracted `getMemberNav(t)` / `getAdminNav(t)` (returning `NavItem[] = { label, shortLabel?, href, icon }`) and `isNavActive(pathname, href)` (preserves the exact prior rule incl. the `/admin` exact-match special case) into a plain, client-safe module. Both shells import from here — single source of nav truth, no more duplicated `MEMBER_NAV`/`ADMIN_NAV` arrays.
- **Task 2 — member shell:** rewrote `(main)/layout.tsx` (server guards untouched) to `MemberTopBar` (sticky top bar: identity mark + inline desktop nav `hidden md:flex` + `ProfileMenu` dropdown) + centered `max-w-2xl` `<main>` (`pb-24 md:pb-6`) + `MemberBottomNav` (`fixed … md:hidden`, safe-area inset, icon-over-short-label tabs). `ProfileMenu` uses shadcn `dropdown-menu` with the user name, Profile link, `LanguageSwitcher`, `ThemeToggle`, Sign Out. Admin users get an extra "Admin" entry into the admin shell. **Member desktop no longer has a sidebar** (UX-DR16).
- **Task 3 — admin shell:** refactored `sidebar.tsx` and `mobile-nav.tsx` to render **admin nav** via `getAdminNav(t)` + a "member view" link back to `/dashboard`; dropped the member-nav duplication and the `isAdmin` conditional (the `(admin)` layout already gates admins). `(admin)/layout.tsx` unchanged (props stable; content already full-width). Fixed the mobile sheet's dark-mode gaps (header/footer/label `dark:` variants) and routed its `sr-only`/`SheetTitle` through `t.nav.navigationMenu`.
- **Task 4 — a11y:** every nav target has `focus-visible:ring-2 focus-visible:ring-ring` + ≥44px (`min-h-11`, bottom tabs `min-h-14`); active links expose `aria-current='page'`; nav landmarks labelled; profile-menu trigger + hamburger have accessible labels.
- **Task 5 — i18n:** added `nav.sessionsShort`/`paymentsShort`/`admin`/`memberView` (en/id parity); no hardcoded nav strings.
- **Task 6 — verify:** eslint (6 files) exit 0; build green. Presentation-only — `proxy.ts`, both layout `auth()`/role guards, all routes, and every mutation path are untouched (NFR-8, AC4). Dark mode works on both shells (`next-themes`). The Deep-Teal token migration, page-content responsiveness (tables→cards, onboarding), and Settings IA remain deferred to Stories 4.2/4.3/4.4 as scoped.

### File List

- `src/components/layout/nav-items.ts` (A) — `getMemberNav`/`getAdminNav`/`isNavActive`, `NavItem` type, shared icons
- `src/components/layout/member-nav.tsx` (A) — `MemberTopBar` + `MemberBottomNav` (+ internal `IdentityMark`/`ProfileMenu`/`useMemberItems`)
- `src/app/(main)/layout.tsx` (M) — member shell: top bar + centered `max-w-2xl` main + bottom nav (guards unchanged)
- `src/components/layout/sidebar.tsx` (M) — now the admin sidebar (admin nav + member-view link; a11y + focus targets)
- `src/components/layout/mobile-nav.tsx` (M) — now the admin sheet (admin nav + member-view link; dark-mode fixes; dict-routed labels)
- `src/lib/i18n/dictionaries.ts` (M) — `nav.sessionsShort`/`paymentsShort`/`admin`/`memberView` (en/id)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 4.1 created (ready-for-dev). Two responsive app shells & navigation — member shell (top bar + bottom/sheet nav, `max-w-2xl`) vs admin shell (sidebar → sheet, wide content); a11y floor; presentation-only, no route/guard change. |
| 2026-07-01 | Story 4.1 implemented → review. Split the combined shell into a member shell (`MemberTopBar` + `MemberBottomNav`, centered `max-w-2xl`, profile dropdown; member desktop drops the sidebar per UX-DR16) and an admin shell (`Sidebar`/`MobileNav` now admin-nav + member-view link, mobile-sheet dark-mode fixed). Extracted `nav-items.ts` (shared nav model). Added `nav.sessionsShort`/`paymentsShort`/`admin`/`memberView` (en/id). a11y: ≥44px targets, focus rings, `aria-current`. `npx eslint` (6 files) + `npm run build` green; `proxy.ts`/guards/routes untouched (NFR-8, AC4). |

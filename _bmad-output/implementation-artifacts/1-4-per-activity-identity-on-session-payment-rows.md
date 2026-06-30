---
baseline_commit: bf58946006ff3cfd17c37fd964f94dbfdc1bfea9
---

# Story 1.4: Per-Activity identity on Session & Payment rows

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Member or Admin viewing lists,
I want each Session and Payment row to visually carry its Activity's own name, color, and icon,
So that I can tell which Activity a row belongs to at a glance.

**Epic:** Epic 1 — Activity-Agnostic Rebrand & Identity
**FRs:** FR-5 (per-Activity identity shown consistently — each Activity's name/icon/color marks its Session and Payment rows; Activity-scoped member visibility preserved). Completes Epic 1's last FR.
**Governed by:** AD-10 (Activity identity is data, never hardcoded), AD-3 / NFR-1 (Activity-ekskul data scoping is a security invariant — member reads via `getUserEkskulIds`, Admin/Owner see all), NFR-4 / UX-DR19 (WCAG 2.2 AA: state conveyed by text+icon, never color alone).
**UX contract:** UX-DR4 (Activity badge = icon chip + name, AA-contrast foreground over runtime color), UX-DR5 (3px left accent bar in the Activity color on every Session/Payment row).

## Acceptance Criteria

1. **Badge (icon chip + name) and accent bar identify every row.**
   **Given** any Session row or Payment row on the member (`(main)`) **and** admin (`(admin)`) lists,
   **When** it renders,
   **Then** an **Activity badge** — a leading icon chip **plus** the Activity `name`, tinted with the Activity's runtime `color` — and a **3px left accent bar** in the same Activity color identify the row (UX-DR4, UX-DR5, FR-5). The icon chip is always present: it shows the Activity's configured `Ekskul.icon` when set, otherwise a neutral default icon (the icon is decorative — `aria-hidden` — and the Activity `name` text carries the accessible label, so identity is never color-only per NFR-4).

2. **Foreground auto-selected for WCAG 2.2 AA contrast over any Activity color.**
   **Given** an Activity's configured `color` (an arbitrary admin-chosen hex),
   **When** the badge renders its icon/text foreground over that color,
   **Then** the foreground (black or white) is chosen by a **true WCAG 2.2 relative-luminance contrast ratio** — sRGB-linearized luminance, `(L_lighter + 0.05) / (L_darker + 0.05)` — selecting whichever foreground yields the higher ratio, so the most-readable AA-aligned choice is used for any color (UX-DR4, NFR-4). A malformed/short hex falls back to white without crashing.

3. **Member visibility stays Activity-scoped; Admin/Owner see all (security invariant).**
   **Given** a Member viewing Sessions or Payments,
   **When** rows are queried,
   **Then** they see only Activities they belong to — member Session reads stay scoped via `getUserEkskulIds` (`ekskulId: { in: myEkskulIds }`) and member Payment reads stay scoped by `userId` to the member's own rows; **Admin/Owner** (`isAdminRole`) see all rows (AD-3 / NFR-1). No query added or widened by this story may leak cross-ekskul data.

4. **A cross-Activity list stays visually distinguishable.**
   **Given** a list containing rows from different Activities (e.g. an admin Sessions/Payments table, or a member who belongs to multiple Activities),
   **When** it is displayed,
   **Then** rows from different Activities remain distinguishable by the badge **and** the accent bar — never an undifferentiated stack (UX-DR5, FR-5).

---

## Tasks / Subtasks

> **Read the Dev Notes "Reality check" first.** The Activity badge (name + runtime color + auto-contrast foreground) and the four list surfaces already exist and are already ekskul-scoped. The honest deliverable is: **add the icon chip + accent bar, upgrade the contrast math to true WCAG, and audit the scoping** — not a rebuild. Do NOT add an admin icon-picker, do NOT restyle the rows, do NOT do the green→teal accent swap (that is Story 4.3).

- [x] **Task 1 — Upgrade `readableText()` to a true WCAG 2.2 AA contrast choice (AC: 2)**
  - [x] In `src/components/ekskul/ekskul-badge.tsx`, replace the YIQ perceived-brightness threshold with the WCAG relative-luminance computation: for each sRGB channel `c` in `[0,1]`, linearize `c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4`; `L = 0.2126*r + 0.7152*g + 0.0722*b`; contrast ratio `(Llight + 0.05)/(Ldark + 0.05)`.
  - [x] Compute the contrast ratio of the background color against **both** candidate foregrounds (white `#ffffff` and the existing dark token `#1f2937`) and return whichever gives the **higher** ratio. Keep the existing malformed/short-hex → `#ffffff` guard.
  - [x] Replace the magic-number weights/threshold with named WCAG constants (`SRGB_THRESHOLD = 0.03928`, channel coefficients, `CONTRAST_OFFSET = 0.05`). Keep each function ≤ 40 lines (extract a small `relativeLuminance(hex)` and a `contrastRatio(a,b)` helper if needed); nesting ≤ 3.

- [x] **Task 2 — Add the icon chip to `EkskulBadge` (AC: 1)**
  - [x] Add an optional prop `icon?: string | null` to `EkskulBadge`. Render a **leading lucide icon** (`aria-hidden`, decorative) before the `name`, inside the existing `<Badge>` (the base Badge already auto-sizes a child `svg` to `size-3` and applies `gap-1` — see `badge.tsx:7-8`, no Badge change needed). The icon inherits the chosen foreground color.
  - [x] Resolve the icon from a **small curated static map** of lucide components (e.g. a `const ACTIVITY_ICONS: Record<string, LucideIcon>` in the badge file or a sibling `activity-icons.ts`), keyed by lowercased icon name, with a neutral **default fallback** icon (use `Shapes` — the same lucide icon the nav uses for "Activity", see `sidebar.tsx`/`mobile-nav.tsx`). A `null`/empty/unknown `icon` resolves to the default so the chip is **always** present (AC1).
  - [x] Do **NOT** use `lucide-react/dynamic` or import the whole `icons` map — `lucide-react` is pinned at `^1.14.0` (dynamic-icon API/SSR behavior is version-uncertain) and importing all icons bloats the bundle. Static imports keep `EkskulBadge` a **server-renderable** component (it has no `'use client'` today — keep it that way).
  - [x] Keep the prop **optional and backward-compatible**: the other 7 call sites (`dashboard`, `profile`, admin dashboard, members list/detail, ekskul management, session detail) pass only `name`/`color` today and must keep compiling — they'll simply render the default icon. Per UX-DR4 ("appears wherever an Activity is named"), an icon chip on those surfaces is on-spec, not a regression.

- [x] **Task 3 — Thread `Ekskul.icon` into the four Session/Payment row queries (AC: 1)**
  - [x] Add `icon: true` to the `ekskul: { select: { … } }` block in all four surfaces and pass `icon={…ekskul.icon}` to each `EkskulBadge`:
    - `src/app/(main)/sessions/page.tsx` (query select ~L43; badge ~L95)
    - `src/app/(main)/payments/page.tsx` (query select ~L35; badge ~L120)
    - `src/app/(admin)/admin/sessions/page.tsx` (query select ~L43; badge ~L111) — also add `icon: string | null` to the local `type SessionRow.ekskul`.
    - `src/app/(admin)/admin/payments/page.tsx` (query select ~L55; badge ~L162) — also add `icon: string | null` to the local `type PaymentRow.ekskul`.
  - [x] Do not change query `where`/`orderBy`/scoping — only widen the `select`.

- [x] **Task 4 — Add the 3px left accent bar to every Session/Payment row (AC: 1, 4)**
  - [x] Add a **3px-wide, full-height left accent** in the Activity `color` to each row on the four surfaces above. **Recommended technique** (works for both card rows and table rows, no Tailwind-JIT issue, no conflict with the cards' `hover:shadow-sm`): make the row container/cell `relative` (+ `overflow-hidden` on the rounded cards) and render a decorative `aria-hidden` accent element `<span className="absolute left-0 top-0 h-full w-[3px]" style={{ backgroundColor: ekskul.color }} />`. (Tailwind can't JIT a runtime DB color — the color must be an **inline style**, same rationale as `EkskulBadge`.)
    - Member sessions: the row `<div>` inside the `<Link>` (`sessions/page.tsx` ~L88).
    - Member payments: the row `<div>` (`payments/page.tsx` ~L110).
    - Admin sessions: the `<tr>` / its first `<td>` (`admin/sessions/page.tsx` ~L104) — put the accent in a `relative` first cell so it reads as a left bar on the row.
    - Admin payments: the `<tr>` / its first `<td>` (`admin/payments/page.tsx` ~L151).
  - [x] The accent bar is a **redundant** color cue paired with the text+icon badge — it must be `aria-hidden` and must not be the only identity signal (NFR-4). Keep ≥44px effective row tap targets on member surfaces (the bar is decorative and doesn't shrink the target).

- [x] **Task 5 — Verify Activity-scoping holds (AC: 3) — read-only audit, no change expected**
  - [x] Confirm member Session reads stay `ekskulId: selected ?? { in: myEkskulIds }` and the `selected` filter is still guarded by `myEkskulIds.includes(...)` (`sessions/page.tsx`).
  - [x] Confirm member Payment reads stay `userId: session.user.id` (inherently the member's own rows).
  - [x] Confirm both admin pages remain `isAdminRole`-gated and unscoped (Admin/Owner see all). Widening the `select` to include `icon` must not touch any `where`.

- [x] **Task 6 — Final audit & verification (AC: 1, 2, 3, 4)**
  - [x] Grep that every `EkskulBadge` usage still compiles and that no row hardcodes an Activity color/name outside `ekskul.color`/`ekskul.name` (identity stays data-sourced — AD-10).
  - [x] `npm run lint` clean; `npm run build` passes (the `const id: typeof en` i18n parity guard still holds; routes remain dynamic). No new dependencies, no new dictionary keys, no schema change. No regression (NFR-7, NFR-8).

---

## Dev Notes

### Reality check — what already works (read FIRST; this story is extend + harden, not build)
This is a **brownfield productization pass** (like Stories 1.1–1.3). The Activity-color system already exists from the ekskul-management feature (commit `7afeff1`). When you open the files you will find:
- **`EkskulBadge` already renders the Activity `name` tinted with the runtime `ekskul.color`** and already auto-selects a black/white foreground (`src/components/ekskul/ekskul-badge.tsx`). It is used on **all four** Session/Payment list surfaces plus 7 other Activity-naming surfaces.
- **All four list queries already `select` `ekskul.color`** and pass it to the badge.
- **Scoping already holds:** member Sessions use `ekskulId: { in: myEkskulIds }` (`getUserEkskulIds`), member Payments use `userId`, both admin pages are `isAdminRole`-gated and see all.

**The three genuine gaps to close (the deliverable):**
1. **No icon chip.** `Ekskul.icon` exists in the schema (`schema.prisma:122`, "optional lucide icon name") but is **never selected, never rendered, and never set** (the ekskul admin form/zod schema/`/api/ekskul` have no `icon` field). The badge shows name-only. **Task 2 + 3** add an always-present icon chip (configured icon if set, neutral default otherwise) and thread `icon` through the four queries.
2. **No accent bar.** No Session/Payment row has the 3px left accent today. **Task 4** adds it (inline-style color, decorative).
3. **Contrast is an approximation, not WCAG.** `readableText()` uses the YIQ perceived-brightness formula with a `0.6` threshold — a common heuristic, but **not** the WCAG 2.2 relative-luminance contrast ratio the AC and the locked a11y floor (WCAG 2.2 AA) require. **Task 1** upgrades it to the real sRGB-linearized luminance + contrast-ratio max-choice.

### Scope boundary (prevents over-reach)
**In scope (FR-5):** add icon chip + accent bar to the four Session/Payment surfaces, upgrade the contrast math, audit scoping. The `EkskulBadge` change (icon chip) is **global by design** — UX-DR4 says the badge "appears wherever an Activity is named," so every call site gaining a default icon chip is correct, not scope creep. The **accent bar** is added **only** to the four Session/Payment list surfaces (UX-DR5 is row-specific).

**NOT in scope — hard boundaries:**
- **Admin icon-picker / setting `Ekskul.icon`.** The ekskul create/edit form (`ekskul-actions.tsx`), zod schema (`validations/ekskul.ts`), and `/api/ekskul` do **not** capture `icon`. Adding an icon-picker is **out of scope** — the badge's default-icon fallback satisfies AC1 today; let admins keep getting the neutral default until a later admin-config/Settings-IA story adds a picker. **Flag it** in Completion Notes; do not build it here.
- **Green → Deep Teal accent swap (UX-DR1) and shared-component consolidation.** The page chrome still uses `bg-green-600`/`text-green-600` accents. **Leave them.** Stories 1.1–1.3 all deferred the green→teal swap to **Story 4.3** (which owns the platform accent + shared components). The Activity accent bar/badge use the **per-Activity runtime color**, which is independent of the platform accent — do not retint them to teal.
- **Responsive admin-table → stacked-card collapse.** Admin tables use `overflow-x-auto` today; collapsing them to cards under `md` is **Story 4.2** (full responsiveness). Just add the accent bar to the current table rows.
- **Session detail / dashboard / members / profile redesign.** Those surfaces use `EkskulBadge` and will inherit the icon chip automatically (good). Do **not** add accent bars there or restyle them — they are not "Session/Payment rows."
- **Renaming `BadmintonSession`/`Ekskul` or schema changes.** The model accessor stays `prisma.badmintonSession`; `Ekskul` stays the table name. The `BadmintonSession → ActivitySession` rename is **Story 2.1**. No `db push` in this story.

### Files to touch
- **UPDATE** `src/components/ekskul/ekskul-badge.tsx` — (a) upgrade `readableText()` to WCAG relative-luminance/contrast-ratio (Task 1); (b) add `icon?: string | null` prop + curated static lucide map + default `Shapes` icon, render leading `aria-hidden` icon before `name` (Task 2). Keep server-renderable (no `'use client'`), functions ≤ 40 lines.
- **UPDATE** `src/app/(main)/sessions/page.tsx` — add `icon: true` to `ekskul` select, pass `icon` to badge, add accent element to the row card (Tasks 3, 4).
- **UPDATE** `src/app/(main)/payments/page.tsx` — same (Tasks 3, 4).
- **UPDATE** `src/app/(admin)/admin/sessions/page.tsx` — add `icon: true` to select, add `icon: string | null` to `type SessionRow.ekskul`, pass `icon`, add accent to first cell (Tasks 3, 4).
- **UPDATE** `src/app/(admin)/admin/payments/page.tsx` — same, with `type PaymentRow.ekskul` (Tasks 3, 4).
- **(optional NEW)** `src/components/ekskul/activity-icons.ts` — only if the curated icon map is large enough to warrant its own file (keep the badge file ≤ 300 lines). Otherwise inline the map in `ekskul-badge.tsx`.
- **VERIFY (no change expected)** `src/lib/ekskul.ts` (`getUserEkskulIds`), the four queries' `where` clauses.

### Architecture compliance (AD-10 + AD-3 + NFR-4 — binding)
> **AD-10:** Community & Activity identity is **data, never hardcoded** — the badge/accent must read `ekskul.name`/`ekskul.color`/`ekskul.icon`, never a baked literal. The default icon is a neutral fallback for an unset value, not a hardcoded per-Activity identity.
> **AD-3 / NFR-1 (security invariant):** member reads scoped by `getUserEkskulIds`; Admin/Owner (`isAdminRole`) see all. This story only **widens a `select`** (adds `icon`) — it must not alter any `where`/scoping. A cross-ekskul leak is a security regression.
> **NFR-4 (WCAG 2.2 AA):** identity is conveyed by **text + icon**, never color alone — the badge carries the Activity `name` (text) + icon; the accent bar is a **decorative, `aria-hidden`** redundant cue. Foreground contrast must be a real WCAG ratio (Task 1).

### Library / framework requirements
- **lucide-react `^1.14.0`** — use **static named imports** for the curated icon set and a `Record<string, LucideIcon>` lookup. **Do not** use `lucide-react/dynamic`'s `DynamicIcon` (would force a client/Suspense boundary and its behavior on this pinned version is unverified) and **do not** import the whole `icons` barrel (bundle bloat). The base `Badge` (`badge.tsx`) already styles a child `svg` (`[&>svg]:size-3!`, `gap-1`) — render the icon as a direct child; no Badge edit needed.
- **Tailwind v4 can't JIT a runtime DB color** — the Activity color (badge background and accent bar) MUST be applied via **inline `style`**, exactly as `EkskulBadge` does today. Do not attempt a dynamic Tailwind class like `bg-[var(--x)]` keyed off DB data unless you set the CSS variable inline.
- **Next.js 16 (App Router):** the four list pages are async Server Components reading `auth()`/`getDictionary`/`getUserEkskulIds`; keep `EkskulBadge` server-renderable so it composes inside them without a client boundary. Read `node_modules/next/dist/docs/` before touching routing/data-fetching (Next 16 diverges from training data, per CLAUDE.md).
- **No new dependencies, no new dictionary keys** (the icon is decorative `aria-hidden`; the `name` text is the label), **no schema change** (`Ekskul.icon` already exists).

### Code quality (NFR-7)
Functions ≤ 40 lines · files ≤ 300 lines · nesting ≤ 3 (early return) · **no magic numbers** (name the WCAG constants — sRGB threshold, channel coefficients, contrast offset, and the 3px accent width as a constant or the literal `w-[3px]` Tailwind utility) · naming conventions · booleans `is/has/should`. ESLint (next core-web-vitals + ts) runs on a pre-commit hook — `npm run lint` must pass.

### Testing standards
No automated test suite exists (CLAUDE.md / NFR-7). Verify manually + by audit:
- **Badge + accent:** open member Sessions & Payments and admin Sessions & Payments; confirm each row shows a leading icon chip + Activity name tinted in the Activity color **and** a 3px left accent bar in the same color, in both `NEXT_LOCALE=en` and `id`, light and dark mode.
- **Contrast (Task 1):** spot-check `readableText` with a **light** Activity color (e.g. `#f5d90a` / yellow → dark `#1f2937` foreground) and a **dark** color (e.g. `#0f172a` → white foreground); confirm the higher-contrast foreground is chosen and a 3- or 4-char malformed hex returns `#ffffff` without crashing. Use `npx prisma studio` to set an Activity's `color` (and `icon`) to exercise arbitrary values.
- **Icon (Task 2):** with `Ekskul.icon = null` (the current real state) the chip shows the default `Shapes` icon; set `icon` to a curated name (e.g. `"music"`) via Prisma Studio and confirm that icon renders. An unknown name falls back to the default, not a crash.
- **Scoping (Task 3/5):** as a multi-Activity member, confirm Sessions/Payments show only your Activities (no cross-ekskul rows); as Admin/Owner confirm all rows show. Confirm the `icon` `select` change didn't alter results.
- `npm run lint` + `npm run build` pass (the parity guard catches dictionary regressions).

### Previous Story Intelligence (Stories 1.1–1.3 — all `review`, uncommitted on this branch)
- **Pattern that worked:** keep edits minimal and value-only, lean on `npm run build` (the `const id: typeof en` parity guard) for i18n parity, and audit by grep. Story 1.4 follows the same shape — extend one shared component + four call sites + one helper.
- **Green→teal deferral:** 1.1, 1.2, and 1.3 **all** deferred the platform accent swap to Story 4.3. Honor it — the Activity runtime color is independent of the green platform chrome; don't retint either here.
- **1.3 hardened `getSettings()`/`communityAbbr()`** (community identity). 1.4 is the **Activity** identity counterpart (per-row name/color/icon) — same "identity is data" principle (AD-10), different model (`Ekskul` vs `Settings`).
- **Working tree:** 1.1–1.3 edits to `settings.ts`/`utils.ts`/`dictionaries.ts`/layouts/components are **uncommitted** on `chore/bmad-planning-epics-stories` (baseline `bf58946`). Build on that tree; do not revert their edits.

### Git Intelligence
- Branch `chore/bmad-planning-epics-stories`; HEAD `bf58946`. The Activity-color/badge/ekskul system landed in `7afeff1 feat: add ekskul management features…` (the `andreas-changes` merge) — `EkskulBadge`, `getUserEkskulIds`, the four scoped queries, and the `Ekskul.color`/`icon` columns all come from there. This story extends that existing system; no new schema, no new dependency, no migration.
- `95335f0 fix(layout): render role-/theme-dependent UI correctly on first paint` touched first-paint/theme — relevant only in that the badge renders inside themed surfaces; verify the accent bar reads correctly in dark mode (the inline color is theme-independent by design).

### Project Structure Notes
Aligns with the established layout: shared Activity badge in `src/components/ekskul/`, server-only scoping helpers in `src/lib/ekskul.ts`, list pages under `src/app/(main|admin)`, runtime identity sourced from the `Ekskul` row via Prisma `select`. Two new things at most: an optional `activity-icons.ts` map and per-row accent markup. **No new route, no schema change, no new dictionary key.**

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4 (L217-239)] — story statement + ACs
- [Source: epics.md#FR-5 (L28, L110)] — per-Activity identity shown consistently on Session/Payment rows
- [Source: epics.md#UX-DR4 (L82)] — Activity badge: icon chip + name, AA-contrast foreground over runtime color
- [Source: epics.md#UX-DR5 (L83)] — Activity accent bar: 3px left border in `{activity.color}` on every Session/Payment row
- [Source: epics.md#NFR-1 (L48), #NFR-4 (L51)] — ekskul-scoping security invariant; WCAG 2.2 AA, state by text+icon not color alone
- [Source: ux-designs/…/DESIGN.md (L42-48, L89, L136-137)] — `activity-badge`/`activity-accent-bar` component tokens; runtime color, AA-contrast foreground
- [Source: ux-designs/…/EXPERIENCE.md (L90, L135)] — session row carries accent bar + badge; WCAG 2.2 AA locked
- [Source: ARCHITECTURE-SPINE.md#AD-3 (L60-63)] — Activity-ekskul data scoping is a security invariant (`getUserEkskulIds`/`assertMembership`/`isAdminRole`)
- [Source: ARCHITECTURE-SPINE.md#AD-10 (L117-120)] — identity is data, never hardcoded (FR-1..FR-5)
- [Source: prisma/schema.prisma (L116-135)] — `Ekskul.color` (L121, default `#16a34a`), `Ekskul.icon` (L122, optional lucide name); `BadmintonSession` (L154), `Payment` (L190)
- [Source: src/components/ekskul/ekskul-badge.tsx (L15-38)] — current `readableText()` (YIQ) + badge render
- [Source: src/components/ui/badge.tsx (L7-8)] — base Badge auto-sizes child `svg` to `size-3`, `gap-1`
- [Source: src/lib/ekskul.ts (L14-20)] — `getUserEkskulIds`
- [Source: src/app/(main)/sessions/page.tsx (L43, L95)] — member session query select + badge
- [Source: src/app/(main)/payments/page.tsx (L35, L120)] — member payment query select + badge
- [Source: src/app/(admin)/admin/sessions/page.tsx (L18-21, L43, L111)] — admin session `SessionRow` type + select + badge
- [Source: src/app/(admin)/admin/payments/page.tsx (L17-20, L55, L162)] — admin payment `PaymentRow` type + select + badge
- [Source: src/app/(admin)/admin/ekskul/ekskul-actions.tsx, src/lib/validations/ekskul.ts, src/app/api/ekskul/route.ts] — confirm: no `icon` field captured (icon-picker is out of scope)
- [Source: _bmad-output/project-context.md] — Next 16, ekskul-scoping rule, Tailwind-can't-JIT-DB-color, server-only helpers, code-quality limits
- [Source: implementation-artifacts/1-1-…md, 1-2-…md, 1-3-…md] — brownfield verify+harden pattern; green→teal deferral to 4.3

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run lint` → clean ("eslint" exits 0, no issues). One iteration needed: the first pass tripped React 19's `react-hooks/static-components` rule (assigning the resolved lucide component to a render-local `const Icon` and rendering `<Icon/>`); fixed by rendering via `createElement(resolveActivityIcon(icon), { 'aria-hidden': true })` — no behavior change.
- `npm run build` → "✓ Compiled successfully in ~6s". TypeScript type-check passed (the widened `ekskul.select` flows through Prisma's inferred types and the two explicit admin `SessionRow`/`PaymentRow` types); full route table generated, all app routes remain dynamic `ƒ` (only `/icon.svg` static) — no route-shape regression (NFR-8). The `const id: typeof en` i18n parity guard still holds (no dictionary change).
- Verification grep `w-\[3px\]|icon=\{(s|p|payment)\.ekskul\.icon\}` over `src/app` → confirmed all four surfaces carry both the accent bar and the `icon` prop.
- lucide-react `1.14.0` verified locally: all 19 curated icon names exist as `dist/esm/icons/*.mjs`; `LucideIcon` is an exported type (`export type { … LucideIcon … }`).

### Completion Notes List

- **Scope honored — extend + harden, not rebuild.** As the Reality check predicted, the Activity badge (name + runtime color + auto-contrast) and the four already-scoped list queries existed. Implementation = three additive changes (icon chip, accent bar, WCAG contrast) + a scoping audit. No schema change, no new dependency, no new dictionary key.
- **Task 1 (AC2) — true WCAG 2.2 contrast:** replaced the YIQ perceived-brightness threshold in `ekskul-badge.tsx` with the WCAG relative-luminance pipeline — `parseHex` → `linearizeChannel` (sRGB gamma) → `relativeLuminance` → `contrastRatio` — and `readableText` now returns whichever of white `#ffffff` / dark `#1f2937` scores the **higher** contrast ratio against the Activity color. Foreground luminances are precomputed once at module scope. Malformed/short hex still falls back to white (no crash). All magic numbers are named constants; every helper ≤ 40 lines, nesting ≤ 3.
- **Task 2 (AC1) — icon chip:** `EkskulBadge` gained an optional `icon?: string | null` prop and renders a leading decorative (`aria-hidden`) lucide icon before the name. Resolution is a **curated static map** (`ACTIVITY_ICONS`, 19 statically-imported lucide components) keyed by a normalized lowercased name, with `Shapes` (the nav's "Activity" glyph) as the default for null/empty/unknown — so the chip is **always** present. No `lucide-react/dynamic`, no whole-barrel import; the component stays server-renderable (no `'use client'`). The base `Badge` auto-sizes the child `svg` to `size-3` with `gap-1`, and the icon inherits the WCAG-chosen foreground via `currentColor`. Optional prop → all 7 other call sites still compile and now show the default icon (on-spec per UX-DR4).
- **Task 3 (AC1) — icon threaded through the four row queries:** added `icon: true` to the `ekskul` `select` and passed `icon={…ekskul.icon}` to the badge on member sessions, member payments, admin sessions, admin payments. Added `icon: string | null` to the explicit `SessionRow`/`PaymentRow` ekskul types. Only the `select` was widened — no `where`/`orderBy`/scoping touched.
- **Task 4 (AC1/AC4) — 3px left accent bar:** added a decorative `aria-hidden` `<span className="absolute left-0 top-0 h-full w-[3px]" style={{ backgroundColor: ekskul.color }} />` to every Session/Payment row. Card rows (member) got `relative overflow-hidden` on the card so the bar clips to the rounded corners and doesn't collide with the existing `hover:shadow-sm`; table rows (admin) got the accent inside a `relative` first cell so it reads as a full-height row-left bar (robust under `border-collapse`, unlike a `<tr>` border). Color is inline (Tailwind can't JIT a runtime DB color). The bar is a redundant cue — the text+icon badge carries the accessible identity (NFR-4).
- **Task 5 (AC3) — scoping invariant verified (no change):** member Sessions stay `ekskulId: selected ?? { in: myEkskulIds }` with `selected` guarded by `myEkskulIds.includes(...)`; member Payments stay `userId`-scoped to the member's own rows; both admin pages stay `isAdminRole`-gated and unscoped (Admin/Owner see all). AD-3 / NFR-1 hold — widening the `select` cannot leak rows.
- **Deferred per scope boundary:** (1) **Admin icon-picker** — `Ekskul.icon` is still not settable in the ekskul form / zod schema / `/api/ekskul`, so in the current data the chip renders the neutral `Shapes` default everywhere (AC1 satisfied structurally). Wiring an icon picker is left to a later admin-config/Settings-IA story. (2) **Green→Deep-Teal accent swap (UX-DR1)** — page chrome keeps `bg-green-600`/`text-green-600`; the per-Activity badge/accent use the runtime Activity color, which is independent of the platform accent (owned by Story 4.3). (3) **Admin-table → stacked-card responsive collapse** — Story 4.2.
- **Not runtime-verified against a live DB:** no automated test suite exists (NFR-7); validated via ESLint, the production build (type-check + i18n parity guard), and the grep audit. Recommend a quick manual smoke at review — set an Activity's `color` (e.g. a light yellow and a dark navy) and `icon` (e.g. `"music"`) via `npx prisma studio`, then open member & admin Sessions/Payments in `NEXT_LOCALE=en`/`id`, light + dark mode: confirm each row shows the leading icon chip + name in a readable foreground over the color, plus the 3px left accent bar, and that a multi-Activity member sees only their Activities while Admin/Owner see all.

### File List

- **Modified** `src/components/ekskul/ekskul-badge.tsx` — WCAG relative-luminance contrast selection (replaces YIQ); optional `icon` prop + curated static lucide map + `Shapes` default; renders leading `aria-hidden` icon via `createElement`. Server-renderable.
- **Modified** `src/app/(main)/sessions/page.tsx` — `ekskul.select` + `icon`; `icon` prop on badge; 3px accent bar on the row card.
- **Modified** `src/app/(main)/payments/page.tsx` — `ekskul.select` + `icon`; `icon` prop on badge; 3px accent bar on the row card.
- **Modified** `src/app/(admin)/admin/sessions/page.tsx` — `SessionRow.ekskul.icon` type; `ekskul.select` + `icon`; `icon` prop on badge; 3px accent bar in the first cell.
- **Modified** `src/app/(admin)/admin/payments/page.tsx` — `PaymentRow.ekskul.icon` type; `ekskul.select` + `icon`; `icon` prop on badge; 3px accent bar in the first cell.

## Review Findings (Epic 1 holistic code review — 2026-06-30)

Reviewed as part of a holistic Epic 1 review (three adversarial lenses; combined lint + build pass, exit 0). `EkskulBadge` WCAG 2.2 relative-luminance contrast verified correct (proper sRGB linearisation, right coefficients, correct ratio formula); decorative icon correctly `aria-hidden`; ekskul-scoping invariant confirmed unchanged (select-only widening). No blocking issues.

- [x] [Review][Defer] `parseHex` accepts only 6-digit hex [src/components/ekskul/ekskul-badge.tsx] — deferred, low. A 3-digit hex (e.g. `#fff`) returns null → always-white foreground, unreadable on a light background. Not currently reachable: `Ekskul.color` is set via a 6-digit color picker. Fold the 3-digit-hex hardening into the Epic 4 UI refresh.
- [x] [Review][Defer] `EkskulBadge` icon has no explicit `size` [src/components/ekskul/ekskul-badge.tsx] — deferred, low. Renders at the lucide default (24px), possibly oversized in a small badge. Visual-only; tune during the Epic 4 UI refresh.

## Change Log

| Date | Change |
|---|---|
| 2026-06-30 | Story 1.4 created (ready-for-dev). Scope: add the Activity icon chip + 3px left accent bar to every Session/Payment row across the four member/admin list surfaces, upgrade `EkskulBadge` foreground selection to a true WCAG 2.2 AA contrast ratio, and audit the ekskul-scoping invariant. Brownfield extend+harden of the existing `EkskulBadge`/Activity-color system; no schema change, no new deps, no new dictionary keys. Admin icon-picker and green→teal swap explicitly deferred. |
| 2026-06-30 | Epic 1 holistic code review passed. 2 low-severity items deferred (3-digit hex foreground edge case; badge icon sizing → both Epic 4). No blocking issues. Status → done. |
| 2026-06-30 | Story 1.4 implemented. Upgraded `EkskulBadge` to a true WCAG 2.2 relative-luminance contrast choice (black/white by higher ratio) and added an always-present leading Activity icon chip (curated static lucide map, `Shapes` default), keeping the component server-renderable. Threaded `Ekskul.icon` through all four Session/Payment row queries + the two explicit admin row types, and added a decorative 3px left accent bar in the Activity color to every member card row and admin table row. Verified the ekskul-scoping security invariant is unchanged (select-only widening). Lint clean; production build compiles, type-checks, and keeps every route dynamic with i18n parity intact. Status → review. |

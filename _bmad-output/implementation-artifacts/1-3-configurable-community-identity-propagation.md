---
baseline_commit: bf58946006ff3cfd17c37fd964f94dbfdc1bfea9
---

# Story 1.3: Configurable community identity propagation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Owner,
I want the community name and logo I set in Settings to appear everywhere,
So that the platform reads as my community's own.

**Epic:** Epic 1 — Activity-Agnostic Rebrand & Identity
**FRs:** FR-4 (community identity stays configurable — name/logo → header, title, derived abbreviation across all pages); completes the FR-4 slice that Story 1.1 deferred ("full propagation is Story 1.3")
**Governed by:** AD-10 (identity is data, never hardcoded), AR-10 / AD-14 storage convention (uploads only via `src/lib/supabase.ts` service-role helpers into the `logos` bucket; never expose `SUPABASE_SERVICE_ROLE_KEY`)

## Acceptance Criteria

1. **Custom name propagates everywhere.**
   **Given** an Owner sets a custom community name in General Settings,
   **When** they navigate the app,
   **Then** the header/identity mark, the document `<title>` (chrome), and the derived abbreviation reflect that name across **all** member (`(main)`) and admin (`(admin)`) pages — plus the public landing, sign-in, and onboarding surfaces — with no surface still showing the neutral default or a stale name after a save.

2. **Logo-set vs. logo-fallback, never a placeholder.**
   **Given** an Owner uploads a community logo,
   **When** the identity mark renders on any surface,
   **Then** the configured logo image is shown; **and** if no logo is set, a circular `communityAbbr()` token renders instead (UX-DR9) — **never** a bundled placeholder graphic or a broken-image icon. (The exact accent-token colors — teal `primary` on `muted` — land with the accent swap in Story 4.3; see Scope boundary.)

3. **Robust abbreviation derivation.**
   **Given** arbitrary community names,
   **When** `communityAbbr()` derives an abbreviation,
   **Then** it produces a sensible ≤2-char result for multi-word names ("Sports Community" → "SC", "Komunitas Olahraga" → "KO"), single-word names ("Yoga" → "YO"), **and** degenerate inputs (empty/whitespace-only) without crashing or rendering an empty token.

4. **Logo upload obeys the storage invariant (AR-10).**
   **Given** a logo upload,
   **When** it is stored,
   **Then** it flows through the `src/lib/supabase.ts` service-role helper (`uploadLogo`) into the `logos` bucket from a **server-only** Route Handler that is `auth()`-gated and `isAdminRole`-gated, the public URL is persisted to the `logoUrl` Setting, and `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser.

---

## Tasks / Subtasks

> **Read the Dev Notes "Reality check" first.** Most of this propagation already works in the codebase (this is a brownfield productization pass). The deliverable is: **verify propagation across every surface, close the two real hardening gaps, and confirm the storage invariant** — not a rebuild. Do NOT restyle, do NOT extract a shared component, do NOT do the green→teal swap.

- [x] **Task 1 — Harden `communityAbbr()` for degenerate names (AC: 3)**
  - [x] In `src/lib/utils.ts`, guard `communityAbbr(name)` so an empty or whitespace-only `name` returns a stable non-empty fallback token (e.g. a single neutral letter or the existing default's abbreviation) instead of `''`. Keep the existing multi-word ("SC"/"KO") and single-word ("YO") behavior exactly — only add the empty-input guard and early return (nesting ≤ 3).
  - [x] Do **not** change the function signature or its callers; every surface calls `communityAbbr(communityName)` and must keep working unchanged.

- [x] **Task 2 — Treat a blank community name as "use the neutral default" at the read site (AC: 1, 3)**
  - [x] In `src/lib/settings.ts` `getSettings()`, the line `communityName: map.communityName ?? t.brand.defaultCommunityName` falls back **only on `null`/`undefined`** — a saved empty string `''` slips through and would propagate an empty identity to every surface. Change the coalescing so a **blank/whitespace-only** stored value also falls back to `t.brand.defaultCommunityName` (e.g. `map.communityName?.trim() || t.brand.defaultCommunityName`). One line; protects all surfaces uniformly.
  - [x] This is the single, server-side guard for AC1/AC3 robustness. Do NOT add per-surface guards.

- [x] **Task 3 — Verify name propagation across every surface (AC: 1)**
  - [x] Confirm (read-only audit; change only if a surface bypasses `getSettings()`/props and hardcodes identity) that each of these sources its community name from `getSettings()` (server) or the layout props / `/api/settings` (client):
    - Document `<title>` / metadata → `src/app/layout.tsx` `generateMetadata()` (the only chrome-metadata source, per Story 1.1).
    - Member + admin shells → `src/app/(main)/layout.tsx`, `src/app/(admin)/layout.tsx` pass `communityName`/`logoUrl` into `Sidebar`, `MobileNav`, and the mobile topbar.
    - Sidebar + mobile nav → `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx` render the prop.
    - Public/auth surfaces → `src/app/page.tsx` (landing), `src/app/auth/signin/page.tsx`, `src/app/onboarding/page.tsx` (client — initializes from `t.brand.defaultCommunityName`, overridden by `/api/settings`), `src/app/(admin)/admin/settings/page.tsx` (subtitle), `src/app/(admin)/admin/page.tsx` (dashboard subtitle).
  - [x] Confirm a name change in `/admin/settings` re-propagates: the PATCH handler returns, the page calls `router.refresh()`, and the server layouts + `generateMetadata()` re-run on the next render (they are request-dynamic because `getSettings()` reads cookies via `getLocale()`).

- [x] **Task 4 — Verify logo propagation + storage invariant (AC: 2, 4)**
  - [x] Confirm every identity-mark surface uses the `logoUrl ? <Image …> : <communityAbbr token>` fallback (sidebar, mobile-nav, both mobile topbars, landing, signin) and that `onboarding` uses the abbreviation token (it has no logo branch — acceptable; flag only, do not add one in this story).
  - [x] Confirm `next.config.ts` `images.remotePatterns` allowlists the Supabase public-storage host (`*.supabase.co` `…/storage/v1/object/public/**`) so the uploaded logo renders through `next/image` without an "hostname not configured" error. (It currently does — verify, no change expected.)
  - [x] Confirm `POST /api/settings/logo` is `auth()` → 401, `isAdminRole` → 403, validates type+size, calls `uploadLogo()` (server-only `src/lib/supabase.ts`, `LOGOS_BUCKET`, fixed-path upsert), persists `logoUrl`, and never returns or logs the service-role key (AR-10, AD-2).

- [x] **Task 5 — Final audit & verification (AC: 1, 2, 3, 4)**
  - [x] Grep the codebase for any hardcoded identity that bypasses `getSettings()`/`communityAbbr()` (e.g. a stray literal name or a `>PB<`/abbreviation hardcode) — there should be none after Stories 1.1/1.2; this confirms FR-4's "configured value propagates everywhere".
  - [x] `npm run lint` clean; `npm run build` passes (the `const id: typeof en` parity guard still holds; routes remain dynamic). No regression (NFR-7, NFR-8).

---

## Dev Notes

### Reality check — what already works (read FIRST; this story is verify + harden, not build)
This is a **brownfield productization pass**. The name/logo propagation pipeline was already built and was reinforced by Stories 1.1 (neutral locale-resolved default + chrome metadata) and 1.2 (removed the last hardcoded identity literals). When you open the files, you will find the wiring already present. **The honest scope of Story 1.3 is two small hardening fixes (Tasks 1–2) plus a propagation/storage audit (Tasks 3–5).** Do not re-implement working code; do not invent new surfaces; do not "improve" styling.

**Already correct (verify, don't touch):**
- **Name → document title:** `src/app/layout.tsx` `generateMetadata()` builds the title from `getSettings().communityName` + neutral `t.brand.tagline`. It is the only chrome-metadata source (confirmed in Story 1.1).
- **Name + logo → shells:** both `(main)/layout.tsx` and `(admin)/layout.tsx` read `getSettings()` and pass `communityName`/`logoUrl` to `Sidebar`, `MobileNav`, and an inline mobile topbar.
- **Name + logo → public/auth surfaces:** landing (`page.tsx`), `auth/signin/page.tsx`, and `admin/settings` + `admin` dashboard all source from `getSettings()`; `onboarding` (client) initializes from `t.brand.defaultCommunityName` and overrides via `/api/settings`.
- **Logo upload (AR-10):** `POST /api/settings/logo` is auth+admin gated, validates MIME (`jpeg/jpg/png/webp`) + size (≤2MB), calls `uploadLogo()` in server-only `src/lib/supabase.ts` (`LOGOS_BUCKET`, fixed path `community-logo.<ext>`, `upsert: true`), then upserts the `logoUrl` Setting. `next.config.ts` already allowlists `*.supabase.co/storage/v1/object/public/**` so `next/image` renders it.
- **Abbreviation:** `communityAbbr()` already yields "SC"/"KO"/"YO" for normal names.
- **Dictionary:** all needed keys exist (`admin.logoLabel/logoHint/logoUpload/logoChange/logoSuccess/logoFail/logoUploading`, `admin.communityNameLabel`, `admin.settingsTitle/settingsSubtitle`, `brand.defaultCommunityName/tagline`). **No new keys are needed.**

**The two genuine gaps to close:**
1. **`communityAbbr('')` → `''`** (empty token). `''.trim().split(/\s+/)` → `['']`, length 1, `''.slice(0,2)` → `''`. A blank circle is effectively the "broken/placeholder" outcome AC2/AC3 forbid. **Task 1** adds an empty-input guard.
2. **A saved empty `communityName` propagates as empty identity.** `getSettings()` uses `map.communityName ?? default`, which only catches `null`/`undefined`; a stored `''` (the settings form does not require a non-empty name) passes through and shows a nameless header + empty abbreviation everywhere. **Task 2** makes the read-site coalesce blank → default. This is the right layer (one guard, all surfaces) and is non-destructive to a real configured name.

### Scope boundary (prevents over-reach)
**In scope (FR-4):** the two hardening fixes (Tasks 1–2) and the propagation + storage audit (Tasks 3–5). Pure correctness/robustness; no visual redesign.

**NOT in scope — hard boundaries:**
- **Green → Deep Teal accent swap (UX-DR1) and the exact UX-DR9 token colors** ("`{colors.primary}` on `muted`"). The identity-mark fallback today is `bg-green-600` + white text. **Keep it.** Stories 1.1 and 1.2 both explicitly deferred the green→teal swap, and **Story 4.3 owns UX-DR9's shared identity-mark component + UX-DR1 accent** ("shared components cover … the community identity mark (UX-DR9) … with the Deep Teal accent as the single platform accent"). Story 1.3 delivers UX-DR9's **behavior** (logo if set, else abbreviation token, never a placeholder) — AC2 is satisfied structurally. Doing the token swap here would half-migrate the tokens and collide with 4.3. Note the deferral in Completion Notes.
- **Extracting a shared `<CommunityIdentityMark>` component.** The fallback markup is currently duplicated per surface. Consolidating it is part of Story 4.3's "shared components reused, not re-implemented" refresh — **do not** extract it now; keep edits minimal and localized.
- **Settings information-architecture cleanup / fee removal.** `defaultMonthlyFee`, `maxPlayers`, the fee label, and the settings-form layout belong to Stories 2.3 (remove global fee) and 4.4 (Settings IA). **Leave them untouched.**
- **Adding zod validation to `PATCH /api/settings`.** That route is unvalidated today (it upserts arbitrary keys). Hardening it to AD-2's `zod.safeParse` is a reasonable future cleanup but is **not required** by this story's ACs — Task 2's read-site guard already protects identity from a blank name. If you want to add a minimal non-empty `communityName` check on save, that is acceptable as a small, additive enhancement, but the read-site guard is the load-bearing fix. Flag it; don't expand scope.
- **Onboarding logo branch.** Onboarding shows only the abbreviation token (no `logoUrl` image branch). That is acceptable for this story (it's a pre-dashboard splash); do not add a logo image there now — flag as a possible 4.x polish.

### Files to touch
- **UPDATE** `src/lib/utils.ts` — add the empty/whitespace guard to `communityAbbr()` (Task 1). Current: lines 22–29; multi-word → first letters of first 2 words, single-word → first 2 chars uppercased. Preserve both branches and the `cn`/`isAdminRole`/`sessionStatusVariant`/`paymentStatusVariant` exports.
- **UPDATE** `src/lib/settings.ts` — coalesce a blank stored `communityName` to the dictionary default in `getSettings()` (Task 2). Current: line 45 `communityName: map.communityName ?? t.brand.defaultCommunityName`. Preserve `import 'server-only'`, the `Promise.all([findMany, getLocale])` shape, the `Omit<AppSettings,'communityName'>` DEFAULTS, and every non-`communityName` field unchanged.
- **VERIFY (no change expected)** `src/app/layout.tsx`, `src/app/(main)/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/app/page.tsx`, `src/app/auth/signin/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/(admin)/admin/settings/page.tsx`, `src/app/(admin)/admin/page.tsx`, `src/app/api/settings/logo/route.ts`, `src/lib/supabase.ts`, `next.config.ts`.

### Architecture compliance (AD-10 + AR-10 — binding)
> **AD-10:** brand identity comes from `Settings.communityName` (neutral defaults: en "Sports Community" / id "Komunitas Olahraga") with `communityAbbr()` as the no-logo fallback; no bundled default logo; **identity is data, never hardcoded**; all user-facing strings route through `i18n/dictionaries.ts` with en/id parity.
> **AR-10 / storage convention:** uploads only via `src/lib/supabase.ts` service-role helpers (server-only, bypass RLS); buckets `payment-proofs`/`avatars`/`logos`; never expose `SUPABASE_SERVICE_ROLE_KEY`.
- The two hardening fixes keep identity **data-sourced**: a missing or blank configured name resolves to the dictionary default (not a hardcoded literal), and the abbreviation token is derived, never baked.
- The logo path already satisfies AR-10 end-to-end — Task 4 is a confirmation, not a change.

### Library / framework requirements
- **Next.js 16 (App Router):** `generateMetadata()` is async and request-scoped; because `getSettings()` reads cookies (`getLocale()`), the root layout + metadata are dynamic, so a saved name change is reflected on the next request after `router.refresh()`. **`next/image` requires the logo host in `images.remotePatterns`** — already configured for `*.supabase.co`. Read `node_modules/next/dist/docs/` before changing any metadata/image/routing behavior (Next 16 diverges from training data, per CLAUDE.md).
- **i18n (NFR-6):** `getDictionary`/`getLocale`/`getSettings` are server-only; the neutral default name comes from `t.brand.defaultCommunityName` (do not invent a new literal). en/id parity is compiler-enforced by `const id: typeof en`.
- **No new dependencies; no new dictionary keys.**

### Code quality (NFR-7)
Functions ≤ 40 lines · files ≤ 300 lines · nesting ≤ 3 (early return) · no magic numbers · naming conventions · booleans `is/has/should`. `communityAbbr` must stay a small pure function with an early return for the empty case. ESLint (next core-web-vitals + ts) runs on a pre-commit hook — `npm run lint` must pass.

### Testing standards
No automated test suite exists (CLAUDE.md / NFR-7). Verify manually + by audit:
- **Name propagation:** set a custom `communityName` in `/admin/settings`, save, then walk landing → sign-in → onboarding → member dashboard/shell → admin dashboard/shell; confirm the new name shows in the header/identity mark **and** the browser tab title, in both `NEXT_LOCALE=en` and `id`. Save a **blank** name and confirm every surface falls back to the neutral default (Task 2), not an empty header.
- **Abbreviation:** spot-check `communityAbbr` with "Sports Community" ("SC"), "Komunitas Olahraga" ("KO"), "Yoga" ("YO"), and `""`/`"   "` (stable non-empty token, no crash) (Task 1).
- **Logo:** with no logo → abbreviation circle (not a broken image); upload a logo in `/admin/settings` → the image appears in the sidebar/mobile topbar/landing/sign-in after refresh; confirm the network response from `/api/settings/logo` contains only `{ logoUrl }` and no key material.
- `npm run lint` + `npm run build` pass (the parity guard catches dictionary regressions).
- Use `npx prisma studio` to set/clear the `communityName` and `logoUrl` Settings rows when exercising the fresh-deployment and configured paths.

### Previous Story Intelligence (Stories 1.1 & 1.2 — both `review`)
- **1.1** removed `DEFAULTS.communityName`, made `getSettings()` locale-resolve `communityName` from `t.brand.defaultCommunityName`, neutralized chrome metadata (`brand.tagline`), and **verified the logo→`communityAbbr` fallback** in `sidebar.tsx`, `mobile-nav.tsx`, `page.tsx`, `auth/signin/page.tsx`. It explicitly flagged **"custom-name propagation correctness and logo upload" as NOT in scope (Story 1.3)** — that is exactly this story.
- **1.2** removed the last hardcoded identity literals — the `🏸` emoji, the `'Xclub Badminton'` initial states, and the `PB` mark in `onboarding` → `communityAbbr(communityName)` (and added the `communityAbbr` import there). So onboarding already derives its mark from the configured name; Story 1.3 only verifies it.
- **Pattern that worked in 1.1/1.2:** keep edits value-only/minimal, lean on `npm run build` (the `typeof en` guard) for parity, and audit by grep. Repeat here — Story 1.3 should be the smallest of the three.
- **Both 1.1 and 1.2 deferred the green→teal accent swap to Story 4.3.** Honor that here: keep `bg-green-600` on the identity marks.
- 1.1's and 1.2's changes are **uncommitted in the working tree** on `chore/bmad-planning-epics-stories` (baseline `bf58946`). Build on that working tree; do not revert their edits to `settings.ts`/`utils.ts`/`dictionaries.ts`/`layout.tsx`/the components.

### Git Intelligence
- Branch: `chore/bmad-planning-epics-stories`; HEAD `bf58946 docs(planning): add BMad planning artifacts…`. Recent: `f48eb79 chore(bmad): add BMad config…`, `95335f0 fix(layout): render role-/theme-dependent UI on first paint`, `8c60a5e feat(auth): dev-only login…`. Stable codebase; this story is pure server-helper hardening + audit. No new dependencies, no schema, no library/version concerns.
- `95335f0` ("render role-/theme-dependent UI correctly on first paint") touched the layout/first-paint path — relevant because identity props flow through the same shells; do not regress first-paint behavior when verifying propagation.

### Project Structure Notes
Aligns with the established layout: server-only helpers in `src/lib` (`settings.ts`, `utils.ts`, `supabase.ts`), route-group layouts under `src/app/(main|admin)`, identity-mark rendering in `src/components/layout` and the public/auth pages, storage via `@/lib/supabase`. **No new files, no new dictionary keys, no schema change.** Two minimal edits (`utils.ts`, `settings.ts`) + verification.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — story statement + ACs
- [Source: _bmad-output/planning-artifacts/epics.md#FR-4] — community identity stays configurable (name/logo → header/title/abbr; multi/single-word abbreviation)
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR9] — community identity mark (logo if set, else circular `communityAbbr` token; never a placeholder)
- [Source: ARCHITECTURE-SPINE.md#AD-10] — identity is data, never hardcoded (lines 117–120)
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions — Storage] — service-role helpers, `logos` bucket, never expose key (line 153); AR-10
- [Source: src/lib/settings.ts:37-54] — `getSettings()`; line 45 blank-name gap
- [Source: src/lib/utils.ts:22-29] — `communityAbbr()`; empty-input gap
- [Source: src/app/layout.tsx:24-34] — `generateMetadata()` title from `communityName`
- [Source: src/app/(main)/layout.tsx, src/app/(admin)/layout.tsx] — shells pass `communityName`/`logoUrl`
- [Source: src/components/layout/sidebar.tsx:71-90, mobile-nav.tsx:83-99] — logo/abbr fallback
- [Source: src/app/page.tsx:43-60, auth/signin/page.tsx:20-37, onboarding/page.tsx:39-60,101-105] — identity surfaces
- [Source: src/app/api/settings/logo/route.ts, src/lib/supabase.ts:99-119] — logo upload via service-role `uploadLogo` → `LOGOS_BUCKET`
- [Source: next.config.ts:4-17] — `images.remotePatterns` allowlists `*.supabase.co` public storage
- [Source: implementation-artifacts/1-1-…md, 1-2-…md] — deferred items + green→teal deferral to 4.3
- [Source: _bmad-output/project-context.md] — server-only helpers, storage rules, Next 16, i18n parity

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run lint` → clean ("ESLint: No issues found").
- `npm run build` → success. TypeScript type-check passed; full route table generated (all app routes dynamic `ƒ` as before, `/icon.svg` static); no errors/warnings. No regression (NFR-7, NFR-8).
- Audit grep `Sports Community|Komunitas Olahraga|Xclub|>PB<|communityName ?? ` over `src` → the only `Sports Community`/`Komunitas Olahraga` literals are the canonical neutral defaults in `dictionaries.ts` plus two doc-comments (`utils.ts`, `settings.ts`); zero `Xclub`/`>PB<`; no rendering surface hardcodes an identity that bypasses `getSettings()`/`communityAbbr()`.
- Propagation grep `communityAbbr\(|logoUrl \?|settings\.communityName|\{communityName\}` → 40 occurrences across 12 files, all sourcing identity from `getSettings()` / layout props / `communityAbbr()`.

### Completion Notes List

- **Scope honored — verify + harden, not rebuild.** As the story's Reality check predicted, name/logo propagation was already wired end-to-end by Stories 1.1/1.2. The implementation is exactly two minimal hardening edits plus a full propagation + storage audit.
- **Task 1 (AC3) — `communityAbbr()` degenerate-input guard:** added a `FALLBACK_ABBR` constant and an early return for an empty/whitespace-only name in `src/lib/utils.ts`. The function now trims once, returns the stable fallback token for a blank name (no more empty `''` → broken circle), and keeps the existing multi-word ("SC"/"KO") and single-word ("YO") behavior byte-for-byte. Pure function, nesting ≤ 3, no new dependency.
- **Task 2 (AC1/AC3) — blank-name coalescing at the read site:** changed `getSettings()` from `map.communityName ?? default` to `map.communityName?.trim() || default`. A stored `null`/`undefined`/`''`/whitespace-only name now resolves to the neutral dictionary default, and a real configured name is whitespace-trimmed. One line; the single server-side guard that protects every propagation surface uniformly (header, document title, derived abbreviation) — no per-surface guards added.
- **Task 3 (AC1) — name propagation verified:** document title (`layout.tsx generateMetadata` — the only chrome-metadata source), both shells (`(main)`/`(admin)` layouts → `Sidebar`/`MobileNav`/mobile topbar), landing, sign-in, onboarding (client, via `/api/settings`), admin settings subtitle, and admin dashboard subtitle all source the name from `getSettings()`/props. A name change re-propagates because `getSettings()` reads cookies (`getLocale()`), keeping the layouts + metadata request-dynamic, and the settings page calls `router.refresh()` after save. No code change needed.
- **Task 4 (AC2/AC4) — logo + storage invariant verified:** every identity mark uses the `logoUrl ? <Image> : communityAbbr` fallback; `next.config.ts` already allowlists `*.supabase.co/storage/v1/object/public/**` so the uploaded logo renders via `next/image`; `POST /api/settings/logo` is `auth()`→401 / `isAdminRole`→403, validates MIME+size, calls the server-only `uploadLogo()` (`LOGOS_BUCKET`, fixed-path upsert), persists `logoUrl`, and returns only `{ logoUrl }` — `SUPABASE_SERVICE_ROLE_KEY` never leaves the server (AR-10, AD-2). No code change needed.
- **Intentionally left as-is (in the editing context, not a propagation bug):** `admin/settings/page.tsx:183` (the community-name `<Input>` value) and `:127` (the page subtitle) show the raw stored value — including blank — so an admin can see and fix it in the form. The canonical identity read site (`getSettings`) is the one hardened; the form must reflect the actual stored value.
- **Deferred per established scope boundary (UX-DR9 token colors):** the no-logo identity mark still uses `bg-green-600` + white text. The green→Deep-Teal accent swap and UX-DR9's exact `primary`-on-`muted` token styling are owned by Story 4.3 (which builds the shared identity-mark component) — both Stories 1.1 and 1.2 deferred the same swap. AC2 is satisfied structurally here (logo if set, else abbreviation token, never a placeholder); only the token colors land in 4.3.
- **Flagged, non-blocking (not in this story's ACs):** (1) `PATCH /api/settings` is still unvalidated (upserts arbitrary keys) — adding AD-2 `zod.safeParse`/a non-empty `communityName` check is a reasonable future cleanup, but Task 2's read-site guard already protects identity from a blank name. (2) `onboarding` renders only the abbreviation token (no `logoUrl` image branch) — acceptable for a pre-dashboard splash; a possible Epic 4 polish.
- **Not runtime-verified against a live DB:** no automated test suite exists (NFR-7); validated via the grep audit, ESLint, and the production build. Recommend a quick manual smoke at review — set a custom name + logo in `/admin/settings`, walk landing → sign-in → onboarding → member & admin shells in both `NEXT_LOCALE=en`/`id`, then save a blank name and confirm every surface falls back to the neutral default (not an empty header).

### File List

- **Modified** `src/lib/utils.ts` — `communityAbbr()`: added `FALLBACK_ABBR` constant + empty/whitespace-name early return; trims once before splitting.
- **Modified** `src/lib/settings.ts` — `getSettings()`: blank/whitespace `communityName` now coalesces to the locale dictionary default (`?.trim() || …`).

## Change Log

| Date | Change |
|---|---|
| 2026-06-30 | Story 1.3 implemented: hardened `communityAbbr()` against blank names and made `getSettings()` coalesce a blank community name to the neutral locale default, so a configured (or missing) name/logo propagates correctly everywhere; verified name/logo propagation across all member/admin/public surfaces and the AR-10 logo-upload storage invariant; confirmed the green→teal token swap stays deferred to Story 4.3. Lint + build pass. Status → review. |
| 2026-06-30 | Epic 1 holistic code review passed (name/logo propagation + blank-coalesce + `communityAbbr` hardening verified; AR-10 storage invariant intact). No findings. Status → done. |

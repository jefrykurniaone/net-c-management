---
baseline_commit: bf58946006ff3cfd17c37fd964f94dbfdc1bfea9
---

# Story 1.1: Neutral platform defaults & chrome identity

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Admin/Owner deploying a fresh instance,
I want the platform to ship with sport-neutral defaults and identity in its chrome,
So that no sport or "PB Net-C" branding is baked in before I configure my own community.

**Epic:** Epic 1 — Activity-Agnostic Rebrand & Identity
**FRs:** FR-1 (sport-neutral default branding), FR-3 (platform identity, not "PB Net-C"); partial FR-4 (configurable identity verified, full propagation is Story 1.3)
**Governed by:** AD-10 (Community & Activity identity is data, never hardcoded)

## Acceptance Criteria

1. **Neutral default community name.**
   **Given** a fresh deployment with no `Settings` configured,
   **When** any page loads,
   **Then** the default community name renders as **"Sports Community"** (en) / **"Komunitas Olahraga"** (id), replacing "Xclub Badminton",
   **And** `DEFAULTS.communityName` in `src/lib/settings.ts` holds the neutral value, **sourced through the i18n dictionary** (locale-resolved, not a single hardcoded string).

2. **Logo fallback to abbreviation.**
   **Given** no community logo is configured,
   **When** the identity mark renders (sidebar, mobile nav, landing header, sign-in),
   **Then** it falls back to the community name + derived `communityAbbr()` token — **never** a bundled default logo image or a broken-image placeholder.

3. **Neutral chrome.**
   **Given** any user-facing chrome (browser tab title, document `<title>`, metadata `description`, favicon),
   **When** inspected on a fresh deployment,
   **Then** it reflects a neutral platform identity with **no** "PB Net-C", "Net-C", or badminton-specific string, **and** the favicon is neutral/generic.

4. **SM-1 audit passes.**
   **Given** the SM-1 audit,
   **When** chrome (header identity mark, tab title, document title, metadata) is scanned with no `Settings` configured,
   **Then** **zero** sport-specific words appear anywhere in chrome.

---

## Tasks / Subtasks

- [x] **Task 1 — Neutral, locale-sourced default community name (AC: 1)**
  - [x] Add neutral default-name keys to `src/lib/i18n/dictionaries.ts` under both `en` and `id` (`brand.defaultCommunityName`: `en` = "Sports Community", `id` = "Komunitas Olahraga"). en/id key parity preserved (enforced by `id: typeof en`).
  - [x] `getSettings()` in `src/lib/settings.ts` now resolves the `communityName` default through the dictionary (locale-aware) when no DB row exists.
  - [x] Removed the literal `DEFAULTS.communityName = 'Xclub Badminton'`; no "Xclub"/"Badminton" string remains in `settings.ts`.
  - [x] Verified via type-check + code path: en → `t.brand.defaultCommunityName` = "Sports Community", id → "Komunitas Olahraga".

- [x] **Task 2 — Neutral chrome: title, metadata, favicon (AC: 3, 4)**
  - [x] `generateMetadata()` in `src/app/layout.tsx` now builds title/description from `communityName` + `t.brand.tagline` (neutral) instead of `t.auth.signInSubtitle`. On-page `auth.signInSubtitle` left untouched (Story 1.2).
  - [x] Removed branded `src/app/favicon.ico`; added neutral `src/app/icon.svg`. Next.js 16 serves it via `<link rel="icon">` (confirmed: `/icon.svg` in build route table). No `apple-icon.*` exists.
  - [x] Confirmed no other `generateMetadata`/`export const metadata`/`<title>` reintroduces a sport word (only `layout.tsx` sets chrome metadata).

- [x] **Task 3 — Verify logo fallback & no bundled default logo (AC: 2)**
  - [x] `DEFAULTS.logoUrl = ''` confirmed; no bundled default logo image ships or is referenced.
  - [x] Verified the `logoUrl ? <Image> : communityAbbr` fallback in all four surfaces (`sidebar.tsx`, `mobile-nav.tsx`, `page.tsx`, `auth/signin/page.tsx`). No change needed — fallback already correct.

- [x] **Task 4 — `communityAbbr` hygiene (no third copy) (AC: 1, 2)**
  - [x] No new `communityAbbr` added; canonical `src/lib/utils.ts` copy retained (used by all components).
  - [x] Removed the unused duplicate in `src/lib/settings.ts` (verified no caller imported it — all `@/lib/settings` imports only pull `getSettings`).
  - [x] Updated the `utils.ts` doc-comment examples from "PB Net-C"/"Badminton Club" to neutral "Sports Community" → "SC" / "Komunitas Olahraga" → "KO".

- [x] **Task 5 — Final audit & verification (AC: 3, 4)**
  - [x] SM-1 audit: grepped chrome sources — no "badminton"/"Xclub"/"PB Net-C"/"Net-C" in `settings.ts` (only a clarifying comment) or in `layout.tsx` metadata.
  - [x] `npm run lint` passes clean; `npm run build` passes (TypeScript 10.3s, 34/34 pages generated, `/icon.svg` served). No regression (NFR-7, NFR-8).

---

## Dev Notes

### Scope boundary (read first — prevents over-reach)
This story is **chrome + neutral defaults only** (FR-1, FR-3). It is the first slice of the rebrand.
- **In scope:** `DEFAULTS.communityName`, the metadata title/description/favicon, the identity-mark logo fallback, and the minimal dictionary keys chrome needs (`brand.defaultCommunityName`, `brand.tagline`).
- **NOT in scope (Story 1.2):** the full `dictionaries.ts` copy audit — `auth.signInSubtitle`, `landing.badge`/`heroTitle`/etc., the hardcoded 🏸 emoji in `src/app/page.tsx:71`, `ekskulSlugHint` "badminton" example, and the "Ekskul" → "Activity/Aktivitas" relabel. Leave on-page body copy alone except where it leaks into **chrome**.
- **NOT in scope (Story 1.3):** custom-name propagation correctness and logo upload.
- **NOT in scope (Epic 2):** `defaultMonthlyFee` / `defaultFeeLabel` removal (FR-7).
- **NOT in scope (Story 4.3):** the green→Deep-Teal accent token swap. Keep the existing `bg-green-600` identity-mark styling; do not restyle here.

### Key Implementation Decision — how the default name gets locale-resolved (AC: 1)
The AC requires the default to be **"Sports Community" (en) / "Komunitas Olahraga" (id)** AND "sourced through the i18n dictionary". `src/lib/settings.ts` is `server-only`; `getDictionary(locale)` and `getLocale()` are also server-only, so importing them in `settings.ts` is allowed.

**Recommended (single source, matches the AC):** make the default locale-aware inside `getSettings()`:
```ts
import { getLocale } from './i18n/locale';
import { getDictionary } from './i18n/dictionaries';
// ...
export async function getSettings(): Promise<AppSettings> {
    const [rows, locale] = await Promise.all([
        prisma.settings.findMany(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    const map = Object.fromEntries(rows.map((s) => [s.key, s.value]));
    return {
        communityName: map.communityName ?? t.brand.defaultCommunityName,
        // ...rest unchanged
    };
}
```
This works because every caller of `getSettings()` is already on the server and most already call `getLocale()` alongside it (`layout.tsx`, `page.tsx`, `signin/page.tsx`). Keep `DEFAULTS` for the other keys; `communityName`'s default now comes from the dictionary.

**Watch-out:** confirm `src/lib/i18n/locale.ts` (`getLocale`) and `src/lib/i18n/dictionaries.ts` (`getDictionary`) have no import cycle with `settings.ts`. They currently don't import `settings.ts`, so this is safe — but verify before committing.

If a cleaner alternative emerges (e.g. resolving the default at the render site rather than in `getSettings`), it's acceptable **only if** both the en and id AC still pass with an empty `Settings` table and there remains exactly one neutral source. Flag the choice in Completion Notes.

### Why chrome needs more than a neutral name (AC: 3, 4)
`src/app/layout.tsx:31-32` currently builds:
```ts
title: `${communityName} - ${t.auth.signInSubtitle}`,
description: `${t.auth.signInSubtitle} ${communityName}`,
```
`t.auth.signInSubtitle` = `"Badminton Community Management System"` (en) / `"Sistem Manajemen Komunitas Badminton"` (id) — see `dictionaries.ts:57,478`. So even with `communityName = "Sports Community"`, the tab title still reads "...- Badminton Community Management System" and **AC4 fails**. The fix is to source the metadata tagline from a **neutral** key, independent of the on-page `signInSubtitle` (which Story 1.2 will neutralize separately). This keeps Story 1.1 self-contained — it does not depend on Story 1.2 landing.

### Files to touch
- **UPDATE** `src/lib/settings.ts` — neutralize `DEFAULTS.communityName`; locale-resolve its default; remove the duplicate `communityAbbr`.
  - Current state: `DEFAULTS.communityName = 'Xclub Badminton'`; `getSettings()` returns `map.communityName ?? DEFAULTS.communityName` (locale-agnostic); contains a `communityAbbr()` copy duplicated in `utils.ts`. `defaultMonthlyFee`, `maxPlayers`, etc. — leave untouched (Epic 2).
  - Must preserve: `import 'server-only'`, the `getSettings()` signature/return shape used by all callers, and all non-`communityName` defaults.
- **UPDATE** `src/lib/i18n/dictionaries.ts` — add `brand.defaultCommunityName` + `brand.tagline` to **both** `en` and `id` (key parity). Do not modify existing `auth`/`landing` copy in this story.
- **UPDATE** `src/app/layout.tsx` — `generateMetadata()` builds title/description from `communityName` + neutral `brand.tagline`, not `signInSubtitle`. Preserve the `RootLayout` structure, providers, font vars, `lang={locale}`.
- **REPLACE** `src/app/favicon.ico` — neutral/generic favicon (binary asset).
- **VERIFY (likely no change)** `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx`, `src/app/page.tsx`, `src/app/auth/signin/page.tsx` — logo→abbr fallback already present (`logoUrl ? <Image> : communityAbbr(communityName)`).

### Architecture compliance (AD-10 — binding)
> Brand identity comes from `Settings.communityName` (neutral defaults: en "Sports Community" / id "Komunitas Olahraga") with `communityAbbr()` as the no-logo fallback; no bundled default logo; neutral favicon. Zero badminton / PB-Net-C strings in any user-facing surface. All user-facing strings route through `i18n/dictionaries.ts` with en/id parity.
- Identity is **data, never hardcoded** — the default lives in the dictionary, the configured value in `Settings`. Do not bake a name into a component.
- Per the spine, a neutral favicon asset is "a content/design choice, not an invariant" — but AC3 still requires it, so ship a neutral one.

### Library / framework requirements
- **Next.js 16 (App Router):** file-based metadata. `app/favicon.ico` is auto-served as the favicon — no `<link rel="icon">` needed. `generateMetadata()` returns a typed `Metadata`. Read `node_modules/next/dist/docs/` before changing metadata/favicon handling — Next 16 diverges from older training data (per CLAUDE.md / project-context).
- **i18n:** `getDictionary(locale)` + `getLocale()` are **server-only**; locale comes from the `NEXT_LOCALE` cookie resolved server-side. Never hardcode user-facing strings (NFR-6). Keep en/id parity.
- **No new dependencies.** No design-system or UI-library changes (AD-11).

### Code quality (NFR-7)
Functions ≤ 40 lines, files ≤ 300 lines, nesting ≤ 3 (early return), no magic numbers, naming conventions, booleans `is`/`has`/`should`. ESLint (next core-web-vitals + ts) runs on a pre-commit hook — `npm run lint` must pass.

### Testing standards
No automated test suite exists in this project (per CLAUDE.md / NFR-7). Verify manually:
- Empty `Settings` table → en shows "Sports Community", id shows "Komunitas Olahraga" in the identity mark and tab title.
- Tab title / metadata contain no "badminton", "Xclub", "PB Net-C", "Net-C" in either locale.
- Logo-unset state renders the abbreviation circle, not a broken image.
- `npm run lint` and `npm run build` both pass (NFR-8: no regression to existing flows).
Use `npx prisma studio` or a direct query to confirm an empty/seeded `Settings` state when testing the fresh-deployment path.

### Project Structure Notes
Aligns with the established layout: server-only helpers in `src/lib`, route-group layouts under `src/app/(main|admin)`, shared identity-mark rendering in `src/components/layout`. No new files expected except the replacement favicon asset. The `communityAbbr` consolidation removes a duplication rather than adding structure.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — story statement + ACs
- [Source: _bmad-output/planning-artifacts/epics.md#FR-1, FR-3] — functional requirements
- [Source: _bmad-output/planning-artifacts/architecture/architecture-net-c-management-2026-06-30/ARCHITECTURE-SPINE.md#AD-10] — identity-is-data invariant (lines 117-120)
- [Source: _bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md#deferred] — "Neutral favicon asset — a content/design choice" (line 226)
- [Source: src/lib/settings.ts:13-20,46-53] — `DEFAULTS` + duplicate `communityAbbr`
- [Source: src/lib/utils.ts:22-29] — canonical `communityAbbr`
- [Source: src/app/layout.tsx:24-34] — `generateMetadata` composing title from `signInSubtitle`
- [Source: src/lib/i18n/dictionaries.ts:57,478] — `auth.signInSubtitle` (contains "Badminton")
- [Source: _bmad-output/project-context.md] — i18n / server-only / Next 16 rules

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run lint` → clean (no errors/warnings).
- `npm run build` → success. TypeScript checked in 10.3s; 34/34 static pages generated; `/icon.svg` present in the route table; no `/favicon.ico` route (removed).

### Completion Notes List

- **AC1 — locale-sourced neutral default (design decision):** The AC's literal phrasing ("`DEFAULTS.communityName` holds the neutral value, sourced through the i18n dictionary") can't be satisfied by a single static field because the neutral default is locale-dependent ("Sports Community" en / "Komunitas Olahraga" id). Implemented the **spirit**: `communityName` is removed from the static `DEFAULTS` (now `Omit<AppSettings, 'communityName'>`) and its default is resolved at read time from `t.brand.defaultCommunityName` inside `getSettings()`. No brand string is baked into `settings.ts`. This matches the recommended approach pre-agreed in Dev Notes.
- **`getSettings()` is now locale-aware:** it calls `getLocale()` + `getDictionary()` (both already `server-only`). Verified no import cycle (`locale.ts`/`dictionaries.ts` do not import `settings.ts`) and that all 6 callers are request-scoped pages/layouts that already use `getLocale()`/`auth()` — so adding `cookies()` via `getLocale()` introduces no new static-rendering constraint (build confirms all routes remain dynamic as before).
- **AC2 — logo fallback:** no code change required; the `logoUrl ? <Image> : communityAbbr(...)` fallback already exists in all four identity-mark surfaces and `DEFAULTS.logoUrl=''` (no bundled logo).
- **AC3/AC4 — chrome:** metadata title/description now use the neutral `brand.tagline`; branded `favicon.ico` replaced by neutral `icon.svg` (abstract three-circle "community" mark on teal `#0F766E`). Verified `layout.tsx` is the only source of chrome metadata.
- **Scope honored:** did NOT touch `auth.signInSubtitle`, `landing.*` copy, the 🏸 emoji in `page.tsx`, or the green→teal app-accent swap — those belong to Story 1.2 / 4.3. The `signInSubtitle` strings that still contain "Badminton" are page-body copy on the sign-in page, no longer referenced by chrome.
- **Cleanup:** removed the dead duplicate `communityAbbr` from `settings.ts`; neutralized the doc-comment examples on the canonical `utils.ts` copy.
- **Not runtime-verified against a live DB:** project has no automated test suite (NFR-7) and the fresh-deployment/empty-`Settings` path needs a DB + cookie context. Verification is via type-check, production build, and static source audit. Recommend a quick manual smoke test (empty `Settings`, toggle `NEXT_LOCALE`) during review.

### File List

- **Modified** `src/lib/settings.ts` — neutral locale-resolved `communityName` default; removed duplicate `communityAbbr`.
- **Modified** `src/lib/i18n/dictionaries.ts` — added `brand.defaultCommunityName` + `brand.tagline` to `en` and `id`.
- **Modified** `src/app/layout.tsx` — `generateMetadata` uses neutral `brand.tagline` for title/description.
- **Modified** `src/lib/utils.ts` — neutralized `communityAbbr` doc-comment examples.
- **Added** `src/app/icon.svg` — neutral/generic platform favicon.
- **Deleted** `src/app/favicon.ico` — removed branded favicon.

## Change Log

| Date | Change |
|---|---|
| 2026-06-30 | Story 1.1 implemented: neutral locale-sourced default community name, neutral chrome (title/metadata/favicon), logo-fallback verification, `communityAbbr` de-duplication. Lint + build pass. Status → review. |
| 2026-06-30 | Epic 1 holistic code review passed (lint + build green; AC1–AC4 met; chrome audit found no sport/PB-Net-C strings). No findings. Status → done. |

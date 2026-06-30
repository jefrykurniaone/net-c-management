---
baseline_commit: bf58946006ff3cfd17c37fd964f94dbfdc1bfea9
---

# Story 1.2: Sport-neutral i18n copy & Ekskul → Activity relabel

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Member or Admin in either language,
I want all user-facing copy to be sport-neutral and the "Ekskul" label to read "Activity / Aktivitas",
So that the app reads as a generic multi-sport platform in both English and Indonesian.

**Epic:** Epic 1 — Activity-Agnostic Rebrand & Identity
**FRs:** FR-2 (no single-sport copy in user-facing strings; Ekskul → Activity/Aktivitas); supports FR-1/FR-3 (no residual sport/"PB Net-C" strings)
**Governed by:** AD-10 (Community & Activity identity is data, never hardcoded — zero badminton/PB-Net-C strings in any user-facing surface; the model name `Ekskul` stays, the user-facing label becomes Activity/Aktivitas; all strings route through `i18n/dictionaries.ts` with en/id parity)

## Acceptance Criteria

1. **Zero badminton-specific user-facing strings in the dictionary.**
   **Given** `src/lib/i18n/dictionaries.ts` (both `en` and `id` objects),
   **When** audited,
   **Then** zero badminton-specific user-facing strings remain — generic wording or the Activity's own name is used instead.

2. **"Ekskul" user-facing label reads Activity / Aktivitas.**
   **Given** any surface that previously showed "Ekskul",
   **When** rendered,
   **Then** the user-facing label reads "Activity" (en) / "Aktivitas" (id), while the underlying `Ekskul` model/table name **and the dictionary key names** (`ekskul.*`, `adminEkskul`, `colEkskul`, …) are unchanged.

3. **en/id parity + nothing hardcoded.**
   **Given** the bilingual dictionary,
   **When** keys are compared,
   **Then** en/id parity is preserved (every key exists in both — enforced by `const id: typeof en`) **and** no user-facing string is hardcoded outside the dictionary (the `🏸` emoji, the `'Xclub Badminton'` fallbacks, the `PB` identity mark, and the `'Badminton'`/`'badminton'` form placeholders are all removed/neutralised).

4. **i18n length tolerance (UX-DR20).**
   **Given** longer Indonesian strings (e.g. "Aktivitas" replacing "Ekskul"),
   **When** they render in labels/badges/nav/table headers,
   **Then** they wrap or use `min-w-0` + ellipsis with a `title` attribute — no fixed-width clipping that hides meaning.

---

## Tasks / Subtasks

- [x] **Task 1 — Neutralise badminton brand copy in `dictionaries.ts` (AC: 1, 3)**
  - [x] Replace the 4 badminton copy values in **both** `en` and `id` (keys unchanged, values only — see the Replacement Map in Dev Notes): `landing.badge`, `landing.heroTitle`, `auth.signInSubtitle`, `admin.ekskulSlugHint` (the `"badminton"` slug example → a neutral example).
  - [x] Neutralise `en.admin.ekskulSubtitle` ("…extracurricular activities" → "…activities"); confirm `id.admin.ekskulSubtitle` is handled in Task 2.
  - [x] Re-confirm Story 1.1's `brand.defaultCommunityName` / `brand.tagline` keys are untouched (they are correct and already neutral).

- [x] **Task 2 — Complete the Ekskul → Aktivitas relabel in the `id` locale (AC: 2, 3)**
  - [x] Update every `id` **value** that reads "Ekskul"/"ekskul"/"ekstrakurikuler" to "Aktivitas"/"aktivitas" — full list in the Replacement Map (sections `nav`, `admin`, `ekskul`, `onboarding`, `validation`). The `en` side is already relabelled to "Activity/Activities" (verify, do not duplicate).
  - [x] **DO NOT rename any dictionary key** (`adminEkskul`, `ekskulTitle`, `colEkskul`, `ekskul.label`, `ekskulSlugHint`, …) — only the string values change. Renaming a key breaks all 10 consumer files.
  - [x] Verify `const id: typeof en` still compiles (key parity intact) after edits.

- [x] **Task 3 — Neutralise hardcoded brand strings in UI components (AC: 1, 3)**
  - [x] `src/app/page.tsx:71` — replace the hardcoded `<span>🏸</span>` with a sport-neutral mark (a `lucide-react` icon already in scope, e.g. `Sparkles`/`Trophy`, sized `w-4 h-4`, or remove the span). Recommended: also drop the redundant trailing `{communityName}` in the badge (line 73) — `communityName` already appears in the header and hero paragraph — and let `landing.badge` stand alone (see Replacement Map).
  - [x] `src/app/onboarding/page.tsx:36` — replace `useState('Xclub Badminton')` with `useState(t.brand.defaultCommunityName)`; move the `const { locale } = useLocale(); const t = getDictionary(locale);` lines **above** this `useState` so `t` exists first.
  - [x] `src/app/onboarding/page.tsx:99` — replace the hardcoded `<span … >PB</span>` identity mark with `{communityAbbr(communityName)}`; add `import { communityAbbr } from '@/lib/utils';`.
  - [x] `src/app/(admin)/admin/settings/page.tsx:34` and `:127` — replace both `'Xclub Badminton'` literals with `t.brand.defaultCommunityName` (`t` is already computed at line 27).
  - [x] `src/app/(admin)/admin/ekskul/ekskul-actions.tsx:135,160` — replace the hardcoded `placeholder='Badminton'` / `placeholder='badminton'` with dictionary-sourced neutral placeholders. Add `admin.ekskulNamePlaceholder` + `admin.ekskulSlugPlaceholder` to **both** locales (en/id) and reference them via `t.admin.*`.

- [x] **Task 4 — i18n length-tolerance verification (AC: 4)**
  - [x] Spot-check the surfaces that render the relabelled (slightly longer) `id` strings: `src/components/layout/sidebar.tsx`, `mobile-nav.tsx`, `src/app/(admin)/admin/page.tsx` (`perEkskulTitle`), `src/app/(admin)/admin/ekskul/page.tsx` (`colEkskul` header, list), `src/app/(admin)/admin/members/page.tsx`, `src/app/(admin)/admin/payments/page.tsx`, `src/app/(admin)/admin/sessions/new/page.tsx`, `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx`, `src/app/(main)/payments/upload/page.tsx`, onboarding.
  - [x] Where a real clip exists at the longer `id` width, apply `min-w-0` + wrap, or `truncate` + `title={...}` — **only where needed**. Do not restyle otherwise; do not touch the green→teal accent (Story 4.3). Most flex/text containers wrap already; "Aktivitas" (9 chars) is unlikely to clip — confirm, don't pre-emptively refactor.

- [x] **Task 5 — Final audit & verification (AC: 1, 2, 3, 4)**
  - [x] `grep -rinE 'badminton|xclub|🏸|>PB<|persatuan|bulutangkis|shuttle' src` → zero user-facing hits (a non-user-facing code comment in `src/lib/validations/user.ts:25` is out of scope — see Dev Notes; leave or clean cosmetically, your call).
  - [x] Confirm en/id key parity (compiler-enforced) and that no new hardcoded user-facing string was introduced.
  - [x] `npm run lint` clean; `npm run build` passes (NFR-7, NFR-8 no regression).

---

## Dev Notes

### Scope boundary (read first — prevents over-reach)
This story is the **user-facing copy audit + the Ekskul→Activity relabel** (FR-2). It is pure string/markup work — **no schema, no data-model, no behavior change.**

**In scope**
- `dictionaries.ts` (en+id): the 4 badminton copy strings, the `id`-side Ekskul→Aktivitas relabel, the `en` "extracurricular" leftover, two new placeholder keys.
- Hardcoded user-facing brand strings in 4 components: the `🏸` emoji (`page.tsx`), the `'Xclub Badminton'` fallbacks (`onboarding`, `admin/settings`), the `PB` identity mark (`onboarding`), the `'Badminton'`/`'badminton'` form placeholders (`ekskul-actions`).
- i18n length-tolerance verification of the relabelled strings.

**NOT in scope (hard boundaries — do not touch)**
- **Code identifiers** `BadmintonSession` / `prisma.badmintonSession` / `Prisma.BadmintonSessionWhereInput` — these are the model rename, **Story 2.1 / FR-6 / AD-9** (a later epic). They are *not* user-facing strings. Leave every `prisma.badmintonSession.*` call exactly as-is.
- **Dictionary key names** — only VALUES change. Renaming `ekskul.*`/`adminEkskul`/`colEkskul`/`ekskulSlugHint` keys would break the 10 consumer files. (Key names are not user-visible.)
- **`positions` (Singles/Doubles/Both) + `levels` (Beginner/Intermediate/Advanced)** and the "Play Position"/"Player Level" form fields. These are enum-backed domain attributes (`PlayPosition`/`PlayerLevel`), already made "optional now that the app is multi-ekskul" per `src/lib/validations/user.ts:25`. Removing or renaming them is a product decision not captured in any FR/story — **excluded here, flagged as an open question below.** Do not change them.
- **`defaultMonthlyFee` / `t.admin.defaultFeeLabel` ("Default Monthly Dues")** in `admin/settings/page.tsx` and the dictionary — these are the global-fee removal, **Epic 2 / FR-7 / AD-8**. Leave them.
- **Green → Deep Teal accent token swap (UX-DR1)** — **Story 4.3.** Keep all `bg-green-*`/`text-green-*` classes as-is; this story does not restyle.
- **Repo/package rename** (`net-c-management`) — separable, out of the user-facing rebrand (PRD).

### Replacement Map (deterministic — implement exactly; adjust wording only to stay neutral + keep en/id parity)

**A. Badminton brand copy — change in BOTH locales (Task 1)**

| Key | en (current → new) | id (current → new) |
|---|---|---|
| `landing.badge` | `Badminton Community` → `Sports Community Platform` | `Komunitas Badminton` → `Platform Komunitas Olahraga` |
| `landing.heroTitle` | `Manage Your Badminton Community` → `Manage Your Community` | `Kelola Komunitas Badminton` → `Kelola Komunitas Anda` |
| `auth.signInSubtitle` | `Badminton Community Management System` → `Sports Community Management System` | `Sistem Manajemen Komunitas Badminton` → `Sistem Manajemen Komunitas Olahraga` |
| `admin.ekskulSlugHint` | `URL-friendly id, e.g. "badminton"` → `URL-friendly id, e.g. "yoga-club"` | `Id ramah-URL, contoh "badminton"` → `Id ramah-URL, contoh "klub-yoga"` |
| `admin.ekskulSubtitle` | `Create and manage extracurricular activities` → `Create and manage activities` | `Buat dan kelola ekstrakurikuler` → `Buat dan kelola aktivitas` (also covered by Task 2) |

> `landing.badge` is rendered as `{t.landing.badge} {communityName}` in `page.tsx:73`. Recommended: make `badge` stand alone (values above) and remove the trailing `{communityName}` on line 73 to kill the pre-existing redundancy ("Badminton Community Xclub Badminton"). Acceptable alternative: keep the interpolation and set `badge` to a prefix ("Welcome to" / "Selamat datang di"). Pick one; note the choice in Completion Notes.

**B. New placeholder keys — add to BOTH locales (Task 3, `ekskul-actions.tsx`)**

| Key | en | id |
|---|---|---|
| `admin.ekskulNamePlaceholder` | `e.g. Yoga, Futsal, Running` | `Contoh: Yoga, Futsal, Lari` |
| `admin.ekskulSlugPlaceholder` | `yoga-club` | `klub-yoga` |

**C. Ekskul → Aktivitas — `id` VALUES only (Task 2); `en` already done**

| Key | id current → new |
|---|---|
| `nav.adminEkskul` | `Kelola Ekskul` → `Kelola Aktivitas` |
| `admin.perEkskulTitle` | `Rincian per Ekskul` → `Rincian per Aktivitas` |
| `admin.ekskulTitle` | `Kelola Ekskul` → `Kelola Aktivitas` |
| `admin.ekskulSubtitle` | `Buat dan kelola ekstrakurikuler` → `Buat dan kelola aktivitas` |
| `admin.ekskulRegistered` | `ekskul` → `aktivitas` |
| `admin.newEkskul` | `Buat Ekskul` → `Buat Aktivitas` |
| `admin.editEkskul` | `Edit Ekskul` → `Edit Aktivitas` |
| `admin.colEkskul` | `Ekskul` → `Aktivitas` |
| `admin.createEkskulBtn` | `Buat Ekskul` → `Buat Aktivitas` |
| `admin.ekskulCreated` | `Ekskul berhasil dibuat!` → `Aktivitas berhasil dibuat!` |
| `admin.ekskulUpdated` | `Ekskul diperbarui!` → `Aktivitas diperbarui!` |
| `admin.ekskulDeleted` | `Ekskul dinonaktifkan` → `Aktivitas dinonaktifkan` |
| `admin.ekskulCreateFailed` | `Gagal membuat ekskul` → `Gagal membuat aktivitas` |
| `admin.ekskulUpdateFailed` | `Gagal memperbarui ekskul` → `Gagal memperbarui aktivitas` |
| `admin.ekskulDeleteFailed` | `Gagal menghapus ekskul` → `Gagal menghapus aktivitas` |
| `admin.ekskulDeleteHasDataError` | `…menghapus ekskul yang punya…` → `…menghapus aktivitas yang punya…` |
| `admin.confirmDeactivateEkskul` | `Nonaktifkan ekskul ini? …` → `Nonaktifkan aktivitas ini? …` |
| `admin.confirmActivateEkskul` | `Aktifkan kembali ekskul ini?` → `Aktifkan kembali aktivitas ini?` |
| `admin.noEkskul` | `Belum ada ekskul.` → `Belum ada aktivitas.` |
| `ekskul.label` | `Ekskul` → `Aktivitas` |
| `ekskul.filterAll` | `Semua Ekskul` → `Semua Aktivitas` |
| `ekskul.selectPlaceholder` | `Pilih ekskul` → `Pilih aktivitas` |
| `ekskul.yourEkskul` | `Ekskul Kamu` → `Aktivitas Kamu` |
| `ekskul.yourEkskulSub` | `Ekskul yang kamu ikuti` → `Aktivitas yang kamu ikuti` |
| `ekskul.noneJoined` | `…di ekskul mana pun.` → `…di aktivitas mana pun.` |
| `ekskul.leaveSuccess` | `Berhasil keluar dari ekskul` → `Berhasil keluar dari aktivitas` |
| `ekskul.notMember` | `Kamu bukan anggota ekskul ini` → `Kamu bukan anggota aktivitas ini` |
| `onboarding.ekskulLabel` | `Pilih Ekskul` → `Pilih Aktivitas` |
| `onboarding.ekskulHint` | `Pilih minimal satu ekskul untuk diikuti.` → `Pilih minimal satu aktivitas untuk diikuti.` |
| `validation.ekskulRequired` | `Pilih ekskul` → `Pilih aktivitas` |
| `validation.ekskulMembershipRequired` | `Pilih minimal satu ekskul` → `Pilih minimal satu aktivitas` |

> Note: `id.nav.adminEkskul` was the one nav item still on "Ekskul"; the rest of `id.nav.*` are already neutral. The `en` side of all the above already reads "Activity/Activities" — verify, don't re-edit.

### Files to touch
- **UPDATE** `src/lib/i18n/dictionaries.ts` — the only data file. Tasks 1, 2, and the two new placeholder keys (Task 3-B). ~750 lines; stays well under the 300-line *function/component* limits (this is a data module — the file-length rule targets logic files; do not split the dictionary). Preserve `const id: typeof en` (parity guard), `Dictionary`/`getDictionary` exports, `LOCALES`/`DEFAULT_LOCALE`/`LOCALE_COOKIE`.
- **UPDATE** `src/app/page.tsx` — Server Component. Remove `🏸` (line 71); optionally drop `{communityName}` on line 73. It already imports lucide icons + `communityAbbr` + `getSettings`/`getDictionary`. No new server calls needed.
- **UPDATE** `src/app/onboarding/page.tsx` — Client Component (`'use client'`). Reorder so `t` precedes the `communityName` `useState`; init from `t.brand.defaultCommunityName`; swap `PB` → `communityAbbr(communityName)`; add the `communityAbbr` import. The existing `/api/settings` fetch (lines 41-50) already propagates the real name — leave it; this only neutralises the *initial* literal. (Full propagation polish is Story 1.3.)
- **UPDATE** `src/app/(admin)/admin/settings/page.tsx` — Client Component. Two `'Xclub Badminton'` → `t.brand.defaultCommunityName`. `t` already at line 27. Do NOT touch `defaultMonthlyFee`/`maxPlayers`/fee label (Epic 2).
- **UPDATE** `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` — Client Component. Two hardcoded placeholders → `t.admin.ekskulNamePlaceholder` / `t.admin.ekskulSlugPlaceholder`. `t` is already in scope (used for labels/`ekskulSlugHint`).
- **VERIFY (change only if a real clip is found)** the 10 consumer surfaces in Task 4.

### Architecture compliance (AD-10 — binding)
> The user-facing label `Ekskul` → "Activity" / "Aktivitas" (**the model name `Ekskul` stays**). Zero badminton / PB-Net-C strings in any user-facing surface. All user-facing strings route through `i18n/dictionaries.ts` with en/id parity.
- Identity & labels are **data, never hardcoded** — that is exactly why Task 3 moves the `🏸`/`PB`/`'Xclub Badminton'`/placeholder literals into the dictionary or the neutral identity helpers.
- The `Ekskul` Prisma model, the `ekskulId` columns, the dictionary key names, and `prisma.badmintonSession` (separate concern) are untouched — only displayed text changes.

### i18n rules (NFR-6 / project-context)
- `getDictionary(locale)` + `getLocale()` are **server-only**; in Server Components (`page.tsx`) call them server-side. In Client Components (`onboarding`, `admin/settings`, `ekskul-actions`) the dictionary is obtained via `useLocale()` + `getDictionary(locale)` — that pattern already exists in all three; reuse it, never hardcode.
- en/id parity is compiler-enforced by `const id: typeof en` — a missing/renamed key fails `npm run build`. This is the parity safety net for AC3.
- zod schemas stay dictionary-aware (`buildXSchema(t)`); the `validation.ekskul*` value edits flow through automatically — no schema code change.

### Code quality (NFR-7)
Functions ≤ 40 lines · nesting ≤ 3 · no magic numbers · naming conventions · ESLint (next core-web-vitals + ts) on pre-commit. The 300-line *file* cap targets logic files, not the i18n data module. `npm run lint` must pass.

### Testing standards
No automated test suite exists (CLAUDE.md / NFR-7). Verify by: (1) `grep` audit → zero user-facing sport/brand strings; (2) `npm run lint` + `npm run build` (the `typeof en` guard catches parity breaks at build); (3) manual smoke — toggle `NEXT_LOCALE` to `id`, walk landing → onboarding → admin Activities/settings, confirm "Aktivitas" everywhere, no "Ekskul"/"Badminton"/"Xclub"/"PB"/`🏸`, no clipped labels.

### Previous Story Intelligence (Story 1.1 — `review`)
- 1.1 added `brand.defaultCommunityName` (en "Sports Community" / id "Komunitas Olahraga") and `brand.tagline` (en "Sports Community Management" / id "Manajemen Komunitas Olahraga"), and made `getSettings()` locale-resolve `communityName` from the dictionary. **Reuse `t.brand.defaultCommunityName` for the neutral fallbacks in Task 3 — do not invent a new default.**
- 1.1 **explicitly deferred to this story:** the `🏸` emoji in `page.tsx:71`, the `ekskulSlugHint` "badminton" example, and the Ekskul→Activity relabel. They are this story's core.
- 1.1 verified the logo→`communityAbbr` fallback in `sidebar.tsx`, `mobile-nav.tsx`, `page.tsx`, `auth/signin/page.tsx` — but **not** onboarding, which still hardcodes `PB`. Task 3 closes that gap with the same `communityAbbr(communityName)` pattern.
- 1.1's changes are in the working tree (uncommitted) on this branch; 1.1 left `signInSubtitle` (page-body copy) untouched on purpose — this story neutralises it.
- Pattern that worked in 1.1: keep edits value-only/minimal, lean on `npm run build` for parity, audit by grep. Repeat here.

### Git Intelligence
- Recent commits: `bf58946 docs(planning): add BMad planning artifacts…`, `f48eb79 chore(bmad): add BMad Method module config…`, `95335f0 fix(layout): render role-/theme-dependent UI on first paint`, `8c60a5e feat(auth): dev-only login…`. The codebase is stable; this branch (`chore/bmad-planning-epics-stories`) carries Story 1.1's uncommitted edits to `dictionaries.ts`, `settings.ts`, `layout.tsx`, `utils.ts` + new `icon.svg`. You will be editing `dictionaries.ts` on top of 1.1's brand-key additions — keep them.
- No new dependencies; no library/version concerns (pure copy/markup). `lucide-react` (already present) supplies the neutral icon for the `🏸` replacement.

### Project Structure Notes
Aligns with the established layout — single i18n source in `src/lib/i18n/dictionaries.ts`, client components consume via `useLocale()`+`getDictionary()`, server components via `getDictionary(getLocale())`. No new files (the two new keys live in the existing dictionary). No structural change.

### Open question (raised, non-blocking — does not gate this story)
- **Player Position/Level copy** ("Singles"/"Doubles"/"Both", "Player Level") are racket-sport-flavoured but are enum-backed domain attributes already made optional for multi-activity use. They were **left out of FR-2's "dictionaries.ts" copy mandate scope** here because neutralising them implies a product/data decision (rename/remove enums, forms, validation) not captured in any story. Flag for PM (`correct-course`) if the platform should drop racket-specific player attributes entirely. Default for now: leave as-is.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — story statement + ACs
- [Source: _bmad-output/planning-artifacts/epics.md#FR-2] — no single-sport copy; Ekskul → Activity/Aktivitas
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR20, UX-DR22] — i18n length tolerance; microcopy/voice
- [Source: ARCHITECTURE-SPINE.md#AD-10] — identity is data; label rename, model stays; en/id parity (lines 117-120)
- [Source: _bmad-output/project-context.md#i18n Rules] — server-only dict/locale; never hardcode; dict-aware zod
- [Source: src/lib/i18n/dictionaries.ts] — badminton copy (33/34/61/299/458/459/486/724); id Ekskul values (449,612,717-748,750-764,506-507,853-854); en `ekskulSubtitle` (293)
- [Source: src/app/page.tsx:71,73] — `🏸` + badge interpolation
- [Source: src/app/onboarding/page.tsx:36,99] — `'Xclub Badminton'` init + `PB` mark
- [Source: src/app/(admin)/admin/settings/page.tsx:34,127] — `'Xclub Badminton'` fallbacks
- [Source: src/app/(admin)/admin/ekskul/ekskul-actions.tsx:135,160] — `'Badminton'`/`'badminton'` placeholders
- [Source: implementation-artifacts/1-1-neutral-platform-defaults-chrome-identity.md] — 1.1 brand keys + deferred items

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run lint` → clean (no errors/warnings).
- `npm run build` → success. Compiled 6.2s; TypeScript checked in 8.0s (the `const id: typeof en` parity guard passed → en/id key parity intact, including the 2 new placeholder keys); 34/34 static pages generated; `/icon.svg` served. No regression (NFR-7, NFR-8).
- Audit grep `[Bb]adminton|[Xx]club|🏸|ekstrakurikuler|Komunitas Badminton|>PB<` over `src` → every remaining hit is a `badmintonSession`/`BadmintonSession` **code identifier** (Story 2.1 scope) plus one now-neutralised comment; zero user-facing brand/sport strings.
- Audit grep for dictionary **values** containing `Ekskul`/`ekskul` → **No matches** (all relabelled; only key names remain).

### Completion Notes List

- **AC1 — badminton copy:** Neutralised all 8 badminton brand values across `en`+`id` — `landing.badge`, `landing.heroTitle`, `auth.signInSubtitle`, `admin.ekskulSlugHint` (slug example) — plus `en.admin.ekskulSubtitle` ("extracurricular activities" → "activities").
- **AC2 — Ekskul → Aktivitas:** Relabelled the entire `id` locale (≈30 values across `nav`, `admin`, `ekskul`, `onboarding`, `validation`) from "Ekskul/ekskul/ekstrakurikuler" → "Aktivitas/aktivitas". `en` was already on "Activity/Activities" (verified). **Dictionary keys, the `Ekskul` Prisma model, and `prisma.badmintonSession` were left untouched** — only displayed string values changed.
- **AC3 — parity + nothing hardcoded:** en/id parity is compiler-enforced (`const id: typeof en`) and the build passed. Removed every hardcoded user-facing brand string: `🏸` → `<Sparkles>` icon (`page.tsx`); `'Xclub Badminton'` init → `t.brand.defaultCommunityName` and `PB` mark → `communityAbbr(communityName)` (`onboarding`); `'Xclub Badminton'` ×2 → `t.brand.defaultCommunityName` (`admin/settings`); `'Badminton'`/`'badminton'` placeholders → new dict keys `admin.ekskulNamePlaceholder` / `admin.ekskulSlugPlaceholder` (`ekskul-actions`).
- **AC4 — length tolerance:** Verified by inspection (no change needed). Relabelled strings render in `<th>` / `<h2>` / native `<option>` / nav links / `FormLabel` — all auto-width or wrapping. The only `truncate` usages are on user name/email (already `min-w-0`-guarded). "Kelola Aktivitas" (16) sits within the existing nav-label range (e.g. "Kelola Pembayaran" = 17, already fine).
- **Design decisions:** (1) `landing.badge` made a standalone neutral tagline and the redundant trailing `{communityName}` interpolation dropped from `page.tsx` (it removed the pre-existing "Badminton Community {name}" double-naming; `communityName` still appears in the header + hero paragraph). (2) Onboarding's `communityName` initial state is now locale-aware (`t.brand.defaultCommunityName`) — reordered so `t` is computed before the `useState`.
- **Reused, not reinvented:** the `brand.defaultCommunityName` key and `communityAbbr()` helper from Story 1.1 — no new default invented.
- **Cosmetic (sanctioned by Task 5):** neutralised the `src/lib/validations/user.ts:25` code comment to remove the last literal "Badminton" word (comments aren't user-facing, so not an AC, but cheap and on-theme).
- **Honoured scope boundaries (untouched):** `prisma.badmintonSession`/`BadmintonSession` code rename (Story 2.1 / FR-6 / AD-9); `defaultMonthlyFee` + "Default Monthly Dues" fee label (Epic 2 / FR-7 / AD-8); `positions`/`levels` domain enums (open question below); green→Deep-Teal accent swap (Story 4.3) — all `bg-green-*` left as-is.
- **Not runtime-verified against a live DB:** no automated test suite (NFR-7); validated via grep audit + lint + production build. Recommend a quick manual smoke at review — set `NEXT_LOCALE=id`, walk landing → onboarding → admin Activities/Settings, confirm "Aktivitas" everywhere and no "Ekskul"/"Badminton"/"Xclub"/"PB"/`🏸`.
- **Open question (non-blocking):** player Position/Level copy ("Singles"/"Doubles"/levels) is racket-sport-flavoured but enum-backed domain data already optional for multi-activity use — left as-is. Flag for PM (`correct-course`) if the platform should drop racket-specific player attributes.

### File List

- **Modified** `src/lib/i18n/dictionaries.ts` — neutralised 8 badminton copy values (en+id); relabelled all `id` Ekskul→Aktivitas values; added `admin.ekskulNamePlaceholder` + `admin.ekskulSlugPlaceholder` (en+id).
- **Modified** `src/app/page.tsx` — `🏸` → `<Sparkles>` icon (added to lucide import); `landing.badge` now standalone (dropped redundant `{communityName}`).
- **Modified** `src/app/onboarding/page.tsx` — `'Xclub Badminton'` init → `t.brand.defaultCommunityName` (reordered `t`); `PB` mark → `communityAbbr(communityName)` (+ import).
- **Modified** `src/app/(admin)/admin/settings/page.tsx` — two `'Xclub Badminton'` fallbacks → `t.brand.defaultCommunityName`.
- **Modified** `src/app/(admin)/admin/ekskul/ekskul-actions.tsx` — `'Badminton'`/`'badminton'` placeholders → dict-sourced neutral values.
- **Modified** `src/lib/validations/user.ts` — neutralised a code comment (removed "Badminton").

**Scope extension — recorded during Epic 1 review (2026-06-30):** removal of the badminton-specific `PlayPosition` / `PlayerLevel` player attributes (activity-agnostic data cleanup; conceptually overlaps FR-6). Implemented in the working tree but originally untracked in any story; attributed here per review decision. Clean removal — combined lint + build pass, no dangling references in `src/`, no orphaned dictionary keys.

- **Modified** `prisma/schema.prisma` — dropped the `PlayPosition` + `PlayerLevel` enums and the `User.playPosition` / `User.playerLevel` fields (applied via `prisma db push`, pre-launch, no migration file).
- **Modified** `src/lib/validations/user.ts` — removed the `PlayPosition`/`PlayerLevel` imports, the enum-value arrays, and the two optional fields from `buildOnboardingSchema` (in addition to the comment neutralisation noted above).
- **Modified** `src/app/(main)/profile/page.tsx` — removed the Play Position / Player Level `Select` form fields, their `Profile` interface members, default values, and reset wiring; dropped the now-unused `Select` import.
- **Modified** `src/app/onboarding/page.tsx` — removed the Play Position / Player Level FormFields and the now-unused `Select` import (additional to the `'Xclub Badminton'` → `t.brand.defaultCommunityName` and `PB` → `communityAbbr` changes above).
- **Modified** `src/app/(admin)/admin/members/page.tsx` — removed the Level/Position table column (header + cell) and its two `user.select` fields; decremented the empty-state `colSpan` 7 → 6.
- **Modified** `src/app/api/users/onboarding/route.ts` — dropped `playPosition`/`playerLevel` from the parsed payload and the `user.update` data.
- **Modified** `src/app/api/users/profile/route.ts` — dropped `playPosition`/`playerLevel` from the GET select, the parsed payload, the `user.update` data, and the returned select.
- **Modified** `src/app/api/users/route.ts` — dropped `playPosition`/`playerLevel` from the admin user-list select.
- **Modified** `src/app/(main)/sessions/[id]/page.tsx` — dropped `playPosition`/`playerLevel` from the attendee `user.select`.
- **Modified** `src/app/api/sessions/[id]/route.ts` — dropped `playPosition`/`playerLevel` from the attendee `user.select`.
- **Modified** `src/app/api/sessions/[id]/export/route.ts` — removed the "Posisi"/"Level" CSV header columns, their data cells, and the `user.select` fields (header + rows kept in sync).

## Review Findings (Epic 1 holistic code review — 2026-06-30)

Reviewed as part of a holistic Epic 1 review (all 4 stories, full working-tree diff vs `bf58946`, three adversarial lenses: Blind Hunter / Edge Case Hunter / Acceptance Auditor). Combined `npm run lint` + `npm run build` both pass (exit 0).

- [x] [Review][Decision] Undocumented scope: `PlayPosition`/`PlayerLevel` removal — RESOLVED. The change is clean (build green, no dangling `src/` references, no orphaned dictionary keys) and is legitimate activity-agnostic data work. Per review decision it is now recorded in this story's File List above (scope extension). No code change required.

## Change Log

| Date | Change |
|---|---|
| 2026-06-30 | Story 1.2 implemented: neutralised all badminton brand copy (en+id), completed the Ekskul→Aktivitas relabel in `id`, removed all hardcoded brand strings (`🏸`, `'Xclub Badminton'` ×3, `PB` mark, form placeholders) routing them through the dictionary/identity helpers, verified i18n length tolerance. Lint + build pass. Status → review. |
| 2026-06-30 | Epic 1 holistic code review passed (lint + build green; all ACs met). Recorded the previously-untracked `PlayPosition`/`PlayerLevel` removal as a scope extension in the File List (review decision). Status → done. |

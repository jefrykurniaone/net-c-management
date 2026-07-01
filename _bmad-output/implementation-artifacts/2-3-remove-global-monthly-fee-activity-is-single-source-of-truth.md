---
baseline_commit: 57f801bc0eb050f328c7ff182887c50394f0bcd7
note: Depends on Story 2.2 (Ekskul.monthlyFee now exists). Removes the legacy global Settings.defaultMonthlyFee so the Activity is the single source of truth for monthly dues.
---

# Story 2.3: Remove global monthly fee — Activity is single source of truth

Status: review

## Story

As an Admin,
I want the global default monthly fee gone so fees live only on Activities,
So that there is exactly one place a monthly fee can be set or be wrong.

**Epic:** Epic 2 — Payment Foundation
**FRs:** FR-7 (Monthly Fee single source of truth per Activity)
**Governed by:** AR-7 (remove `Settings.defaultMonthlyFee` entirely), AR-9 (pre-launch, no backfill), FR-15 (no orphaned/dead fields), NFR-8 (no regression)

## Acceptance Criteria

1. **Global fee removed from the settings layer.**
   **Given** `src/lib/settings.ts`,
   **When** the global fee is removed,
   **Then** `defaultMonthlyFee` is gone from the `AppSettings` interface, from `DEFAULTS`, and from `getSettings()`, and any `defaultMonthlyFee` Settings row is deleted from the DB (pre-launch, no backfill — AR-9).

2. **No fee field anywhere in Settings.**
   **Given** the General Settings UI (`src/app/(admin)/admin/settings/page.tsx`),
   **When** rendered,
   **Then** it exposes no monthly-fee field; no fee field appears anywhere in Settings (SM-2, FR-7). The now-orphaned `defaultFeeLabel` dictionary key is removed (no dead strings — FR-15).

3. **Every monthly-dues read sources from the Activity.**
   **Given** every code path that reads a Member's monthly dues,
   **When** audited,
   **Then** each one sources the amount from the Activity (`Ekskul.monthlyFee`), never the removed global; existing monthly Payment behavior is otherwise unchanged (NFR-8). (After Story 2.2 the only monthly-dues read — the proof-upload amount prefill — already uses `Ekskul.monthlyFee`.)

## Tasks / Subtasks

- [x] **Task 1 — Strip `defaultMonthlyFee` from the settings helper (AC: 1)**
  - [x] `src/lib/settings.ts`: remove the field from `AppSettings`, from `DEFAULTS`, and from the `getSettings()` return object.
- [x] **Task 2 — Remove the fee field from the Settings UI (AC: 2)**
  - [x] `src/app/(admin)/admin/settings/page.tsx`: remove `defaultMonthlyFee` from `SettingsMap`, the default state, and delete the fee `<Input>` block.
  - [x] `src/lib/i18n/dictionaries.ts`: remove the orphaned `defaultFeeLabel` key (en + id).
- [x] **Task 3 — Delete the stored row + stop re-seeding it (AC: 1)**
  - [x] `prisma/seed.ts`: remove `defaultMonthlyFee` from the `seedSettings` entries (keep the ekskul's `monthlyFee` seed value).
  - [x] DB: `DELETE FROM "Settings" WHERE key = 'defaultMonthlyFee';` on the dev DB.
- [x] **Task 4 — Audit + verify (AC: 3, NFR-8)**
  - [x] `git grep defaultMonthlyFee -- src/` → zero hits; confirm no component reads `settings.defaultMonthlyFee`.
  - [x] `npm run lint` + `npm run build` green; monthly proof-upload prefill still fills from `Ekskul.monthlyFee`.

## Dev Notes

### Scope boundary
- **In scope:** delete the global `defaultMonthlyFee` (interface, DEFAULTS, getSettings, settings UI field, dict label, seed entry, DB row).
- **NOT in scope:** the Activity fee config (Story 2.2, done) and Session-fee inheritance (Story 2.4).

### Safe to remove — nothing computes dues from the global (AC: 3)
`grep defaultMonthlyFee` before this story hit only `settings.ts` (definition) and `settings/page.tsx` (the UI field). No dues computation reads it: the monthly proof-upload amount prefill already reads `Ekskul.monthlyFee` (Story 2.2). The settings layouts consume only `communityName`/`logoUrl` from `getSettings()`. So dropping the field from `AppSettings` breaks no consumer.

### Settings API needs no change
`PATCH /api/settings` upserts whatever keys the body carries (no whitelist). Removing the UI field means the client stops sending `defaultMonthlyFee`; deleting the stored row means `GET /api/settings` stops returning it, so it can't be re-merged and re-persisted. No route edit required.

### References
- [Source: epics.md#Story 2.3], [epics.md#AR-7], [epics.md#FR-7], [epics.md#FR-15]
- [Source: src/lib/settings.ts], [src/app/(admin)/admin/settings/page.tsx], [src/app/api/settings/route.ts]

### Testing standards
No automated tests. Verify: `git grep defaultMonthlyFee -- src/` → zero; settings page renders with no fee field; `npm run lint` + `npm run build` green; monthly proof upload still prefills the Activity's `monthlyFee`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `git grep defaultMonthlyFee -- src/` → zero hits after edits (remaining hits are `prisma/seed.ts` + `prisma/backfill-ekskul.ts` seed-local constants for the ekskul's `monthlyFee` value, not the removed AppSettings global).
- DB: `DELETE FROM "Settings" WHERE key = 'defaultMonthlyFee';` via `prisma db execute --file` → "Script executed successfully".
- `npm run lint` → exit 0; `npm run build` → exit 0 (no consumer broke on the `AppSettings` field removal).

### Completion Notes List

- **settings.ts (AC1):** removed `defaultMonthlyFee` from the `AppSettings` interface, `DEFAULTS`, and the `getSettings()` return. Layouts consume only `communityName`/`logoUrl`, so no consumer broke.
- **Settings UI (AC2):** removed the `defaultMonthlyFee` `SettingsMap` key, its default state value, and the fee `<Input>` block — Settings now shows identity/location/whatsapp/maxPlayers only, no fee field. Removed the orphaned `defaultFeeLabel` dict key (en + id) so no dead string remains (FR-15).
- **Seed + DB (AC1):** dropped `defaultMonthlyFee` from `seedSettings` entries and deleted the stored row; since `PATCH /api/settings` has no whitelist, removing the UI field + the row means it is never re-sent or re-persisted.
- **Audit (AC3):** the single monthly-dues read (proof-upload amount prefill) already sources `Ekskul.monthlyFee` (Story 2.2); nothing computes dues from the removed global. Monthly Payment flow unchanged (NFR-8).
- **Note:** `DEFAULTS.defaultMonthlyFee` intentionally kept in `prisma/seed.ts` / `backfill-ekskul.ts` as the seed value for the demo Activity's `monthlyFee` — it is a seed-local constant, not the removed AppSettings global.

### File List

- **Modified** `src/lib/settings.ts` — removed `defaultMonthlyFee` from interface, DEFAULTS, getSettings.
- **Modified** `src/app/(admin)/admin/settings/page.tsx` — removed SettingsMap key, default, and the fee input block.
- **Modified** `src/lib/i18n/dictionaries.ts` — removed orphaned `defaultFeeLabel` (en + id).
- **Modified** `prisma/seed.ts` — removed `defaultMonthlyFee` from seeded Settings rows.
- **DB** — deleted the `defaultMonthlyFee` Settings row from the dev `netc` database.

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 2.3 created (context-filled). Scope: remove global `Settings.defaultMonthlyFee` from settings.ts (interface/DEFAULTS/getSettings), the settings UI field + orphaned dict label, the seed entry, and the DB row — Activity `monthlyFee` is now the single source. |

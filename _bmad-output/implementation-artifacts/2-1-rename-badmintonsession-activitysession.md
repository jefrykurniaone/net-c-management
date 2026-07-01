---
baseline_commit: bf58946006ff3cfd17c37fd964f94dbfdc1bfea9
note: Epic 1 changes are DONE but uncommitted in the working tree; this story builds on top of them. Recommend committing Epic 1 first so the rename diff is clean (see Dev Notes → Baseline & sequencing).
---

# Story 2.1: Rename BadmintonSession → ActivitySession

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the session model renamed from `BadmintonSession` to `ActivitySession` across the whole codebase,
So that no identifier encodes "badminton" and the payment-mode work (Stories 2.2–2.4, Epic 3) has a stable, neutrally-named base.

**Epic:** Epic 2 — Payment Foundation: Rename + Per-Activity Fee & Mode Config (Admin)
**FRs:** FR-6 (activity-agnostic codebase naming)
**Governed by:** AR-1 (rename first — lands and is lint/build-verified before any payment-mode schema change), AR-9 (schema evolution via `generate` + `db push`, pre-launch), AD-2 (auth contract — preserved, not changed), NFR-8 (no regression)

## Acceptance Criteria

1. **Schema model renamed.**
   **Given** `prisma/schema.prisma`,
   **When** the model is renamed,
   **Then** `model BadmintonSession` becomes `model ActivitySession` (NOT plain `Session` — NextAuth's `Session` model already exists), with its relations (`Ekskul.sessions`, `Attendance.session`) and `@@index([ekskulId])` updated, and the obsolete "Kept as BadmintonSession to avoid a repo-wide rename" comment (lines 138–139) removed/updated.

2. **Accessor + types + routes propagated.**
   **Given** all consuming code,
   **When** the rename propagates,
   **Then** the Prisma accessor is `prisma.activitySession` everywhere, the `BadmintonSession` / `Prisma.BadmintonSessionWhereInput` type references are updated to `ActivitySession` / `Prisma.ActivitySessionWhereInput`, `src/app/api/sessions/**` and any other route/page touching sessions are updated, and local variables named `badmintonSession` are renamed to `activitySession` (NOT `session` — avoids collision with the NextAuth `auth()` session).

3. **DB rename applied with no data loss.**
   **Given** the renamed schema,
   **When** the table rename is applied (dev, no prod data),
   **Then** the physical table is renamed `"BadmintonSession"` → `"ActivitySession"` **without dropping data** (Prisma `db push` cannot rename — it drops+recreates — so the rename is done via `ALTER TABLE … RENAME` through `prisma db execute` **before** `db push` reconciles indexes; see Dev Notes), the `Attendance.sessionId` FK still resolves, and the RLS policy in `prisma/rls-policies.sql` is updated to the new table name and re-applied.

4. **No "badminton" identifier remains; build + lint pass; no regression.**
   **Given** the full codebase after the rename,
   **When** searched,
   **Then** `git grep -i badminton -- src/ prisma/schema.prisma prisma/seed.ts prisma/rls-policies.sql prisma/backfill-ekskul.ts` returns **zero** model/type/route/accessor/variable hits (the immutable `prisma/migrations/**` history is the only allowed remaining occurrence), `npm run lint` and `npm run build` pass, and existing Session/Attendance behavior (list, detail, create, edit, delete, attendance register/cancel, CSV export, admin stats) is unchanged (NFR-8).

## Tasks / Subtasks

- [x] **Task 1 — Rename the Prisma model + relations (AC: 1)**
  - [x] In `prisma/schema.prisma`: `model BadmintonSession` → `model ActivitySession`; keep all fields/attributes identical (`@@index([ekskulId])` stays, now on the renamed model).
  - [x] Update `Ekskul.sessions BadmintonSession[]` → `ActivitySession[]` (line ~119).
  - [x] Update `Attendance.session BadmintonSession @relation(...)` → `ActivitySession @relation(...)` (line ~171).
  - [x] Remove/replace the obsolete comment at lines 138–139 ("Kept as BadmintonSession to avoid a repo-wide rename") — it documented the deferral this story now closes.
  - [x] `npx prisma generate` — regenerates the client so `prisma.activitySession` + the `ActivitySession` type exist.

- [x] **Task 2 — Propagate the accessor, types, and variables across `src/` (AC: 2, 4)**
  - [x] `prisma.badmintonSession` → `prisma.activitySession` in all 12 files: `prisma/seed.ts`, `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/sessions/page.tsx`, `src/app/(admin)/admin/sessions/[id]/edit/page.tsx`, `src/app/(main)/dashboard/page.tsx`, `src/app/(main)/sessions/page.tsx`, `src/app/(main)/sessions/[id]/page.tsx`, `src/app/api/ekskul/[id]/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/route.ts`, `src/app/api/sessions/[id]/attendance/route.ts`, `src/app/api/sessions/[id]/export/route.ts`.
  - [x] Type imports: `import type { BadmintonSession } …` → `ActivitySession` in `src/app/(admin)/admin/sessions/page.tsx` and `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx`; `Prisma.BadmintonSessionWhereInput` → `Prisma.ActivitySessionWhereInput` in `src/app/api/sessions/route.ts`.
  - [x] Local variables `badmintonSession` → `activitySession` (heaviest in `src/app/(main)/sessions/[id]/page.tsx` — 26 refs — plus `api/sessions/[id]/route.ts`, `attendance/route.ts`, `export/route.ts`, `admin/sessions/[id]/edit/page.tsx`). Do a careful find/replace, not a blind global one — verify each file still type-checks.

- [x] **Task 3 — Apply the DB rename with no data loss (AC: 3)**
  - [x] Run the table rename BEFORE `db push`: `npx prisma db execute --stdin` (or `--file`) with `ALTER TABLE "BadmintonSession" RENAME TO "ActivitySession";` against the dev DB (Session pooler, port 5432).
  - [x] `npx prisma db push` to reconcile the index (`BadmintonSession_ekskulId_idx` → `ActivitySession_ekskulId_idx`) and confirm the schema matches. Verify the diff is index-rename only, NOT a table drop/create (if `db push` proposes dropping `ActivitySession`/data, STOP — the ALTER did not run).
  - [x] Update `prisma/rls-policies.sql`: the `BadmintonSession` policy references (lines 13–14) → `ActivitySession`, and re-apply the policy SQL to the dev DB (`prisma db execute`).
  - [x] Update the raw-SQL table name in `prisma/backfill-ekskul.ts` (lines 5, 60, 83) so the historical/utility script stays runnable, OR leave it and note it as a spent one-off — pick one and record in Completion Notes.

- [x] **Task 4 — Verify: no "badminton", build/lint green, no regression (AC: 4)**
  - [x] `git grep -i badminton -- src/ prisma/schema.prisma prisma/seed.ts prisma/rls-policies.sql prisma/backfill-ekskul.ts` → zero hits.
  - [x] `npm run lint` → clean; `npm run build` → success (type-check passes; routes unchanged).
  - [x] Re-seed if needed (`npx prisma db seed`) and smoke-test the session flows listed in AC4 against the renamed table.

### Review Findings

_Code review 2026-07-01 — 3 adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). AC1–AC4 validated: rename is correct and behavior-preserving, no `session`/`auth()` shadowing (uses `authSession`/`activitySession`), generated client confirmed (625 `ActivitySession` refs, 0 `BadmintonSession`). Result: 1 patch, 3 deferred, 8 dismissed (Epic-1 changes intermingled in the shared `fac4883` commit — not rename defects)._

- [x] [Review][Patch] Stale docs still name `BadmintonSession` / `prisma.badmintonSession` [CLAUDE.md:40, _bmad-output/project-context.md:52] — fixed
- [x] [Review][Defer] RLS `CREATE POLICY` not idempotent after `ALTER TABLE RENAME` — add `DROP POLICY IF EXISTS` guards [prisma/rls-policies.sql:14] — deferred, pre-existing (all policies share the pattern; surface at prod RLS sync)
- [x] [Review][Defer] Migration ledger still creates `BadmintonSession` + dropped enums; `migrate deploy`/`reset` would build a schema that mismatches the client [prisma/migrations/20260627175208_init/migration.sql:105] — deferred, pre-existing (project provisions via `db push` per AR-9; `migrations/**` immutable per story scope)
- [x] [Review][Defer] Non-identifier `badminton` residue in seed/demo data + comments [prisma/seed.ts:6,29,62,66; prisma/backfill-ekskul.ts; prisma/schema.prisma:100,105] — deferred, pre-existing (AC4 identifier intent met; seed/rebrand cleanup story)

## Dev Notes

### Scope boundary (read first — prevents over-reach)
This story is the **mechanical, behavior-preserving rename ONLY** (FR-6, AR-1). It is the schema substrate for the rest of Epic 2 / Epic 3.
- **In scope:** the model/accessor/type/variable rename, the physical table rename (no data loss), the RLS-policy table-name update, and the backfill-script table-name update.
- **NOT in scope (Story 2.2):** `Ekskul.monthlyFee`/`sessionFee`/`allowsMonthly`/`allowsPerSession` and the Activity fee form. Do NOT add payment-mode fields here.
- **NOT in scope (Story 2.3):** removing `Settings.defaultMonthlyFee`.
- **NOT in scope (Epic 3):** `Payment.type`/`sessionId`, `PaymentType`/`PaymentMode` enums, partial unique index, per-session billing.
- **No behavior change.** Auth contract (`auth()` → `isAdminRole` → `zod.safeParse`), capacity logic, ekskul-scoping, and the proof/confirm flow all stay byte-for-byte equivalent — only identifiers change.

### Key implementation decision — true table rename, NOT a `db push` drop/recreate (AC: 3) — BINDING
Prisma's `db push` **cannot detect a model rename**: it sees `BadmintonSession` gone and `ActivitySession` new, so it would `DROP TABLE "BadmintonSession"` and `CREATE TABLE "ActivitySession"` — wiping all rows and breaking the `Attendance.sessionId` FK and the RLS policy. AC3 requires **no data loss**.

**Required order:**
1. Edit the schema model + relations (Task 1), `prisma generate`.
2. `ALTER TABLE "BadmintonSession" RENAME TO "ActivitySession";` via `prisma db execute` — Postgres renames the table in place; existing rows, the PK, and the inbound `Attendance_sessionId_fkey` all follow automatically (the FK targets the table OID, not its name).
3. `prisma db push` — now the table already exists with data; push only needs to reconcile the **index name** (`BadmintonSession_ekskulId_idx` → `ActivitySession_ekskulId_idx`), which is a drop+create of an *index*, not the table. **Gate:** if `db push` reports it will drop the table or any data, the ALTER did not apply — stop and fix before continuing.
4. Constraint cosmetics (`BadmintonSession_pkey` keeping its old name) are harmless and may be left; do not chase them.

**Acceptable fallback (pre-launch only):** because there is no production data and dev data is fully re-seedable, a plain `db push` drop+recreate followed by `npx prisma db seed` also satisfies the *spirit* of AC3 (no meaningful data lost). Prefer the `ALTER TABLE RENAME` path; fall back only if index/constraint reconciliation misbehaves, and record the choice in Completion Notes.

### Why `ActivitySession`, never `Session` (AC: 1)
NextAuth already defines a `Session` model (database sessions) in this schema. Renaming to `Session` would collide. The epic mandates `ActivitySession` specifically (AR-1, Story 2.1 AC). For the same reason, local variables become `activitySession`, never `session` — `session` is already bound to the `auth()` result in API routes (e.g. `const session = await auth()`), so reusing it would shadow auth state and risk a security regression.

### Files to touch (grouped)
- **Schema/DB:** `prisma/schema.prisma` (model + 2 relations + comment), `prisma/rls-policies.sql` (table name, re-apply), `prisma/backfill-ekskul.ts` (raw-SQL table name), `prisma/seed.ts` (`prisma.activitySession` accessor).
- **Accessor (src):** `admin/page.tsx`, `admin/sessions/page.tsx`, `admin/sessions/[id]/edit/page.tsx`, `(main)/dashboard/page.tsx`, `(main)/sessions/page.tsx`, `(main)/sessions/[id]/page.tsx`, `api/ekskul/[id]/route.ts`, `api/sessions/route.ts`, `api/sessions/[id]/route.ts`, `api/sessions/[id]/attendance/route.ts`, `api/sessions/[id]/export/route.ts`.
- **Types:** `admin/sessions/page.tsx`, `admin/sessions/[id]/edit/edit-form.tsx`, `api/sessions/route.ts` (`Prisma.*WhereInput`).
- **DO NOT TOUCH:** `prisma/migrations/20260627175208_init/migration.sql` — immutable migration history; its `BadmintonSession` references are a historical record, not a live identifier, and editing it would desync the migration ledger. AC4's grep explicitly excludes `prisma/migrations/**`.

### Baseline & sequencing
Epic 1 is `done` but **uncommitted** in the working tree. This rename layers on top of those changes (several target files — `admin/sessions/page.tsx`, `(main)/sessions/[id]/page.tsx`, `api/sessions/[id]/export/route.ts`, etc. — were also touched by Epic 1). **Recommended:** commit Epic 1 first (clean `feat`/`chore` commit) so the rename diff is reviewable in isolation. AR-1 also requires this rename to land and be build/lint-verified before Stories 2.2–2.4 begin.

### Library / framework requirements
- **Prisma 7 + driver adapter:** schema change → `npx prisma generate` then `npx prisma db push`; raw DDL/DML → `npx prisma db execute`. Import generated types from `@prisma/client`. Dev DB = Supabase **Session pooler (port 5432)**.
- **Next.js 16:** these are Server Components + Route Handlers; no routing/middleware change. `proxy.ts` matcher and route-group `layout.tsx` guards are untouched (presentation/data-identifier change only).
- **No new dependencies.**

### Code quality (NFR-7)
Functions ≤ 40 lines, files ≤ 300 lines, nesting ≤ 3, naming conventions, ESLint clean via pre-commit hook. The rename should not grow any file or function; it is a 1:1 identifier substitution.

### Testing standards
No automated test suite exists (CLAUDE.md / NFR-7). Verify via: `git grep -i badminton` (zero in scope), `npm run lint`, `npm run build`, and a manual smoke test of the session flows (member sessions list + detail + register/cancel; admin sessions list + create + edit + delete; CSV export; admin dashboard stats) against the renamed table after re-seed. Confirm `db push` did not drop data (row counts preserved if using the ALTER path).

### Project Structure Notes
Pure rename — no new files, no moved files, no structural change. The model comment update aligns the schema with reality (it is no longer "kept as BadmintonSession").

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — story statement + ACs
- [Source: _bmad-output/planning-artifacts/epics.md#AR-1] — rename-first sequencing invariant
- [Source: _bmad-output/planning-artifacts/epics.md#AR-9] — schema evolution via generate + db push, pre-launch
- [Source: _bmad-output/planning-artifacts/epics.md#FR-6] — activity-agnostic codebase naming
- [Source: prisma/schema.prisma:119,138-159,171] — model `BadmintonSession`, relations, `@@index`
- [Source: prisma/rls-policies.sql:13-14] — RLS policy on the `BadmintonSession` table
- [Source: prisma/backfill-ekskul.ts:5,60,83] — raw-SQL references to the table
- [Source: _bmad-output/project-context.md] — Prisma driver-adapter, db push, port 5432 dev, import enums/types from @prisma/client

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- Rename: scoped case-sensitive replace (`BadmintonSession`→`ActivitySession`, `badmintonSession`→`activitySession`) over exactly 16 files; `prisma/migrations/**` excluded. Obsolete model comment rewritten by hand.
- `npx prisma generate` → "Prisma Client generated".
- DB rename: `ALTER TABLE "BadmintonSession" RENAME TO "ActivitySession";` via `prisma db execute --stdin` → "Script executed successfully" (in-place; data preserved).
- `prisma db push` (via `node_modules/.bin/prisma` — the rtk hook mangled `npx prisma db push` into a binary-not-found) → "Your database is now in sync with your Prisma schema. Done in 165ms" — no data-loss prompt, index reconciled.
- Verify: `SELECT count(*) FROM "ActivitySession"` → success; `SELECT 1 FROM "BadmintonSession"` → P1014 (table gone). RLS re-apply → `ERROR: role "anon" does not exist` (local plain-Postgres `netc`; Supabase roles absent — expected).
- `npm run lint` → exit 0; `npm run build` → exit 0.
- `git grep "BadmintonSession\|badmintonSession" -- src/ prisma/ ':!prisma/migrations/'` → zero hits.

### Completion Notes List

- **Rename complete (AC1, AC2, AC4):** model `BadmintonSession` → `ActivitySession` (+ `Ekskul.sessions`, `Attendance.session` relations, `@@index`, comment); accessor `prisma.activitySession`; types `ActivitySession` + `Prisma.ActivitySessionWhereInput`; local vars `badmintonSession` → `activitySession`. Build + lint confirm type-correctness. Zero `badminton` identifiers remain outside immutable `migrations/`.
- **Local vars → `activitySession`, never `session`** — `session` is bound to `await auth()` in the API routes; reusing it would shadow auth state (security risk). Honored throughout.
- **DB rename with no data loss (AC3):** used `ALTER TABLE … RENAME` (in-place) *before* `db push`, so existing rows + the `Attendance.sessionId` FK survived; `db push` only reconciled the index name (no destructive change). Verified the old table is gone and the new one is queryable. No re-seed needed.
- **RLS (AC3):** `prisma/rls-policies.sql` updated to `"ActivitySession"`. The local dev DB is plain Postgres without Supabase's `anon`/`authenticated` roles, so these deny-policies were never applied locally (they target the Supabase Security-Advisor warning); a guarded re-apply errored on the missing role, as expected. On any DB that *does* carry the policy, `ALTER TABLE RENAME` keeps it attached to the renamed table. The file is ready for the eventual prod (`DATABASE_TARGET=prod`) sync.
- **rtk hook note:** `npx prisma db push` was intercepted by the rtk proxy (binary-not-found); ran the local binary `node_modules/.bin/prisma db push` directly. `db execute`/`generate` were unaffected.
- **Out-of-scope leftovers (flagged, NOT changed):** non-identifier `badminton` remains as **seed/demo data + illustrative comments** — `prisma/seed.ts` (the demo "Badminton" ekskul, slug `badminton`, `communityName 'Xclub Badminton'`), `prisma/backfill-ekskul.ts` (same), `prisma/schema.prisma` comments (`slug` example `"badminton"`, "e.g. Badminton, Music"). FR-6 / AC4 cover model/type/route **identifiers** only, which are clean. This residual is an Epic-1 rebrand / seed-data follow-up (recommend a small cleanup story), not part of this rename.
- **Baseline:** implemented directly on the uncommitted Epic 1 working tree (per user choice). Epic 1 + this rename are intermingled in the diff and not yet committed.

### File List

- **Modified** `prisma/schema.prisma` — `model BadmintonSession` → `ActivitySession`; `Ekskul.sessions` + `Attendance.session` relation types; comment rewritten (no longer "kept as BadmintonSession").
- **Modified** `prisma/seed.ts` — `prisma.activitySession` accessor.
- **Modified** `prisma/rls-policies.sql` — RLS policy target table `"BadmintonSession"` → `"ActivitySession"`.
- **Modified** `prisma/backfill-ekskul.ts` — raw-SQL table name `"BadmintonSession"` → `"ActivitySession"`.
- **Modified** `src/app/(admin)/admin/page.tsx` — accessor (×3 stat queries).
- **Modified** `src/app/(admin)/admin/sessions/page.tsx` — accessor + `BadmintonSession` type import + `SessionRow` type.
- **Modified** `src/app/(admin)/admin/sessions/[id]/edit/page.tsx` — accessor + local var.
- **Modified** `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx` — `BadmintonSession` type import + `SessionWithAttendances` type.
- **Modified** `src/app/(main)/dashboard/page.tsx` — accessor.
- **Modified** `src/app/(main)/sessions/page.tsx` — accessor.
- **Modified** `src/app/(main)/sessions/[id]/page.tsx` — accessor + local var (`badmintonSession` → `activitySession`, 26 refs).
- **Modified** `src/app/api/ekskul/[id]/route.ts` — accessor.
- **Modified** `src/app/api/sessions/route.ts` — accessor + `Prisma.BadmintonSessionWhereInput` → `Prisma.ActivitySessionWhereInput`.
- **Modified** `src/app/api/sessions/[id]/route.ts` — accessor + local var.
- **Modified** `src/app/api/sessions/[id]/attendance/route.ts` — accessor + local var.
- **Modified** `src/app/api/sessions/[id]/export/route.ts` — accessor + local var.
- **DB** — `ALTER TABLE "BadmintonSession" RENAME TO "ActivitySession"` + `prisma db push` (index reconcile) against the dev `netc` database.

## Change Log

| Date | Change |
|---|---|
| 2026-06-30 | Story 2.1 created (ready-for-dev). Scope: behavior-preserving rename `BadmintonSession → ActivitySession` (model + accessor + types + local vars + RLS policy + backfill script), with a no-data-loss DB rename via `ALTER TABLE RENAME` before `db push`. Mapped the full rename surface (17 files; 12 accessor sites, 3 type sites, ~40 local-var refs). Migration history left immutable. AR-1 prerequisite for Stories 2.2–2.4. |
| 2026-06-30 | Story 2.1 implemented. Renamed model/accessor/types/local-vars across 16 files; DB table renamed in place via `ALTER TABLE RENAME` (data preserved) + `db push` (index reconcile, no destructive change); RLS file updated (Supabase-only — local DB lacks `anon`/`authenticated`). Verified: zero `badminton` identifiers outside `migrations/`, old table gone (P1014), `npm run lint` + `npm run build` both green. Non-identifier seed/comment `badminton` flagged as out-of-scope Epic-1 follow-up. Status → review. |
| 2026-07-01 | Code review (3 adversarial layers). AC1–AC4 validated; rename confirmed correct + behavior-preserving, no `auth()`/`session` shadowing. 1 patch applied (stale `BadmintonSession`/`prisma.badmintonSession` refs in `CLAUDE.md` + `project-context.md`), 3 deferred (RLS idempotency, migration-ledger drift, seed/comment residue → `deferred-work.md`), 8 dismissed (Epic-1 changes intermingled in `fac4883`). Status → done. |

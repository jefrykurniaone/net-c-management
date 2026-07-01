---
baseline_commit: da9b298a658812208a77cce20e480ad20218339e
---

# Story 3.2: Payment model extension & mode-partitioned uniqueness

Status: done

## Story

As a developer,
I want `Payment` extended to carry monthly and per-session charges with mode-partitioned uniqueness,
So that a second per-session charge in a month is never blocked and every billing path writes payments the same, race-free way.

**Epic:** Epic 3 — Member Payment-Mode Selection & Billing
**FRs:** FR-10..12 (data substrate for mode-partitioned billing)
**Governed by:** AD-4 (single `Payment` model carries both charge types), AD-5 (mode-partitioned uniqueness; partial unique via raw SQL; transactional insert-or-update), AD-2 (server-computed amount), AD-3 (ekskul scoping), AD-12 (enums from `@prisma/client`), NFR-8 (no monthly regression)

## Acceptance Criteria

1. **`Payment` gains `type` + nullable `sessionId`, reusing existing proof/status columns.**
   **Given** `prisma/schema.prisma`,
   **When** `Payment` is extended,
   **Then** it gains `type` (`PaymentType` enum `MONTHLY | SESSION`) and a nullable `sessionId` FK → `ActivitySession`; no separate session-payment model is created; SESSION rows reuse the existing `proofUrl`/`proofPath`/`status`/`confirmedBy`/`confirmedAt` columns (AD-4); enums imported from `@prisma/client`.

2. **Legacy unconditional unique dropped; SESSION native unique + MONTHLY partial unique.**
   **Given** the legacy `@@unique([userId, ekskulId, month, year])`,
   **When** the schema is migrated,
   **Then** that unconditional unique is dropped; SESSION rows are constrained by native `@@unique([userId, sessionId])`, and MONTHLY rows by a **partial** unique index `(userId, ekskulId, month, year) WHERE type = 'MONTHLY'` applied out-of-band via raw SQL (`prisma db execute`), since `db push` cannot express a filtered unique (AD-5, AD-12).

3. **Monthly write migrated to transactional insert-or-update; SESSION via upsert on `(userId, sessionId)`.**
   **Given** the existing monthly proof-upload upsert,
   **When** it is migrated to the new model,
   **Then** MONTHLY rows are written via a **transactional insert-or-update** (`INSERT … ON CONFLICT … DO UPDATE` / guarded `$transaction`) — never `prisma.payment.upsert`, which cannot target a partial index — and SESSION rows are written via `prisma.payment.upsert` on `(userId, sessionId)` (AD-5). *(SESSION write path is implemented in Story 3.5; this story establishes the substrate + `(userId, sessionId)` unique it upserts on.)*

4. **SESSION rows derive period/ekskul/amount server-side.**
   **Given** a SESSION `Payment` row,
   **When** it is created,
   **Then** its `month`/`year` are derived from `ActivitySession.date`, its `ekskulId` equals the session's `ekskulId`, and its `amount` is computed server-side from the session fee and never trusted from the client — so existing `?month=`/`?year=` filters and admin stats include per-session payments and AD-3 scoping stays uniform (AD-4, AD-2). *(Enforced by the schema shape here; the derive-on-create logic ships with Story 3.5.)*

5. **No regression on the monthly flow.**
   **Given** the existing monthly Payment flow after migration,
   **When** a monthly proof is uploaded and confirmed,
   **Then** behavior is unchanged for members (one monthly row per member/Activity/month/year, same proof→confirm) — no regression (NFR-8).

## Tasks / Subtasks

- [x] **Task 1 — Extend the schema (AC: 1, 2)**
  - [x] Add `enum PaymentType { MONTHLY SESSION }` to `prisma/schema.prisma`.
  - [x] Add to `Payment`: `type PaymentType @default(MONTHLY)` (default keeps pre-existing rows + monthly flow working, NFR-8) and `sessionId String?`.
  - [x] Add `session ActivitySession? @relation(fields: [sessionId], references: [id], onDelete: Restrict)` + back-relation `payments Payment[]` on `ActivitySession`.
  - [x] Drop `@@unique([userId, ekskulId, month, year])`; add `@@unique([userId, sessionId])` + `@@index([sessionId])`.
  - [x] `npx prisma generate` → client regenerated with `PaymentType`.
  - [x] `npx prisma db push --accept-data-loss` → local dev DB in sync (empty `Payment` table; only flagged change was the new `(userId, sessionId)` unique — user consented).
- [x] **Task 2 — Partial unique index via raw SQL (AC: 2)**
  - [x] New `prisma/payment-monthly-unique.sql`: `CREATE UNIQUE INDEX IF NOT EXISTS "Payment_userId_ekskulId_month_year_monthly_key" … WHERE "type" = 'MONTHLY'` (idempotent).
  - [x] Applied via `npx prisma db execute --file prisma/payment-monthly-unique.sql`.
- [x] **Task 3 — Migrate the monthly write (AC: 3, 5)**
  - [x] New server-only `src/lib/payments.ts`: `upsertMonthlyPayment(input)` — update-first, then create, with a `P2002` fallback so a concurrent create that loses the race becomes an update. The partial unique index is the race arbiter.
  - [x] `src/app/api/payments/upload/route.ts` migrated off `prisma.payment.upsert` to `upsertMonthlyPayment`. Same PENDING-reset + clear-confirmation semantics preserved (NFR-8).
- [x] **Task 4 — Verify (NFR-8)**
  - [x] `eslint src/lib/payments.ts src/app/api/payments/upload/route.ts` clean (exit 0); `npm run build` green (full route table, types check against generated `PaymentType`).
  - [x] Confirmed DB index state via `pg_indexes`: partial unique `WHERE type = 'MONTHLY'` present, native `(userId, sessionId)` unique present, old unconditional unique **gone**, `sessionId` FK index present.

## Dev Notes

### Data model shape (AD-4)
A single `Payment` model carries both charge types — no separate session-payment table.
- `type PaymentType @default(MONTHLY)` — the default is deliberate: pre-existing rows and the untouched monthly flow keep working with zero changes (NFR-8). MONTHLY rows have `sessionId = null`.
- `sessionId String?` — set only on SESSION rows. For a SESSION row, `month`/`year`/`ekskulId` are derived server-side from the `ActivitySession` and `amount` is computed server-side from the session fee (AD-2) — so existing `?month=`/`?year=` filters and admin stats pick up per-session payments for free (AC4). The derive-on-create logic lands with Story 3.5; this story just guarantees the columns and constraints it needs.
- SESSION rows reuse `proofUrl`/`proofPath`/`status`/`confirmedBy`/`confirmedAt` — the same proof→confirm lifecycle as monthly (AD-4).

### Mode-partitioned uniqueness (AD-5) — why two different mechanisms
The old `@@unique([userId, ekskulId, month, year])` was unconditional: it would block a member from holding a MONTHLY row **and** a SESSION row in the same month, and block a second SESSION charge in a month — the opposite of what per-session billing needs. It is dropped and replaced by two partitioned constraints:
- **SESSION** → native `@@unique([userId, sessionId])`. Postgres treats `NULL` as distinct, so every MONTHLY row (`sessionId = null`) is exempt from this constraint automatically — no false collisions.
- **MONTHLY** → a **partial** unique index `(userId, ekskulId, month, year) WHERE type = 'MONTHLY'`. Prisma's schema DSL / `db push` cannot express a filtered unique, so it is applied out-of-band via `prisma db execute` (`prisma/payment-monthly-unique.sql`), mirroring the existing `rls-policies.sql` raw-SQL pattern.

### Race-free monthly write (`upsertMonthlyPayment`)
`prisma.payment.upsert` needs a unique-key `where`, but MONTHLY uniqueness lives in a **partial** index Prisma doesn't know about — so upsert can't be used. Instead `src/lib/payments.ts`:
1. `updateMany({ where: {userId, ekskulId, month, year, type: MONTHLY}, data })` — if `count > 0` the row existed → return it.
2. Else `create(...)`. If a concurrent request created it first, the partial unique index rejects this insert with `P2002`; we catch that and fall back to `updateMany`.

The partial unique index is the arbiter, so exactly one MONTHLY row per member/Activity/period can ever exist even under concurrent first-uploads — this is the "same, race-free way" the story asks for. cuid ids stay Prisma-generated (no raw-INSERT id juggling).

### `onDelete: Restrict` on the session FK — why not the Prisma default
Prisma's default action for an optional relation is `SetNull`. That is wrong here: nulling `sessionId` on a SESSION row would (a) break the "derived from the session" invariant and (b) collapse every such row to `(userId, null)`, colliding on `@@unique([userId, sessionId])`. `Restrict` protects payment records — a session a member has paid for cannot be silently deleted. The existing `DELETE /api/sessions/[id]` will therefore error if the session has payments; surfacing a friendly message for that is a Story 3.5 concern (no SESSION rows exist yet, so no live regression).

### Scope boundary
- **In scope:** `PaymentType` enum, `Payment.type` + `Payment.sessionId` + session relation, the unique-constraint swap (drop unconditional; add native SESSION unique + partial MONTHLY unique via raw SQL), and migrating the monthly proof-upload write to the race-free insert-or-update.
- **NOT in scope:** the SESSION write path / derive-on-create (Story 3.5), the mode selector UI + change route (Story 3.3), monthly billing UI (Story 3.4). Admin create (`POST /api/payments`) and list/stat queries are untouched — new columns are defaulted/nullable, so those paths keep working with `type = MONTHLY` implicitly.

### Lint gate note (carried from Story 3.1)
Repo-wide `npm run lint` (bare `eslint`) still fails on untracked `.claude/skills/wds-*` template `.js` files unrelated to this story. Scoped `eslint` on the changed files is clean and `npm run build` is green. If the repo-wide gate must pass, add `.claude/` to eslint ignores or the pre-commit scope.

### References
- [Source: epics.md#Story 3.2], [epics.md#AD-4], [epics.md#AD-5], [epics.md#AD-2]
- [Source: prisma/schema.prisma] — `PaymentType` enum + `Payment.type`/`sessionId`/session relation + unique swap
- [Source: prisma/payment-monthly-unique.sql] — partial unique index (raw SQL, `prisma db execute`)
- [Source: src/lib/payments.ts] — `upsertMonthlyPayment` race-free monthly write
- [Source: src/app/api/payments/upload/route.ts] — migrated off `prisma.payment.upsert`
- [Source: prisma/rls-policies.sql] — precedent for out-of-band raw-SQL application

### Testing standards
No automated tests in this project. Verify by construction + `npm run build` + live DB index inspection. Reasoning checks:
- Two concurrent first-uploads for the same member/Activity/period → exactly one MONTHLY row (partial index rejects the loser; it retries as update).
- A member with a MONTHLY row for July can still receive a SESSION row dated in July (different constraints; no collision).
- Two SESSION rows for the same member on the same session → blocked by `@@unique([userId, sessionId])`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npx prisma db push` reported one data-loss warning (adding `@@unique([userId, sessionId])`, "if there are existing duplicate values, this will fail"). `Payment` table is empty (seed creates no payments), so it is a false-positive. Pushed with `--accept-data-loss` after explicit user consent.
- `prisma db execute --file` in Prisma 7 reads the datasource URL from `prisma.config.ts` — `--schema`/`--url` flags are not accepted here.
- `eslint` (scoped) exit 0; `npm run build` green. Live `pg_indexes` inspection confirmed the final index set.

### Completion Notes List

- **AC1:** satisfied — `PaymentType` enum + `type`/`sessionId` on `Payment`; session relation added; proof/status columns reused; enum from `@prisma/client`.
- **AC2:** satisfied — unconditional unique dropped; native `(userId, sessionId)` unique added; MONTHLY partial unique index applied via `prisma db execute`; verified in `pg_indexes`.
- **AC3:** monthly write migrated to `upsertMonthlyPayment` (update-first + P2002 fallback, partial index as arbiter) — never `prisma.payment.upsert`. SESSION upsert-on-`(userId, sessionId)` substrate in place; the SESSION write itself is Story 3.5.
- **AC4:** satisfied structurally — columns + constraints let SESSION rows carry derived `month`/`year`/`ekskulId` and server-computed `amount`; derive-on-create logic ships with Story 3.5.
- **AC5:** satisfied — monthly upload keeps one-row-per-period, PENDING-reset, clear-confirmation semantics; `type` defaults MONTHLY so admin create + list/stat queries are unchanged. Build green.

### File List

- `prisma/schema.prisma` (modified — `PaymentType` enum, `Payment.type`/`sessionId`/session relation, unique swap, `sessionId` index; `ActivitySession.payments` back-relation)
- `prisma/payment-monthly-unique.sql` (new — partial unique index, raw SQL)
- `src/lib/payments.ts` (new — `upsertMonthlyPayment` race-free monthly write)
- `src/app/api/payments/upload/route.ts` (modified — migrated off `prisma.payment.upsert`)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 3.2 created + implemented. `Payment` extended with `PaymentType` + `sessionId`; unconditional unique swapped for native SESSION unique + partial MONTHLY unique (raw SQL). Monthly write migrated to race-free `upsertMonthlyPayment`. Build green; DB index set verified. |

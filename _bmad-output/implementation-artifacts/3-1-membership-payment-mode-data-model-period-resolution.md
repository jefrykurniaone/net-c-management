---
baseline_commit: 93ce4f2b984b37c9df3ef913f62b5afd28a6a2a1
---

# Story 3.1: Membership payment-mode data model & period resolution

Status: done

## Story

As a developer,
I want the member's payment mode stored on `Membership` and resolved as a function of the billing period,
So that mode is never inferred from past payments and a mid-period switch can never rewrite what the current period owes.

**Epic:** Epic 3 — Member Payment-Mode Selection & Billing
**FRs:** FR-10 (data substrate for member mode selection)
**Governed by:** AD-7 (Membership owns mode, period-resolved), AD-13 (billing-period primitive), AD-12 (enums from `@prisma/client`), AD-3 (ekskul scoping), NFR-1

## Acceptance Criteria

1. **`Membership` carries mode + effectiveFrom + a nullable pending switch.**
   **Given** `prisma/schema.prisma`,
   **When** the `Membership` model is extended,
   **Then** it carries `paymentMode` (`PaymentMode` enum `MONTHLY | PER_SESSION`) plus an `effectiveFrom` (`YYYYMM` int) and a nullable pending value for a queued switch, applied via `npx prisma generate` + `npx prisma db push`; the enum is imported from `@prisma/client`, never a string literal (AD-7, AD-12).

2. **Period-resolution helper; current period immutable.**
   **Given** a server-only helper `resolvePaymentMode(membership, …, month, year)` in `src/lib`,
   **When** it is called for a billing period (AD-13 calendar `month` 1–12 + `year`),
   **Then** it returns the effective mode for that exact period — the pending/`effectiveFrom` value applies only from its period forward, and any period at or before the current one resolves to the unchanged current mode.

3. **Single offered mode auto-applies; both-offered stays unselected (no silent default).**
   **Given** a member with no explicit mode on an Activity that offers exactly one mode,
   **When** the mode is resolved,
   **Then** the helper returns that single offered mode (auto-applied), never null; an Activity offering both with no member selection yet resolves to an explicit "unselected" (`null`) state the caller can prompt on.

4. **Mode data layer stays ekskul-scoped.**
   **Given** the data layer for mode,
   **When** a member-scoped read or write touches `Membership.paymentMode`,
   **Then** it stays ekskul-scoped — reads via `getUserEkskulIds(userId)`, writes gated by `assertMembership(userId, ekskulId)`; Admin/Owner (`isAdminRole`) see all (NFR-1, AD-3).

## Tasks / Subtasks

- [x] **Task 1 — Extend the schema (AC: 1)**
  - [x] Add `enum PaymentMode { MONTHLY PER_SESSION }` to `prisma/schema.prisma`.
  - [x] Add to `Membership`: `paymentMode PaymentMode?`, `effectiveFrom Int @default(0)`, `pendingMode PaymentMode?`, `pendingEffectiveFrom Int?`.
  - [x] `npx prisma generate` → client regenerated with `PaymentMode`.
  - [x] `npx prisma db push` → local dev DB in sync (force-reset + reseed; see Debug Log).
- [x] **Task 2 — Build the period-resolution helper (AC: 2, 3)**
  - [x] New server-only `src/lib/payment-mode.ts`: `toPeriodKey(month, year)`, `singleOfferedMode(offered)`, `resolvePaymentMode(membership, offered, month, year)`.
  - [x] Pure functions (no DB) — pending wins from its period forward; standing selection from its `effectiveFrom`; fall through to the offered set (single mode auto-applies, both-offered → `null`).
- [x] **Task 3 — Confirm ekskul-scoping contract (AC: 4)**
  - [x] Resolver is pure and consumes already-scoped membership data; the scoped reads/writes (`getUserEkskulIds` / `assertMembership` / `isAdminRole`) are exercised by the consumers in Stories 3.3–3.5. No unscoped mode query introduced in this story.
- [x] **Task 4 — Verify (NFR-8)**
  - [x] `eslint src/lib` clean (exit 0); `npm run build` green (full route table compiled, types check against generated `PaymentMode`).

## Dev Notes

### Data model shape (AR-6 / AD-7)
The v1 shape is exactly what AR-6 mandates: mode lives on `Membership`, never inferred from payments.
- `paymentMode PaymentMode?` — the standing selection. **`null` is the explicit "unselected" state** (member has not chosen on an Activity that offers both). Not a silent default.
- `effectiveFrom Int @default(0)` — the `YYYYMM` the standing mode applies from. `0` is a floor that means "applies to every period" and is only meaningful once `paymentMode` is non-null (the resolver gates on `paymentMode !== null` first).
- `pendingMode PaymentMode?` + `pendingEffectiveFrom Int?` — the nullable **queued switch**, set together by Story 3.3 when a member changes mode for a future period.

### Resolution algorithm (`resolvePaymentMode`)
Period is encoded as a comparable `YYYYMM` int via `toPeriodKey` (AD-13). For a queried period:
1. If a queued switch exists and `period >= pendingEffectiveFrom` → return `pendingMode`.
2. Else if a standing mode exists and `period >= effectiveFrom` → return `paymentMode`.
3. Else the Activity's offered set decides: `singleOfferedMode` returns the sole offered mode, or `null` when both (or none) are offered.

Because a queued switch always carries a **future** `pendingEffectiveFrom`, any period at or before the current one skips step 1 and keeps the standing mode — the current period is immutable by construction (AD-7). The resolver honors an explicit standing selection even if the Activity later disables that mode (mode-disable is not retroactive, AR-7).

### Why the resolver takes `offered` as a parameter
AC3's single-mode auto-apply requires the Activity's `allowsMonthly` / `allowsPerSession`. Rather than query inside the resolver (which would make it impure and unscoped), the caller passes the already-fetched `Ekskul` mode flags. This keeps the resolver a pure, testable function and leaves the ekskul-scoped fetch to the route/Server-Component layer (AC4).

### Scope boundary
- **In scope:** the `Membership` schema fields, the `PaymentMode` enum, and the pure period-resolution helper.
- **NOT in scope:** the selector UI + change route (Story 3.3), monthly billing (3.4), per-session billing (3.5), and the `Payment` model extension (3.2). This story is the data substrate only.

### Local-DB caveat (surfaced this session)
The local dev DB (`localhost:5432` → `netc`) was behind the committed Epic 1/2 schema (still had `BadmintonSession`, `Ekskul.defaultFee`, `User.playPosition/playerLevel`). With explicit user consent it was **force-reset + reseeded** (`npm run db:seed`) so schema now matches exactly. No production data (prod path requires `DATABASE_TARGET=prod`, unset).

### Lint gate note
`npm run lint` (bare `eslint`, whole repo) now **fails on untracked `.claude/skills/wds-*` template `.js` files** (`n/no-unsupported-features/node-builtins` rule not found + `no-require-imports`) that were dropped into the repo this session — unrelated to Epic 3 source. `eslint src/lib` is clean and `npm run build` is green. If the repo-wide lint gate must pass, add `.claude/` to `eslint` ignores or the pre-commit scope.

### References
- [Source: epics.md#Story 3.1], [epics.md#AR-6], [epics.md#AD-7], [epics.md#AD-13]
- [Source: prisma/schema.prisma] — `PaymentMode` enum + `Membership` mode fields
- [Source: src/lib/payment-mode.ts] — `toPeriodKey`, `singleOfferedMode`, `resolvePaymentMode`
- [Source: src/lib/ekskul.ts:14-44] — `getUserEkskulIds`, `assertMembership` (scoping consumed downstream)
- [Source: src/lib/utils.ts:14-16] — `isAdminRole`

### Testing standards
No automated tests in this project. Verify by construction + `npm run build`. Manual reasoning checks on the resolver:
- unselected member + single-mode Activity → returns that mode; unselected + both-offered → `null`.
- standing MONTHLY from 202607, queued PER_SESSION from 202608 → period 202607 = MONTHLY, 202608 = PER_SESSION (current period immutable).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- Local DB was stale (pre-Epic-2). Reset via `prisma db push --force-reset` (Prisma AI-guard consent given by user) + `npm run db:seed`; DB now in sync with schema.
- `npx prisma generate` OK; `prisma db push` OK. `eslint src/lib` exit 0; `npm run build` green.
- Repo-wide `npm run lint` fails only on untracked `.claude/skills/wds-*` files (not Epic 3 source) — see Dev Notes.

### Completion Notes List

- **AC1:** satisfied — `PaymentMode` enum + `paymentMode`/`effectiveFrom`/`pendingMode`/`pendingEffectiveFrom` on `Membership`; enum imported from `@prisma/client` in the helper; generate + db push applied.
- **AC2:** satisfied — `resolvePaymentMode` returns the period-exact mode; queued switch applies from `pendingEffectiveFrom` forward; current period immutable by construction.
- **AC3:** satisfied — `singleOfferedMode` auto-applies the sole offered mode; both-offered with no selection → `null` (explicit unselected, no silent default).
- **AC4:** satisfied by design — resolver is pure over already-scoped data; scoped reads/writes exercised by consumers (3.3–3.5); no unscoped mode query added.

### File List

- `prisma/schema.prisma` (modified — `PaymentMode` enum + `Membership` mode fields)
- `src/lib/payment-mode.ts` (new — period-resolution helper)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 3.1 created + implemented. `Membership` extended with `PaymentMode` mode fields; pure `resolvePaymentMode` period resolver added. Local DB reset+reseeded to sync schema. Build green. |

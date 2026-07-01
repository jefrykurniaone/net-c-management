---
baseline_commit: 37d9e34cee0fff54a8dc237e752ef79421630582
---

# Story 3.4: Monthly-mode billing

Status: review

## Story

As a Member on Monthly mode,
I want to owe one flat monthly fee per Activity regardless of how many sessions I attend,
So that my dues are predictable and sourced from the Activity's current fee.

**Epic:** Epic 3 — Member Payment-Mode Selection & Billing
**FRs:** FR-11 (monthly-mode = one flat charge per Activity per month), FR-7 (owed amount sourced from the Activity, not the removed global default)
**Governed by:** AD-8 (Activity is the single fee source; amount snapshots at creation), AD-2 (amount computed server-side, never trusted from the client), AD-5 (mode-partitioned MONTHLY uniqueness via the race-free insert-or-update from Story 3.2), AD-7 (mode is period-resolved; a per-session period raises no monthly charge; a switch to Monthly applies next period only), AD-13 (billing-period primitive), AD-12 (enums from `@prisma/client`), NFR-8 (no monthly-flow regression), UX-DR11 (proof uploader), UX-DR22 / NFR-6 (money-honest, bilingual en/id copy).

## Acceptance Criteria

1. **Owed amount = the Activity's current `monthlyFee`, server-sourced, flat, attendance-independent.**
   **Given** a Member whose effective mode for the target period is `MONTHLY` (resolved by `resolvePaymentMode` per Story 3.1),
   **When** the monthly charge is written,
   **Then** its `amount` equals the Activity's current `Ekskul.monthlyFee` — one flat charge per Member per Activity per month, independent of attendance count — and the amount is **computed server-side in the Route Handler and never trusted from the client** (FR-11, FR-7, AD-8, AD-2).

2. **One row per Member/Activity/`month`/`year`, `type = MONTHLY`, `sessionId = null`, amount snapshots at creation.**
   **Given** a monthly charge is created,
   **When** the `Payment` row is written,
   **Then** it is keyed per Member/Activity/`month`/`year` via the transactional insert-or-update + partial unique from Story 3.2 (`upsertMonthlyPayment`), with `type = MONTHLY` and `sessionId = null`; `amount` snapshots the fee at creation — a later `Ekskul.monthlyFee` edit never rewrites existing rows (no code batch-updates `Payment.amount`) (AD-5, AD-8 snapshot rule).

3. **A per-session (or unselected) effective mode raises no monthly charge; a switch to Monthly applies next period only.**
   **Given** a Member whose effective mode for the target period is `PER_SESSION` (or `null` = unselected on a both-offered Activity),
   **When** a monthly charge is attempted for that Activity/period,
   **Then** the Route Handler rejects it (mode gates billing) — no monthly `Payment` row is written; a member who switched to Monthly still resolves to their prior mode for the current period, so the switch applies from the next period only (AD-7).

4. **The proof→PENDING→confirm→CONFIRMED lifecycle is unchanged; owed amount sourced from the Activity, not the removed global default.**
   **Given** the existing monthly proof-upload + admin-confirm flow,
   **When** a Monthly member pays,
   **Then** it works exactly as before (upload proof → `PENDING` → admin confirm → `CONFIRMED`) with no regression (NFR-8), and the owed amount is sourced from `Ekskul.monthlyFee`, not the removed global default fee (FR-7).

5. **Uploader: image picker, amount prefilled to the owed monthly amount, submit gated on image, optimistic transition.**
   **Given** a Monthly member opens the proof uploader,
   **When** it renders,
   **Then** it presents an image picker (camera/library on phone), the amount field is **prefilled to the owed monthly amount and not member-editable** (the Activity's fee is the source of truth), submit is **disabled until the image is present**, and submitting shows an optimistic "uploading…" → "awaiting confirmation" transition (UX-DR11).

6. **All monthly money copy is plain, calm, money-honest, and bilingual (en/id parity), never hardcoded.**
   **Given** any money copy on the monthly billing surfaces,
   **When** it renders,
   **Then** it names the amount, the Activity, and the period; it is calm and money-honest; and it is served via `i18n/dictionaries.ts` with full en/id parity — no hardcoded user-facing strings anywhere (UX-DR22, NFR-6).

## Tasks / Subtasks

- [x] **Task 1 — Server helper: mode-gated owed amount in `src/lib/payments.ts` (AC: 1, 2, 3)**
  - [x] Add `resolveMonthlyOwed({ userId, ekskulId, month, year })` returning a discriminated union: `{ ok: true; amount: number }` when the member's effective mode for `(month, year)` is `MONTHLY` **and** `monthlyFee >= 1`; otherwise `{ ok: false; reason: 'notMonthly' } | { ok: false; reason: 'noFee' }`.
  - [x] Fetch both inputs the resolver needs: `prisma.membership.findUnique({ where: { userId_ekskulId: { userId, ekskulId } }, select: { paymentMode, effectiveFrom, pendingMode, pendingEffectiveFrom, isActive } })` and `prisma.ekskul.findUnique({ where: { id: ekskulId }, select: { allowsMonthly, allowsPerSession, monthlyFee } })`. If the membership is missing/inactive or the ekskul is missing → `{ ok: false, reason: 'notMonthly' }` (defensive; the route already 403s non-members, but never assume).
  - [x] Compute `effective = resolvePaymentMode(membershipModeFields, { allowsMonthly, allowsPerSession }, month, year)` (import `resolvePaymentMode` from `@/lib/payment-mode`). If `effective !== PaymentMode.MONTHLY` → `reason: 'notMonthly'`. Else if `monthlyFee < 1` → `reason: 'noFee'`. Else `{ ok: true, amount: monthlyFee }`.
  - [x] `PaymentMode` from `@prisma/client` — never string literals (AD-12). Keep the file `server-only` (already declared). No magic numbers (`MIN_FEE = 1` or inline `< 1` with a comment).
  - [x] **Do NOT change `upsertMonthlyPayment`.** Its update-path resetting `amount` is correct: a member re-uploading legitimately re-snapshots to the current fee. The AD-8 snapshot rule only forbids an admin `monthlyFee` edit auto-rewriting existing rows — no code does that, and this story adds none.

- [x] **Task 2 — Harden `POST /api/payments/upload` to be amount-authoritative + mode-gated (AC: 1, 2, 3, 4)** — `src/app/api/payments/upload/route.ts`
  - [x] After `assertMembership` passes and **before** any Supabase upload, validate `month`/`year` (keep the existing range check), then call `resolveMonthlyOwed({ userId, ekskulId, month, year })`.
  - [x] On `!ok`: `reason === 'notMonthly'` → **403** `{ error: t.payments.notMonthlyMode }`; `reason === 'noFee'` → **400** `{ error: t.payments.noMonthlyFee }`. Returning before the storage write means a rejected member never creates an orphaned proof object.
  - [x] Use the resolved `amount` for `upsertMonthlyPayment` and **stop trusting the client amount** — remove the `amount` formData parse and the `!amount || amount < 1` check (the server now owns the amount, AC1/AD-2). Everything else (file type/size checks, `uploadPaymentProof`, `upsertMonthlyPayment`, `201` response, PENDING reset semantics) is unchanged (NFR-8).
  - [x] Final order: `auth()` → 401 · locale/dict · parse form · `ekskulId` present → 400 · `assertMembership` → 403 · month/year range → 400 · `resolveMonthlyOwed` gate → 403/400 · file present/type/size → 400 · `uploadPaymentProof` · `upsertMonthlyPayment(amount = resolved)` → 201. Keep the function ≤ 40 lines by leaning on the helper; extract a small validation block if needed.

- [x] **Task 3 — Uploader UI: mode-aware picker, read-only prefilled amount, optimistic transition (AC: 3, 5, 6)** — `src/app/(main)/payments/upload/page.tsx`
  - [x] Switch the data source from `GET /api/ekskul?mine=true` to `GET /api/users/memberships` (Story 3.3 already returns per-Activity `joined`, `effectiveMode`, `monthlyFee`). Keep only entries where `joined && effectiveMode === 'MONTHLY'` — the member's monthly-eligible Activities for the current period. Map to `{ id, name, monthlyFee }`.
  - [x] On select (and auto-select when exactly one), set `amount = monthlyFee` of the chosen Activity. Render the amount field **read-only / display** (not member-editable) with `tabular-nums`, plus a calm helper line (`t.payments.amountLocked`) stating the fee is set by the Activity. Show a money-honest header naming amount + Activity + period (compose `t.payments.owedFor` with the Activity name + `t.months[month]` + year).
  - [x] **Disable the submit button until a file is selected** (amount is always derived, so file presence is the only user-supplied gate). Keep the `loading` busy state; on submit the button label swaps to `t.payments.submitting` ("Uploading…") and on success `toast.success(t.payments.toastSuccess)` ("Awaiting admin confirmation") then `router.push('/payments')` + `router.refresh()` — this is the optimistic "uploading… → awaiting confirmation" transition (UX-DR11). On failure `toast.error(err.error ?? t.common.error)`.
  - [x] Replace the hardcoded `locale === 'id' ? 'Klik untuk pilih gambar' : 'Click to select image'` ternary with `t.payments.selectImage` (NFR-6).
  - [x] Empty state: if there are no monthly-eligible Activities, render `t.payments.noMonthlyEkskul` and hide the form (a per-session-only member has no monthly dues to upload here).
  - [x] Reuse existing shadcn primitives already imported in this file (`Select`, `Input`, `Label`, `Button` — has a `loading` prop) and the `useLocale()` + `getDictionary(locale)` client-i18n pattern. Add no new dependency, no react-query, no `formatCurrency` util (money render stays inline `Rp {n.toLocaleString('id-ID')}`).

- [x] **Task 4 — i18n keys, en/id parity (AC: 6) — `src/lib/i18n/dictionaries.ts`**
  - [x] Add to the `payments` group in **both** `en` and `id`: `selectImage`, `amountLocked`, `owedFor`, `notMonthlyMode`, `noMonthlyFee`, `noMonthlyEkskul`. Reuse existing `submitting`, `toastSuccess`, `toastError`, `amountLabel`, `fileLabel`.
  - [x] Copy is calm and money-honest, naming the Activity + period (UX-DR22). Suggested en: `selectImage: 'Click to select image'`; `amountLocked: 'Set by this activity\'s monthly fee'`; `owedFor: 'Monthly dues for {activity} · {month} {year}'`; `notMonthlyMode: 'You\'re not on monthly billing for this activity this period.'`; `noMonthlyFee: 'This activity has no monthly fee set.'`; `noMonthlyEkskul: 'You have no activities billed monthly.'` Mirror faithfully in `id`.
  - [x] Route every new user-facing string (UI **and** the two route error messages) through the dictionary — no inline literals (project-context i18n rule).

- [x] **Task 5 — Verify (NFR-7, NFR-8)**
  - [x] `npx eslint` on every changed file → exit 0. `npm run build` → green (types check against generated `PaymentMode`/`PaymentType`).
  - [x] Reasoning/manual checks per "Testing standards" below (monthly amount = fee, per-session gated, unselected gated, no-fee gated, client amount ignored, no orphan proof on reject, monthly confirm lifecycle unchanged).

## Dev Notes

### The one behavioral change this story makes (READ FIRST)
The monthly proof-upload flow **already exists and works** (`/payments/upload` → `POST /api/payments/upload` → `upsertMonthlyPayment`, built in Story 3.2). This story does **not** rebuild it. It hardens two things and polishes the UI:
1. **Amount authority moves server-side.** Today the route trusts the client-sent `amount`. After this story the route computes `amount = Ekskul.monthlyFee` and ignores the client value (AC1, AD-2, AD-8).
2. **Billing is mode-gated.** Today any active member of the Activity can upload a monthly proof. After this story a member whose *effective mode for the target period* is not `MONTHLY` is rejected — mode gates billing (AC3, AD-7).

Everything else — the storage upload, the race-free `upsertMonthlyPayment`, the PENDING→confirm lifecycle, admin confirm/reject — stays exactly as-is (NFR-8).

### The gate is the security boundary; the UI filter is convenience
The Route Handler is the authority: it resolves the effective mode for the **member-selected** `(month, year)` and rejects a non-`MONTHLY` result. The uploader's picker filters to monthly-eligible Activities using `effectiveMode` from `GET /api/users/memberships`, but that field is resolved for the **current** period. If a member changes the month/year selector to a period where their mode differs, the client filter can't know — the route gate is what actually enforces AC3 for every period. Do not move the gate into the UI.

### Amount is snapshotted by the write, not by a batch job (AD-8)
`amount` is captured on the `Payment` row at write time inside `upsertMonthlyPayment`. There is deliberately **no** code that walks existing `Payment` rows when an admin edits `Ekskul.monthlyFee` — that is precisely the AD-8 snapshot rule ("a later monthlyFee edit never rewrites it"). A member re-uploading a proof re-snapshots to the then-current fee; that is correct, not a violation.

### Files to REUSE — do not reinvent
- **Race-free monthly write:** `upsertMonthlyPayment` (`src/lib/payments.ts`) — already the single monthly write path (update-first + `P2002` fallback, partial unique index as arbiter). Pass it the server-resolved `amount`. Do not touch its internals.
- **Mode resolver + period:** `resolvePaymentMode`, `currentPeriod`, `toPeriodKey`, `PaymentMode` re-exports (`src/lib/payment-mode.ts`, server-only). The resolver takes `(membership, offered, month, year)` — feed it the membership mode fields + the Activity's `allowsMonthly`/`allowsPerSession`.
- **Auth/scope:** `await auth()` (`@/lib/auth`), `assertMembership(userId, ekskulId)` (`@/lib/ekskul.ts:35-44`), `isAdminRole` (`@/lib/utils`) — never `role === 'ADMIN'`. Route contract: `await auth()` → 401 → zod/validation → 400/403 → `NextResponse.json`.
- **Member mode + fee source for the UI:** `GET /api/users/memberships` (`src/app/api/users/memberships/route.ts`) already returns per-Activity `joined`, `effectiveMode`, `monthlyFee`, `sessionFee`, offered modes — richer than `/api/ekskul?mine=true`. Consume it instead of adding a new endpoint.
- **Money render:** inline `Rp {n.toLocaleString('id-ID')}` + `tabular-nums` (see `(main)/payments/page.tsx:134`, `admin/ekskul/page.tsx:91-92`). There is **no** `formatCurrency` util — do not create one.
- **Client i18n + form/fetch pattern:** `useLocale()` (`@/components/providers/locale-provider`) + `getDictionary(locale)`; `fetch` + `sonner` toast + `loading` busy state already in `upload/page.tsx`. Mirror it — no react-query, no new fetch abstraction.
- **shadcn primitives present** (`src/components/ui/`): `select`, `input`, `label`, `button` (has `loading`), `badge`, `card`. Reuse; add no radio/date dependency.

### Route handler shape after hardening (Task 2 sketch)
```
const gate = await resolveMonthlyOwed({ userId: session.user.id, ekskulId, month, year });
if (!gate.ok) {
  const msg = gate.reason === 'noFee' ? t.payments.noMonthlyFee : t.payments.notMonthlyMode;
  const code = gate.reason === 'noFee' ? 400 : 403;
  return NextResponse.json({ error: msg }, { status: code });
}
// ...file checks + uploadPaymentProof...
const payment = await upsertMonthlyPayment({ ...args, amount: gate.amount });
```
Call the gate **before** `uploadPaymentProof` so a rejected request never leaves an orphaned Supabase object (mirrors the Story 3.5 orphan-avoidance concern, AD-14/NFR-3).

### Scope boundary
- **In scope:** the `resolveMonthlyOwed` helper; hardening `POST /api/payments/upload` (server-computed amount + mode gate, client amount dropped); the uploader UI (mode-eligible picker via memberships GET, read-only prefilled amount, submit-gated-on-image, optimistic transition, hardcoded-string fix, money-honest bilingual copy); i18n keys.
- **NOT in scope:** per-session pre-pay-on-register (Story 3.5) and any SESSION `Payment` write; any schema/`prisma db push`/enum change (the substrate is complete from 3.1/3.2); the admin confirm/reject route `PATCH /api/payments/[id]` (unchanged — the PENDING→CONFIRMED lifecycle already works, NFR-8); the admin manual-create route `POST /api/payments` (unchanged; admin may still set an amount there); the payments **history** page `(main)/payments/page.tsx` (unchanged — it already reads `Payment.amount`).

### Next.js 16 / project specifics
- No new page or API route is added; `POST /api/payments/upload` is already covered by the api matcher — no `proxy.ts`/layout change.
- `src/lib` must not import from `src/app` (AR-2); the helper stays pure/server-only over Prisma + the resolver.
- Route Handlers and `resolvePaymentMode`/`getDictionary` are server-only — never call the resolver from the client uploader; the client relies on `effectiveMode` already computed by the memberships GET.

### Lint gate note (carried from Stories 3.1–3.3)
Repo-wide `npm run lint` (bare `eslint`) still fails on untracked `.claude/skills/wds-*` template `.js` files unrelated to this story. Scope `eslint` to the changed files (clean) and rely on `npm run build` green. If the repo-wide gate must pass, add `.claude/` to eslint ignores.

### References
- [Source: epics.md#Story 3.4] (lines 413-443) — ACs + FR-11/FR-7 mapping
- [Source: prisma/schema.prisma:117-139] — `Ekskul.monthlyFee`/`allowsMonthly`/`allowsPerSession` (fee source)
- [Source: prisma/schema.prisma:206-242] — `Payment` (`type`/`sessionId`/partial-unique substrate from Story 3.2)
- [Source: src/lib/payment-mode.ts:39-115] — `currentPeriod`, `resolvePaymentMode`, `PaymentMode`
- [Source: src/lib/payments.ts:35-68] — `upsertMonthlyPayment` (reuse as-is)
- [Source: src/app/api/payments/upload/route.ts:20-105] — the route to harden (drop client amount; add gate)
- [Source: src/app/api/users/memberships/route.ts:25-88] — GET returning `effectiveMode`/`monthlyFee` for the picker
- [Source: src/app/(main)/payments/upload/page.tsx:1-252] — uploader to update (read-only amount, image gate, optimistic, i18n fix)
- [Source: src/lib/ekskul.ts:35-44] — `assertMembership`
- [Source: src/lib/i18n/dictionaries.ts:124-151,336-350] — `payments` + `paymentMode` groups to extend

### Testing standards
No automated tests in this project. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual reasoning checks:
- **Amount = fee, client value ignored:** a Monthly member uploads with a tampered client `amount` (or none) → the persisted `Payment.amount` equals `Ekskul.monthlyFee`, not the client value.
- **Per-session gated:** a member whose effective mode for the target period is `PER_SESSION` → 403 `notMonthlyMode`, no `Payment` row, no Supabase object written.
- **Unselected gated:** a member with `paymentMode = null` on a both-offered Activity → resolver returns `null` → 403 `notMonthlyMode`.
- **No-fee gated:** a monthly Activity with `monthlyFee = 0` → 400 `noMonthlyFee` (nothing to charge).
- **Switch is next-period only:** a member on standing MONTHLY who queued PER_SESSION for next period can still pay this period's monthly dues; the queued switch does not gate the current period (resolver returns MONTHLY for the current period).
- **No monthly regression:** upload → `PENDING`; admin confirm → `CONFIRMED`; re-upload resets to `PENDING` and re-snapshots amount; history page shows the row (NFR-8).
- **UI gates:** submit disabled with no image; amount field not member-editable and prefilled to the owed fee; per-session-only member sees the empty state, not the form; no hardcoded strings (en/id parity).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npx eslint` on all 4 changed files → "No issues found" (exit 0).
- `npm run build` → green; `/api/payments/upload` + `/payments/upload` compiled in the route table.

### Completion Notes List

- **Task 1:** `resolveMonthlyOwed(input)` added to `src/lib/payments.ts` — one parallel fetch of the membership mode fields + the Activity's `allowsMonthly`/`allowsPerSession`/`monthlyFee`, resolves the effective mode for the target period via `resolvePaymentMode`, returns `{ ok: true, amount }` only when effective mode is `MONTHLY` and `monthlyFee >= 1`, else `{ ok: false, reason: 'notMonthly' | 'noFee' }`. `PaymentMode` from `@prisma/client`; `MIN_MONTHLY_FEE` named const. `upsertMonthlyPayment` left untouched (its re-upload re-snapshot is correct; AD-8 only forbids fee-edit rewrites, which no code does).
- **Task 2:** `POST /api/payments/upload` hardened — the client `amount` parse + `amount < 1` check are removed (server owns the amount now). The `resolveMonthlyOwed` gate runs after `assertMembership` + month/year validation and **before** `uploadPaymentProof`, so a rejected member never leaves an orphaned proof object: `notMonthly` → 403 `t.payments.notMonthlyMode`, `noFee` → 400 `t.payments.noMonthlyFee`. The resolved amount feeds `upsertMonthlyPayment`. File/type/size checks, storage upload, PENDING-reset semantics, and the 201 response are unchanged (NFR-8).
- **Task 3:** `payments/upload/page.tsx` now sources Activities from `GET /api/users/memberships`, keeping only `joined && effectiveMode === 'MONTHLY'` (mode-eligible for the current period). The amount field is read-only, prefilled to the chosen Activity's `monthlyFee` (`Rp …` + `tabular-nums`), with an `amountLocked` helper line and a money-honest `owedFor` line naming Activity + month + year. Submit is disabled until an image is selected; the optimistic "uploading… → awaiting confirmation" transition is the `loading` label + success toast. Hardcoded `id`/`en` select-image ternary replaced with `t.payments.selectImage`. Per-session-only members see the `noMonthlyEkskul` empty state instead of the form.
- **Task 4:** 6 keys added to the `payments` group in both `en` and `id` (parity): `selectImage`, `amountLocked`, `owedFor`, `notMonthlyMode`, `noMonthlyFee`, `noMonthlyEkskul`. Money copy is calm and money-honest, naming Activity + period (UX-DR22).
- **Task 5:** eslint (scoped) + `npm run build` both green.

### File List

- `src/lib/payments.ts` (M) — `resolveMonthlyOwed` + `MonthlyOwed`/`MonthlyOwedInput` types, `MIN_MONTHLY_FEE`; imports `PaymentMode` + `resolvePaymentMode`
- `src/app/api/payments/upload/route.ts` (M) — server-authoritative amount + mode gate before storage upload; dropped client amount; `MIN_MONTH`/`MAX_MONTH` consts
- `src/app/(main)/payments/upload/page.tsx` (M) — mode-eligible picker via memberships GET, read-only prefilled amount, image-gated submit, money-honest copy, i18n fix, empty state
- `src/lib/i18n/dictionaries.ts` (M) — 6 `payments` keys (en/id parity)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 3.4 implemented. Monthly upload made amount-authoritative (amount = `Ekskul.monthlyFee`, client value ignored) and mode-gated (effective non-MONTHLY → 403, no charge, no orphaned proof). Uploader reworked: mode-eligible picker, read-only prefilled amount, image-gated submit, optimistic transition, money-honest bilingual copy, hardcoded string removed. eslint + build green. |

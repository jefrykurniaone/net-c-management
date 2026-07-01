---
baseline_commit: 98824cfea806c8a85354bcf408631123b4c153d4
---

# Story 3.3: Member selects a Payment Mode from the offered set

Status: review

## Story

As a Member,
I want to choose how I pay for an Activity from the modes it offers and change it for a future period,
So that I control whether I'm billed monthly or per session without affecting what I already owe.

**Epic:** Epic 3 — Member Payment-Mode Selection & Billing
**FRs:** FR-9 (member can only pick an offered mode), FR-10 (member selects/changes mode; effective next period)
**Governed by:** AD-7 (Membership owns mode, period-resolved; current period immutable), AD-2 (single mutation boundary — Route Handler + auth/zod contract, server-computed effective date), AD-3 / NFR-1 (ekskul scoping — a member sees only their own), AD-13 (billing-period primitive), AD-12 (enums from `@prisma/client`), UX-DR10 (mode selector), UX-DR3 (numeric typography), NFR-6 (i18n en/id parity), NFR-4 (a11y text+icon).

## Acceptance Criteria

1. **Both-offered → radio-card selector with fees; member must choose.**
   **Given** an Activity that offers **both** Monthly and Per-Session (`allowsMonthly && allowsPerSession`) and the member has not chosen yet (`paymentMode = null`),
   **When** the member opens the Activity's payment-mode selector on the profile "Your Activities" card,
   **Then** a segmented control / radio-card pair "Monthly" vs "Per-Session" renders, each card showing its fee (Monthly card → `Ekskul.monthlyFee`, Per-Session card → `Ekskul.sessionFee`) as `Rp {n.toLocaleString('id-ID')}` with `tabular-nums` weight-600; nothing is pre-selected (no silent default); a member on a both-offered Activity with no selection is prompted to choose (UX-DR10, UX-DR3, FR-10, AD-7).

2. **Single-offered → auto-applied and stated, no prompt; can't pick an unoffered mode.**
   **Given** an Activity that offers **exactly one** mode,
   **When** the member views it,
   **Then** that mode is auto-applied and simply stated (the resolver returns it; no selector renders) — and the member cannot select a mode the Activity does not offer: the UI never presents it, and the Route Handler rejects a request for a disabled mode with 400 (FR-9, FR-10).

3. **Change persists via auth-gated, ekskul-scoped Route Handler; effective NEXT period; current period never rewritten.**
   **Given** a member changes their mode,
   **When** they confirm,
   **Then** it is persisted via `PATCH /api/users/memberships/[ekskulId]/mode` following the AD-2 contract (`await auth()` → 401; `assertMembership(userId, ekskulId)` → 403; `zod.safeParse(body)` → 400 `{ error, details }`); the **first-ever** selection (`paymentMode = null`) takes effect **this** period (`effectiveFrom = current YYYYMM`, no pending) since nothing is owed yet; a **change from an existing standing mode** is queued as `pendingMode` / `pendingEffectiveFrom = next period` and **never** alters `paymentMode`/`effectiveFrom`, so the current period is immutable (AD-7); the effective date is computed **server-side** and never trusted from the client (AD-2); a small "effective next period" note echoing the queued mode + its period is shown (UX-DR10).

4. **Effective mode visible to member (own only) and to Admin (all); reads stay scoped.**
   **Given** the selected/effective mode,
   **When** the member or an Admin/Owner views the membership,
   **Then** the current effective mode (resolved for this period via `resolvePaymentMode`) is visible to both — the member on their own profile "Your Activities" card, the Admin on the member-detail page — and a member's read never returns another member's data: the member-facing GET is scoped to `session.user.id` (AD-3 / NFR-1); `isAdminRole` sees all.

## Tasks / Subtasks

- [x] **Task 1 — Period helpers on `src/lib/payment-mode.ts` (AC: 3)**
  - [x] Add pure, `now`-injected helpers next to the existing resolver: `currentPeriod(now: Date): { month: number; year: number }` and `nextPeriod(now: Date): { month: number; year: number }` (December rolls to January of next year). No `Date.now()` inside — caller passes `now` so they stay pure/testable, matching `resolvePaymentMode`'s design.
  - [x] Reuse the existing `toPeriodKey(month, year)` to derive `YYYYMM` keys; do NOT re-implement the `year * 100 + month` encoding.
  - [x] Keep the file `server-only` (already declared) and the `MONTH_*` bounds as named constants (no magic numbers; e.g. `MONTHS_PER_YEAR = 12`, `DECEMBER = 12`, `JANUARY = 1`).
- [x] **Task 2 — Dict-aware zod schema `src/lib/validations/membership.ts` (AC: 2, 3)**
  - [x] New file mirroring `src/lib/validations/ekskul.ts`: `export function buildUpdatePaymentModeSchema(t: Dictionary)` returning `z.object({ mode: z.enum(PaymentMode) })` (zod 4 accepts a native enum; import `PaymentMode` from `@prisma/client`, never string literals — AD-12). Attach the i18n error via the enum's `error` option (`t.validation.paymentModeRequired`).
  - [x] Export `export type UpdatePaymentModeFormData = z.infer<ReturnType<typeof buildUpdatePaymentModeSchema>>`.
  - [x] **Body carries ONLY `mode`.** The effective/next-period date is server-derived (Task 3) — never accept `effectiveFrom`/`pendingEffectiveFrom` from the client (AD-2, NFR-3 server-computed).
- [x] **Task 3 — New Route Handler `src/app/api/users/memberships/[ekskulId]/mode/route.ts` (AC: 2, 3, 4)**
  - [x] `PATCH` with `{ params }: { params: Promise<{ ekskulId: string }> }` (Next 16 async params — `const { ekskulId } = await params`).
  - [x] Contract order: `await auth()` → 401 if no `session.user.id`; `getLocale()` + `getDictionary(locale)`; `assertMembership(userId, ekskulId)` → 403 if not an active member; `buildUpdatePaymentModeSchema(t).safeParse(body)` → 400 `{ error, details: parsed.error.issues }`.
  - [x] Fetch `ekskul.findUnique({ where: { id: ekskulId }, select: { allowsMonthly, allowsPerSession } })` → 404 if missing; reject a disabled mode (`MONTHLY` when `!allowsMonthly`, `PER_SESSION` when `!allowsPerSession`) with **400** (`t.validation.paymentModeNotOffered`) — enforce server-side, not UI-only (FR-9).
  - [x] Read current membership mode: `findUnique({ where: { userId_ekskulId }, select: { paymentMode, effectiveFrom, pendingMode, pendingEffectiveFrom } })`.
  - [x] Compute `now = new Date()`; `curKey = toPeriodKey(currentPeriod(now))`; `nextKey = toPeriodKey(nextPeriod(now))`. Apply switch logic (see Dev Notes "Switch semantics"):
    - `paymentMode === null` → **first selection**: `{ paymentMode: mode, effectiveFrom: curKey, pendingMode: null, pendingEffectiveFrom: null }`.
    - `mode === paymentMode` → **cancel any queued switch**: `{ pendingMode: null, pendingEffectiveFrom: null }`.
    - else → **queue change**: `{ pendingMode: mode, pendingEffectiveFrom: nextKey }` (leave `paymentMode`/`effectiveFrom` untouched — current period immutable).
  - [x] `prisma.membership.update` scoped by the `userId_ekskulId` compound unique (never a bare `ekskulId` where — that would be cross-member). Return `NextResponse.json({ paymentMode, effectiveFrom, pendingMode, pendingEffectiveFrom }, { status: 200 })`.
- [x] **Task 4 — Extend member GET `src/app/api/users/memberships/route.ts` (AC: 1, 2, 4)**
  - [x] For each **joined** ekskul, include the fields the card needs: `paymentMode`, `effectiveFrom`, `pendingMode`, `pendingEffectiveFrom`, `allowsMonthly`, `allowsPerSession`, `monthlyFee`, `sessionFee`, and a server-computed `effectiveMode` = `resolvePaymentMode(membershipModeFields, { allowsMonthly, allowsPerSession }, currentPeriod(now))`.
  - [x] Widen the `prisma.ekskul.findMany` select to add `monthlyFee`, `sessionFee`, `allowsMonthly`, `allowsPerSession`; widen the `prisma.membership.findMany` select to add the four mode fields; join them by `ekskulId`. Keep the query **scoped to `session.user.id`** (AD-3) — do not leak other members' rows.
  - [x] `resolvePaymentMode` is `server-only`; call it here (Route Handler is server) — never from the client card.
- [x] **Task 5 — Member selector UI in `src/app/(main)/profile/ekskul-memberships.tsx` (AC: 1, 2, 3)**
  - [x] Extend `MembershipEkskul` with the new fields from Task 4. For a **joined** ekskul: if it offers both modes → render the radio-card selector (see Dev Notes "UI"); if one mode → render a read-only "You pay: {mode}" line (auto-applied, stated); if not joined → unchanged join button (selector only after join).
  - [x] Each mode card shows label + fee `Rp {n.toLocaleString('id-ID')}` in a `tabular-nums` span; convey selection by text/checkmark + border, not color alone (NFR-4). Highlight the current `effectiveMode`; if `pendingMode` is set, show the "effective next period" note (`t.paymentMode.effectiveNext` with the resolved next-period label).
  - [x] On choose/confirm → `PATCH /api/users/memberships/{ekskulId}/mode` with `{ mode }`; on success `toast.success` + re-fetch `/api/users/memberships` (re-read is simplest correctness — mode display then reflects first-select-now vs change-next-period) and reset pending UI state; on failure `toast.error(err.error ?? t.common.error)` and keep the prior selection. Mirror the existing `toggle()` fetch/`sonner`/`pendingId` pattern already in this file — do not add react-query or a new fetch abstraction.
- [x] **Task 6 — Admin visibility on `src/app/(admin)/admin/members/[id]/page.tsx` (AC: 4)**
  - [x] On the admin member-detail Server Component, for each of that member's memberships show the current effective mode (reuse `resolvePaymentMode` with `currentPeriod(now)`), read-only, with `tabular-nums` on any fee shown. Guard the page as admin already does (route-group `layout.tsx` + `isAdminRole`); no member reaches this route. If a pending switch exists, optionally note the queued mode + period.
  - [x] This is display-only — no new admin mutation.
- [x] **Task 7 — i18n keys `src/lib/i18n/dictionaries.ts` (AC: 1, 2, 3) — en/id parity (NFR-6)**
  - [x] Add a `paymentMode` group to **both** `en` and `id`: `title`, `monthly`, `perSession`, `monthlyDesc`, `perSessionDesc`, `choosePrompt` ("Choose how you pay"), `youPay` ("You pay: {mode}"), `effectiveNext` ("Effective {period}"), `changeCta`, `saved`. Add to the `validation` group: `paymentModeRequired`, `paymentModeNotOffered`. Money copy stays money-honest and names the Activity/period per UX-DR22.
  - [x] No hardcoded user-facing strings anywhere in Tasks 5/6 — route every label through the dictionary (NFR-6, project-context i18n rule).
- [x] **Task 8 — Verify (NFR-7, NFR-8)**
  - [x] `npx eslint` on every changed file clean (exit 0); `npm run build` green (types check against generated `PaymentMode`).
  - [x] Reasoning/manual checks per "Testing standards" below (first-select-now, change-next-period, unoffered-mode reject, scoping).

## Dev Notes

### The design decision this story makes (READ FIRST)
The epic's UX-DR10 says the selector is "changeable later from **Activity view**", but members have **no dedicated Activity-detail page** today. The member's existing "Activity view" is the **profile "Your Activities" card** (`src/app/(main)/profile/ekskul-memberships.tsx`), which already lists every active Activity with a join/leave control and already fetches `GET /api/users/memberships`. **This story places the selector there** — lowest new surface area, maximal reuse. Do **not** build a new `/activities/[id]` page. (See "Project Structure Notes" + the open question at the end.)

### Switch semantics — the heart of AC3 (AD-7, current-period immutability)
The resolver in `src/lib/payment-mode.ts` (Story 3.1) already encodes how a period resolves; this story writes the fields it reads. Three cases, computed server-side in the Route Handler:

| Current state | Member picks | Write | Why |
|---|---|---|---|
| `paymentMode = null` (never chosen) | any offered mode | `paymentMode = mode`, `effectiveFrom = curKey`, clear pending | Nothing is owed yet — "must choose before billing applies". Applies **now**. |
| `paymentMode = X` | `X` (same) | clear `pendingMode`/`pendingEffectiveFrom` | Cancels a previously queued switch; no-op on the standing mode. |
| `paymentMode = X` | `Y` (different) | `pendingMode = Y`, `pendingEffectiveFrom = nextKey`; **leave `paymentMode`/`effectiveFrom`** | Current period keeps `X` (immutable, AD-7); `Y` applies from next period via the resolver's pending branch. |

`nextKey`/`curKey` come from `toPeriodKey(...)` over `currentPeriod(now)` / `nextPeriod(now)`. Because a queued switch always carries a **future** key, `resolvePaymentMode` returns the standing mode for the current period and the pending mode from `nextKey` forward — the immutability is structural, not a runtime check.

**Do not accept the effective date from the client.** The body is `{ mode }` only. Deriving the date server-side is the AD-2 guarantee that a member can't backdate a switch to rewrite what they owe.

### Files to REUSE — do not reinvent
- **Auth/scope helpers:** `await auth()` (`@/lib/auth`), `assertMembership(userId, ekskulId)` + `getUserEkskulIds` (`@/lib/ekskul.ts:14-44`), `isAdminRole` (`@/lib/utils`). Never `role === 'ADMIN'`.
- **Resolver + period key:** `resolvePaymentMode`, `toPeriodKey`, `singleOfferedMode` (`src/lib/payment-mode.ts`). Add only `currentPeriod`/`nextPeriod` there.
- **Dict-aware zod pattern:** copy the shape of `buildCreateEkskulSchema` in `src/lib/validations/ekskul.ts:12-82` (dict param, i18n `error`, `z.infer<ReturnType<...>>` export).
- **Route Handler shape:** `src/app/api/users/memberships/route.ts` (auth → scope → write → `NextResponse.json`) and the fuller zod+dict route in the admin ekskul routes. Response error shape is `{ error, details? }`.
- **Client form/fetch pattern:** the existing `toggle()` in `ekskul-memberships.tsx` — `fetch` + `sonner` toast + `pendingId` busy state + local state update. `useLocale()` (`@/components/providers/locale-provider`) + `getDictionary(locale)` for client i18n.
- **Money render:** inline `Rp {n.toLocaleString('id-ID')}` + `tabular-nums` class (see `admin/ekskul/page.tsx:91-92`, `(main)/payments/page.tsx:134`). There is **no** `formatCurrency` util — do not create one for this story.
- **shadcn primitives present** (`src/components/ui/`): `card`, `button` (has `loading` prop), `badge`, `label`, `form`, `dialog`, `tabs`, `sonner`. For the selector, radio-cards can be built with `<input type="radio">` styled with Tailwind (mirrors the admin checkbox-group at `ekskul-actions.tsx:262-314`) or `tabs`/`card` — reuse, don't add a new radio-group dependency unless a `radio-group.tsx` already exists.

### UI (Task 5) shape
For a joined, both-offered Activity, inside the existing per-ekskul row, render two selectable cards:
```
[✓ Monthly]        [  Per-Session]
 Rp 100.000/mo      Rp 25.000/session
```
- Selected card = current `effectiveMode`; selection shown by checkmark/label + border weight (text+icon, not color-only — NFR-4). Fees in `tabular-nums`.
- If `pendingMode` set: a muted line under the cards — `t.paymentMode.effectiveNext` with the human next-period label (derive from `pendingEffectiveFrom`; reuse `t.months[...]` + year).
- Single-offered: no cards — a plain `t.paymentMode.youPay` line stating the auto-applied mode.
- Tap targets ≥44px (NFR-4/NFR-5, member surface).

### Data model — already in place (Story 3.1/3.2), do NOT migrate
`Membership` already carries `paymentMode PaymentMode?` / `effectiveFrom Int @default(0)` / `pendingMode PaymentMode?` / `pendingEffectiveFrom Int?` (`prisma/schema.prisma:142-165`). `Ekskul` already has `monthlyFee`/`sessionFee`/`allowsMonthly`/`allowsPerSession` (`:117-139`). `PaymentMode` enum at `:42-45`. **No schema change, no `prisma db push`, no new enum in this story** — this is UI + one Route Handler + a GET extension + helpers over the existing substrate.

### Scope boundary
- **In scope:** period helpers, the membership zod schema, the `PATCH …/mode` Route Handler, the member GET extension, the profile-card selector UI, admin member-detail read-only display, i18n keys.
- **NOT in scope:** monthly billing/charge creation (Story 3.4), per-session pre-pay-on-register (Story 3.5), any `Payment` write, and any schema change. Selecting a mode here only records intent on `Membership`; it raises no charge.

### Next.js 16 / project specifics
- Route params are async: `{ params }: { params: Promise<{ ekskulId: string }> }` → `await params`. Read `node_modules/next/dist/docs/` if unsure.
- New Route Handler under `src/app/api/**` needs no `proxy.ts`/layout change — it's an API route, already covered by the api matcher; page access is unchanged (no new page added — the selector lives on the existing `/profile`).
- `src/lib` must not import from `src/app` (AR-2); the resolver/helpers stay pure and server-only.

### Lint gate note (carried from Stories 3.1/3.2)
Repo-wide `npm run lint` (bare `eslint`) still fails on untracked `.claude/skills/wds-*` template `.js` files unrelated to this story. Scope `eslint` to the changed files (clean) and rely on `npm run build` green. If the repo-wide gate must pass, add `.claude/` to eslint ignores.

### References
- [Source: epics.md#Story 3.3] (lines 389-411), [epics.md#FR-9/FR-10] (34,37), [epics.md#AR-6/AD-7] (67), [epics.md#UX-DR10] (88), [epics.md#UX-DR3] (79), [epics.md#NFR-1/AD-3] (48), [epics.md#NFR-2/AD-2] (49)
- [Source: prisma/schema.prisma:42-45,117-139,142-165] — `PaymentMode`, `Ekskul` mode/fee fields, `Membership` mode fields (all pre-existing)
- [Source: src/lib/payment-mode.ts:1-85] — `resolvePaymentMode`/`toPeriodKey`/`singleOfferedMode` (add `currentPeriod`/`nextPeriod`)
- [Source: src/lib/ekskul.ts:14-44] — `getUserEkskulIds`, `assertMembership`
- [Source: src/lib/validations/ekskul.ts:12-82] — dict-aware zod builder pattern to mirror in `membership.ts`
- [Source: src/app/api/users/memberships/route.ts:7-69] — GET to extend (Task 4) + POST auth pattern
- [Source: src/app/(main)/profile/ekskul-memberships.tsx:1-98] — the card + `toggle()` fetch/toast pattern (Task 5)
- [Source: src/app/(admin)/admin/ekskul/ekskul-actions.tsx:262-314] — checkbox-group / FormField styling to mirror for radio-cards
- [Source: src/app/(admin)/admin/members/[id]/page.tsx] — admin member-detail (Task 6 display)
- [Source: src/components/providers/locale-provider.tsx] — `useLocale()` for client i18n

### Testing standards
No automated tests in this project. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual reasoning checks:
- **First selection applies now:** member with `paymentMode = null` on a both-offered Activity picks Monthly → `resolvePaymentMode` for the current period returns MONTHLY (not null); no pending set.
- **Change is next-period only:** member on standing MONTHLY (July) switches to Per-Session → July still resolves MONTHLY; August resolves PER_SESSION (`pendingEffectiveFrom = 202608`). Current period never rewritten.
- **Re-pick current mode cancels a queued switch:** after queuing Per-Session, picking Monthly again clears `pendingMode`/`pendingEffectiveFrom`.
- **Unoffered mode rejected server-side:** `PATCH` with `mode = PER_SESSION` on an Activity where `allowsPerSession = false` → 400 (even if a client bypasses the UI).
- **Scoping:** the member GET returns only the caller's memberships; a member cannot read another member's mode; admin member-detail (admin-guarded) shows any member's effective mode.
- **December rollover:** `nextPeriod` on a December date → January of next year (`YYYY+1 01`).

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]

### Debug Log References
- `npx eslint` on all changed files → "No issues found" (exit 0).
- `npm run build` → green (exit 0); route `/api/users/memberships/[ekskulId]/mode` compiled.

### Completion Notes List
- Task 1: `currentPeriod`/`nextPeriod` added to `payment-mode.ts` — pure, `now`-injected; December rolls to January. Kept `toPeriodKey(month, year)` signature; callers pass `.month`/`.year`.
- Task 2: `buildUpdatePaymentModeSchema` mirrors `ekskul.ts` — `z.enum(PaymentMode)` with i18n `error`; body carries only `mode`.
- Task 3: `PATCH …/[ekskulId]/mode` — auth→401, `assertMembership`→403, zod→400, missing ekskul→404, unoffered mode→400. `resolveSwitch` encodes the 3 AD-7 cases (first-select now / re-pick cancels pending / change queued next period). Effective period server-derived; scoped by `userId_ekskulId`.
- Task 4: member GET widened — fees, offered modes, mode fields, server-computed `effectiveMode` via `resolvePaymentMode(currentPeriod(now))`; scoped to `session.user.id`.
- Task 5: `payment-mode-selector.tsx` — both-offered → radio-cards (text+checkmark+border, `tabular-nums` fees); single-offered → read-only "You pay" line; pending → muted "effective {period}" note. Reuses `toggle()` fetch/sonner pattern via `onChanged` re-fetch.
- Task 6: admin member-detail shows current effective mode per membership (read-only, `resolvePaymentMode`).
- Task 7: `paymentMode` group + `validation.paymentModeRequired`/`paymentModeNotOffered` added to en + id (parity).
- Task 8: eslint + build both green.

### File List
- `src/lib/payment-mode.ts` (M) — `currentPeriod`/`nextPeriod`/`BillingPeriod`
- `src/lib/validations/membership.ts` (A) — payment-mode zod schema
- `src/app/api/users/memberships/[ekskulId]/mode/route.ts` (A) — PATCH handler
- `src/app/api/users/memberships/route.ts` (M) — GET extension
- `src/app/(main)/profile/payment-mode-selector.tsx` (A) — selector UI
- `src/app/(main)/profile/ekskul-memberships.tsx` (M) — wires selector into card
- `src/app/(admin)/admin/members/[id]/page.tsx` (M) — admin effective-mode display
- `src/lib/i18n/dictionaries.ts` (M) — `paymentMode` group + validation keys (en/id)

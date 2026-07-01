---
baseline_commit: 37d9e34cee0fff54a8dc237e752ef79421630582
---

# Story 3.5: Per-session-mode billing — pre-pay-on-register (atomic)

Status: done

## Story

As a Member on Per-Session mode,
I want registering for a session to secure my slot only after I upload payment proof,
so that a slot is never held for free and my charge matches that session's fee.

**Epic:** Epic 3 — Member Payment-Mode Selection & Billing
**FRs:** FR-12 (per-session-mode billing = one charge per registered session, amount = that Session's fee), FR-9 (a member can only use a mode the Activity offers).
**Governed by:** AD-6 (pre-pay secures the slot; capacity authority = Attendance count; free attendance route rejects per-session members; reject/cancel releases the seat), AD-14 + NFR-3 (storage upload happens **before** the DB write; the SESSION `Payment` + `REGISTERED` `Attendance` are created in **one** `prisma.$transaction`; an orphaned Supabase object on rollback is accepted, no compensation job in v1), AD-4 (single `Payment` model; SESSION rows carry `sessionId`, derive `month`/`year`/`ekskulId` from the `ActivitySession`, amount server-computed), AD-5 (SESSION uniqueness = native `@@unique([userId, sessionId])`, written via `prisma.payment.upsert`), AD-7 + AD-13 (mode is period-resolved for the **session's** billing period), AD-2 (auth/zod/amount-server-side contract), AD-12 (enums from `@prisma/client`), UX-DR11/DR12/DR15/DR17 (register-&-pay uploader, admin reject-with-note, session CTA + states), NFR-8 (no regression to monthly billing or the free-register path for monthly members).

## Acceptance Criteria

1. **Pre-pay-on-register is atomic — proof upload creates the SESSION Payment + REGISTERED Attendance in one transaction.**
   **Given** a Member whose effective mode for the **session's** billing period is `PER_SESSION` (resolved by `resolvePaymentMode` for the session's `month`/`year`, per Story 3.1),
   **When** they register via the payment-upload route (`POST /api/payments/upload` with a `sessionId`),
   **Then** after a **successful Supabase proof upload**, the route creates the SESSION `Payment` (`type = SESSION`, `status = PENDING`, `sessionId` set, `amount` computed server-side from the **Session's** `fee`, `month`/`year`/`ekskulId` derived from the `ActivitySession`) **and** the `REGISTERED` `Attendance` **together in one `prisma.$transaction`**; the slot is secured at proof upload (`Payment ≥ PENDING` + Attendance), **not** at admin confirmation (FR-12, AD-6, AD-14, AD-4).

2. **The free attendance route rejects per-session members; only Monthly-mode members register free.**
   **Given** the free `POST /api/sessions/[id]/attendance` route,
   **When** a member whose effective mode for the session's period is `PER_SESSION` (or `null` = unselected on a both-offered Activity) calls it,
   **Then** it is rejected with **403** (payment/mode required) and **no** Attendance is written; a member whose effective mode is `MONTHLY` still registers free there exactly as before — capacity is never held without a charge for per-session members (AD-6, NFR-8).

3. **Capacity authority is the Attendance count; a full session disables the register CTA.**
   **Given** session capacity,
   **When** it is evaluated anywhere (register CTA, the atomic register transaction),
   **Then** the single authority is the `Attendance` count (`REGISTERED`/`PRESENT`) against `maxPlayers` — a Payment alone never holds a seat (they are created atomically), the capacity is **re-checked inside the transaction** so a race cannot overbook beyond it, and a full session disables the register CTA with a stated reason (UX-DR15, AD-6).

4. **Admin reject or member cancel releases the seat atomically; reject requires a note.**
   **Given** an admin `PATCH /api/payments/[id]` sets a per-session (`type = SESSION`) payment to `REJECTED`, **or** the member cancels via `DELETE /api/sessions/[id]/attendance`,
   **When** the action commits,
   **Then** the paired `Attendance` is removed and the seat released **in one transaction** with the payment change; admin reject **requires a note** (reason) and both confirm and reject write `confirmedBy` + `confirmedAt` (the acting admin + timestamp); member self-cancel also removes the paired SESSION `Payment` so no orphaned charge remains — **except** when that payment is already `CONFIRMED` (paid + admin-verified): a member may **not** self-cancel a confirmed registration (the DELETE is rejected and they are routed to an admin, whose reject path releases the seat) (UX-DR12, AD-6).

5. **Transaction failure leaves no half-write; the uploaded object may orphan (accepted).**
   **Given** the register transaction fails (e.g. capacity lost to a race, or a DB error),
   **When** it rolls back,
   **Then** **neither** the `Payment` **nor** the `Attendance` persists (no half-write) and the request returns a clear error; the already-uploaded Supabase object is left orphaned and accepted pre-launch — **no compensation job in v1** (AD-14, NFR-3).

6. **The Session surface shows a "Register & pay" CTA + per-session amount/status across all states.**
   **Given** a Member on `PER_SESSION` mode viewing a Session row/card,
   **When** it renders,
   **Then** the CTA reads **"Register & pay"** (routing to the per-session proof uploader, not the free register), the per-Session **owed amount** and **payment status** are shown, and the surface covers the states **register-unpaid** / **registered-pending** / **rejected-reupload** / **session-full** — each conveyed by **text + not color alone** (UX-DR15, UX-DR17, NFR-4).

7. **The per-session uploader: image picker, amount prefilled to the Session's fee (read-only), image-gated submit, optimistic transition.**
   **Given** a Per-Session member opens the register-&-pay proof uploader,
   **When** it renders,
   **Then** it presents an image picker (camera/library on phone), the amount field is **prefilled to that Session's `fee` and not member-editable** (the Session's fee is the source of truth, `tabular-nums`), submit is **disabled until the image is present**, and submitting shows an optimistic "uploading…" → "awaiting confirmation" transition; all copy is money-honest (names the amount, the Activity, and the Session) and bilingual via `i18n/dictionaries.ts` (en/id parity, never hardcoded) (UX-DR11, UX-DR22, NFR-6).

## Tasks / Subtasks

- [x] **Task 1 — Server helpers for the per-session flow in `src/lib/payments.ts` (AC: 1, 3, 4, 5)**
  - [x] Add `resolveSessionCharge({ userId, sessionId })` — the pre-storage gate. One fetch of the `ActivitySession` (`select: id, ekskulId, fee, date, status, maxPlayers`) + the member's `Membership` mode fields + the Activity's `allowsMonthly`/`allowsPerSession` (via `prisma.ekskul.findUnique`). Return a discriminated union: `{ ok: true; amount; ekskulId; month; year }` **only when** the session exists, is `SCHEDULED`/`ONGOING` (not `CANCELLED`/`COMPLETED`), the member is active, the effective mode for the **session's period** is `PER_SESSION`, **and** `fee >= 1`; otherwise `{ ok: false; reason: 'notFound' | 'notRegisterable' | 'notPerSession' | 'noFee' }`. Derive `month`/`year` from `session.date` (reuse `currentPeriod(session.date)` from `@/lib/payment-mode` — it is a pure `Date → {month, year}` extractor, AD-13). Compute `effective = resolvePaymentMode(membershipModeFields, { allowsMonthly, allowsPerSession }, month, year)`; `PaymentMode`/enums from `@prisma/client`. Do **not** check capacity here (it is the transaction's job — AC3/AC5); this gate is fast-fail + orphan-avoidance only.
  - [x] Add `registerAndPaySession({ userId, session, proofUrl, proofPath })` where `session = { id, ekskulId, fee, date, maxPlayers }`. Body is **one** `prisma.$transaction`: (a) count `Attendance` rows for the session with `status in (REGISTERED, PRESENT)` **and** `userId != current` (an already-registered member re-uploading must not be blocked by their own seat); (b) if the member has no existing seat **and** that count `>= maxPlayers` → `throw new SessionFullError()` (rolls back — AC5); (c) `prisma.payment.upsert` on `{ userId_sessionId: { userId, sessionId: session.id } }` → create/update a `type = SESSION`, `PENDING`, `amount = session.fee`, `month`/`year` from `session.date`, `ekskulId = session.ekskulId`, `sessionId`, `proofUrl`, `proofPath`, `confirmedBy: null`, `confirmedAt: null` row (re-upload re-snapshots the fee + resets to PENDING, mirroring `upsertMonthlyPayment`); (d) `prisma.attendance.upsert` on `{ userId_sessionId }` → `status: REGISTERED`. Export a named `SessionFullError` (or a sentinel) the route maps to a 409/400.
  - [x] Add `releaseSessionSeat({ userId, sessionId })` for member self-cancel — first read the paired SESSION `Payment` (`findFirst where { userId, sessionId }`, select `status`); if it exists **and** `status === CONFIRMED` → return a `{ blocked: true }` sentinel (do **not** delete) so the route can 403 (a member may not self-cancel a paid+verified registration — routed to an admin). Otherwise **one** `prisma.$transaction` deletes the `Attendance` (`{ userId_sessionId }`) **and** the SESSION `Payment` (`deleteMany where { userId, sessionId }`) so no orphaned charge remains. Use `deleteMany` (not `delete`) so a monthly-only cancel with no SESSION payment is a no-op, not a throw.
  - [x] Add `rejectSessionPaymentSeat({ payment, adminId, notes })` **or** fold the seat-release into the PATCH route (Task 4). Whichever: on a SESSION-typed payment moving to `REJECTED`, the payment update **and** the paired `Attendance` deletion (`deleteMany where { userId: payment.userId, sessionId: payment.sessionId }`) run in **one** `prisma.$transaction`.
  - [x] `import 'server-only'` already declared. No magic numbers (`ATTENDANCE_HELD_STATUSES`, reuse `MIN_MONTHLY_FEE` pattern → add `MIN_SESSION_FEE = 1`). Keep each function ≤ 40 lines (extract the tx body if needed); the file must stay ≤ 300 lines (it is ~131 now — the additions fit, but split a helper if it would overflow).

- [x] **Task 2 — Extend `POST /api/payments/upload` with a per-session branch (AC: 1, 5)** — `src/app/api/payments/upload/route.ts`
  - [x] Parse an optional `sessionId` from the form data. **Branch on it:** `sessionId` present → per-session flow; absent → the **existing** monthly flow (unchanged, NFR-8). To respect the 40-line function limit, extract two internal handlers (e.g. `handleMonthlyUpload` / `handleSessionUpload`) that each take the parsed request context and return a `NextResponse`; `POST` stays a thin dispatcher (`auth()` → 401 · dict · parse form · dispatch).
  - [x] **Per-session handler order:** `assertMembership(userId, session.ekskulId)` is implied by the gate but keep an explicit membership check via the gate's `notFound`/membership result → 403 `t.ekskul.notMember` when not a member · `resolveSessionCharge({ userId, sessionId })` **before** any storage write → map `notFound` → 404, `notRegisterable` → 400 `t.sessions.notRegisterable`, `notPerSession` → 403 `t.payments.notPerSessionMode`, `noFee` → 400 `t.payments.noSessionFee` · file present/type/size checks (reuse `ALLOWED_TYPES`/`MAX_FILE_SIZE`) → 400 · `uploadPaymentProof(buffer, storagePath, type)` · `registerAndPaySession({ userId, session, proofUrl, proofPath })` inside try/catch → on `SessionFullError` return **409** (or 400) `t.sessions.sessionFull` (the seat was lost to a race, AC5) · `201` with the created payment.
  - [x] The **gate runs before `uploadPaymentProof`** so a rejected request never leaves an orphaned object; the capacity `SessionFullError` is the **only** rejection that can occur *after* upload (a genuine race) — that orphan is accepted (AD-14/NFR-3). The client amount is **never** read for SESSION rows — `amount = session.fee`, server-authoritative (AD-2).
  - [x] Storage path: reuse the `${userId}/${year}-${MM}-${randomUUID()}.${ext}` shape (derive year/month from the session's period, not the client).

- [x] **Task 3 — Gate the free register route + release the seat on cancel (AC: 2, 4)** — `src/app/api/sessions/[id]/attendance/route.ts`
  - [x] `POST` (register free): after `assertMembership` passes and before the existing status/capacity checks, resolve the member's effective mode for the **session's period** (fetch the member's `Membership` mode fields + the Activity's `allowsMonthly`/`allowsPerSession`; the route already loads the `activitySession` — extend its `select`/`include` to carry `ekskulId` + `date`). If `resolvePaymentMode(...) !== PaymentMode.MONTHLY` → **403** `t.sessions.payRequired` (per-session members must register via the paid uploader; `null`/unselected members must choose a mode first — one 403 covers both, message worded to point at register-&-pay). Only `MONTHLY`-effective members reach the existing free `attendance.upsert` (NFR-8: monthly members' free register is unchanged).
  - [x] `DELETE` (cancel): replace the bare `attendance.delete` with `releaseSessionSeat({ userId, sessionId })` (Task 1) so the paired SESSION `Payment` is removed atomically with the `Attendance`. If the helper returns `{ blocked: true }` (paired payment is `CONFIRMED`) → **403** `t.sessions.cancelBlockedConfirmed` (route the member to an admin). Keep the existing 404 when there is no attendance. A monthly member's cancel still works (the `deleteMany` on SESSION payment is a no-op for them).
  - [x] Keep functions ≤ 40 lines — extract the mode-resolution into a tiny local helper or reuse a `src/lib` helper (e.g. add `resolveSessionMode({ userId, sessionId })` to `payments.ts` if it reduces duplication with `resolveSessionCharge`).

- [x] **Task 4 — Admin reject releases the seat + requires a note (AC: 4)** — `src/app/api/payments/[id]/route.ts`, `src/lib/validations/payment.ts`, `src/app/(admin)/admin/payments/payment-actions.tsx`
  - [x] `confirmPaymentSchema` (`validations/payment.ts`): make `notes` **required and non-empty when `status === 'REJECTED'`** via a `.refine`/`superRefine` (dict-aware message `t.validation.rejectReasonRequired`; the schema build must accept `t` like the other `buildXSchema(t)` helpers — convert `confirmPaymentSchema` to `buildConfirmPaymentSchema(t)` and update its single caller in the PATCH route). Confirm (`CONFIRMED`) keeps `notes` optional.
  - [x] `PATCH /api/payments/[id]`: fetch the payment first (`select: id, type, sessionId, userId, status`). Set `confirmedBy = session.user.id` and `confirmedAt = new Date()` on **both** `CONFIRMED` and `REJECTED` (record who acted — AC4). When `status === 'REJECTED'` **and** `type === SESSION` **and** `sessionId` → run the payment update **and** `attendance.deleteMany({ where: { userId: payment.userId, sessionId } })` in **one** `prisma.$transaction` (seat release). A monthly reject stays a plain update (no attendance touched, NFR-8). Keep the auth/zod contract (`await auth()` → 401 · `isAdminRole` → 403 · `safeParse` → 400 `{ error, details }`).
  - [x] `payment-actions.tsx`: the reject button currently sends only `{ status }` — it must now send a **reason**. On reject, collect a note (a `window.prompt(t.payments.rejectReasonPrompt)` is acceptable pre-launch, matching the existing `confirm()` pattern; abort if empty) and include it as `notes` in the PATCH body. Confirm is unchanged. This prevents the new note-required schema from 400-ing the admin flow (NFR-8).

- [x] **Task 5 — Member register-&-pay UI: mode-aware CTA, per-session uploader, session states (AC: 3, 6, 7)**
  - [x] **Session detail (`src/app/(main)/sessions/[id]/page.tsx`, server component):** extend the `activitySession` query to select `ekskul.allowsMonthly`/`allowsPerSession`/`fee` and load the caller's `Membership` mode fields for `ekskul.id` + the caller's SESSION `Payment` for this session (`findUnique where userId_sessionId`, select `status`). Compute `effectiveMode = resolvePaymentMode(membership, offered, sessionMonth, sessionYear)` for the **session's** period (server-only; never on the client). Pass `paymentMode` (effective), `sessionFee`, and `sessionPaymentStatus` into `RSVPButton`.
  - [x] **`RSVPButton` (`src/components/sessions/rsvp-button.tsx`):** add `paymentMode: 'MONTHLY' | 'PER_SESSION' | null`, `sessionFee: number`, `sessionPaymentStatus?: 'PENDING' | 'CONFIRMED' | 'REJECTED'`. Branch: `MONTHLY` → existing free RSVP behavior (unchanged). `PER_SESSION` (or `null`) → the CTA becomes a **link** to the per-session pay page (`/sessions/{id}/pay`) reading **"Register & pay"** (UX-DR15). Render states by `sessionPaymentStatus`: none → "Register & pay"; `PENDING` → `registeredPending` label + a cancel action (calls the DELETE route); `CONFIRMED` → `registeredPaid` label; `REJECTED` → `paymentRejected` label + "upload again" link. Full + not registered → the existing disabled "Session Full" (AC3). Every state is text + not color-only (NFR-4).
  - [x] **Per-session pay page (NEW: `src/app/(main)/sessions/[id]/pay/page.tsx`, client):** a focused uploader (keep it under the 300-line file limit — do **not** bloat the monthly `payments/upload/page.tsx`; a small dedicated page/component is cleaner). On mount, `GET /api/sessions/[id]` for the prefill data (title, `fee`, date). Render: an image picker (`accept='image/…'`, camera/library on phone) reusing the monthly uploader's dashed-drop pattern; a **read-only** amount field prefilled to `Rp {session.fee}` (`tabular-nums`) with an `amountLocked`-style helper; a money-honest header (`t.payments.sessionOwedFor` naming Activity + session). Submit **disabled until a file is selected**; on submit POST `FormData { file, sessionId }` to `/api/payments/upload`; on success `toast.success(t.payments.toastSuccess)` → `router.push('/sessions/{id}')` + `router.refresh()` (optimistic "uploading…"→"awaiting confirmation"); on failure `toast.error(err.error ?? t.common.error)`. Reuse `useLocale()` + `getDictionary(locale)`, shadcn `Button`(has `loading`)/`Input`/`Label`, inline `Rp {n.toLocaleString('id-ID')}` — **no** new dependency, no `formatCurrency` util, no react-query.
  - [x] **Sessions list (`src/app/(main)/sessions/page.tsx`):** optional — surface a per-session paid/pending hint on the row for per-session members. Keep minimal; the authoritative states live on the detail page. Do not regress the monthly/registered badges.

- [x] **Task 6 — i18n keys, en/id parity (AC: 4, 6, 7)** — `src/lib/i18n/dictionaries.ts`
  - [x] Add to **`payments`** (both `en` + `id`): `notPerSessionMode`, `noSessionFee`, `sessionOwedFor` (e.g. `'Session fee for {activity} · {session}'`), `rejectReasonPrompt`, and reuse existing `amountLocked`/`toastSuccess`/`toastError`/`selectImage`/`fileLabel`/`fileDesc`/`amountLabel`.
  - [x] Add to **`sessions`**: `registerAndPay` (`'Register & pay'`), `payRequired` (points per-session/unselected members at register-&-pay), `notRegisterable` (session not open), `registeredPending` (`'Registered · awaiting confirmation'`), `registeredPaid` (`'Registered · paid'`), `paymentRejected` (`'Payment rejected · upload again'`), `cancelBlockedConfirmed` (`'A confirmed payment can't be self-cancelled — contact an admin.'`). Reuse existing `sessionFull`/`full`/`register`/`cancelRegistration`.
  - [x] Add to **`validation`**: `rejectReasonRequired` (`'A rejection reason is required.'`), `sessionRequired` if a form-level message is needed.
  - [x] Copy is calm + money-honest (names amount, Activity, Session/period — UX-DR22); mirror faithfully in `id`; route **every** new user-facing string (UI **and** route error messages) through the dictionary — no inline literals.

- [x] **Task 7 — Verify (NFR-7, NFR-8)**
  - [x] `npx eslint` on every changed file → exit 0. `npm run build` → green (types check against generated `PaymentType`/`PaymentMode`; the `@@unique([userId, sessionId])` upsert compiles).
  - [x] Reasoning/manual checks per "Testing standards" below (atomic register, per-session gate on free route, capacity race → no overbook + no half-write, reject/cancel release seat, admin reject note-required, monthly paths unchanged).

### Review Findings

- [x] [Review][Patch] CRITICAL — `registerAndPaySession`'s capacity check is not race-safe under Postgres's default READ COMMITTED isolation [src/lib/payments.ts: `registerAndPaySession`] — no isolation level and no row lock, so two concurrent requests for the last seat can both read `others < maxPlayers` before either commits, overbooking past `maxPlayers`. This directly contradicts AC3's explicit claim that capacity is "re-checked inside the transaction so a race cannot overbook beyond it." Compounds with two related gaps: the `maxPlayers` value compared against was read in `resolveSessionCharge` *before* the transaction (an admin lowering it mid-request uses the stale threshold), and the transaction never re-checks `session.status` (a session cancelled/completed mid-request can still be registered into). Fix: acquire a `SELECT ... FOR UPDATE` lock on the `ActivitySession` row as the first statement inside the transaction (via `tx.$queryRaw`), re-fetch `maxPlayers`/`status` from that locked read, and gate on the fresh values — this serializes concurrent registrations and closes all three gaps at once.
- [x] [Review][Patch] `mine` (the caller's own existing attendance) is matched regardless of status [src/lib/payments.ts: `registerAndPaySession`, the `mine`/`others` capacity check] — `others` is scoped to `SEAT_HELD_STATUSES` (`REGISTERED`/`PRESENT`) but `mine` isn't, so a stale non-seat-holding row (e.g. `ABSENT`) makes `!mine` false and skips the capacity check entirely even when the session is already full.
- [x] [Review][Patch] CRITICAL — `releaseSessionSeat` has a read-then-decide-then-transact TOCTOU gap [src/lib/payments.ts: `releaseSessionSeat`] — it reads `payment.status` via the plain `prisma` client outside any transaction, then only wraps the deletes in a separate `$transaction`. If an admin's `CONFIRMED` update commits between the read and the delete, the just-confirmed, paid registration is silently deleted — exactly what AC4 says must be blocked. Fix: move the status read (via `SELECT ... FOR UPDATE` inside the same transaction as the deletes) so the whole read-decide-delete sequence is atomic; also scope the payment lookups to `type: 'SESSION'` (currently missing, unlike every other payment lookup in this diff).
- [x] [Review][Patch] Re-uploading proof silently downgrades an already-CONFIRMED payment back to PENDING [src/lib/payments.ts: `registerAndPaySession`'s `payment.upsert`] — the `update` branch unconditionally resets `status`/`confirmedBy`/`confirmedAt`, so a member who hits `/sessions/[id]/pay` directly (bypassing the UI, which hides the CTA once confirmed) can silently un-confirm a paid, admin-verified registration.
- [x] [Review][Patch] Admin `PATCH /api/payments/[id]` never checks the payment's current status before transitioning it [src/app/api/payments/[id]/route.ts] — the fetch only selects `{ id, type, sessionId, userId }`, not `status`, so an already-CONFIRMED (or already-REJECTED) payment can be re-reviewed; rejecting an already-confirmed payment silently deletes the member's seat. Fix: select `status` too and return 409 if it's not `PENDING`.
- [x] [Review][Patch] Reject branch's `attendance.deleteMany` has no status filter [src/app/api/payments/[id]/route.ts: REJECTED branch] — would also delete a `PRESENT` attendance (a session that already happened) if a stale payment for a completed session were ever rejected. Fix: scope the delete to `status: 'REGISTERED'`.
- [x] [Review][Patch] `PerSessionCta`'s "Payment rejected · upload again" branch can never actually render [src/components/sessions/rsvp-button.tsx: `PerSessionCta`] — it requires `isRegistered && status === 'REJECTED'`, but rejecting a SESSION payment deletes the Attendance row (so `isRegistered` is false by the time `status` is REJECTED). A rejected member just sees a bare "Register & Pay" CTA with no explanation. Fix: check `status === 'REJECTED'` independent of `isRegistered`.
- [x] [Review][Patch] A session with `fee = 0` is unregisterable for a PER_SESSION-mode member [src/lib/payments.ts: `isFreeRegisterAllowed`, `resolveSessionCharge`] — `isFreeRegisterAllowed` only permits MONTHLY, and the pay flow rejects `fee < 1` with `noFee`: a genuine dead end with no registration path. Fix: allow free registration when the session's fee is 0, regardless of mode (and update `RSVPButton`'s branching to match, so a fee-0 session doesn't show a broken "Register & Pay · Rp 0" CTA).
- [x] [Review][Patch] Non-members / no-mode-selected members are shown the same "Register & Pay" CTA as a legitimate PER_SESSION member [src/components/sessions/rsvp-button.tsx: `RSVPButton`'s `paymentMode !== 'MONTHLY'` branch] — `paymentMode === null` (not a member, or mode not yet selected on a both-offered Activity) is folded into the same pay-required branch; they'll upload a proof image before getting a 403.
- [x] [Review][Patch] `isFreeRegisterAllowed`/`resolveSessionCharge`'s `ekskul.findUnique` calls have no `isActive` check [src/lib/payments.ts] — a member can still register/pay into a session belonging to a deactivated Activity. Mirrors the same gap already fixed in Stories 3.3/3.4.
- [x] [Review][Patch] `owedLabel`'s chained `.replace('{token}', value)` calls in the new per-session pay page are vulnerable to `$`-pattern corruption [src/app/(main)/sessions/[id]/pay/page.tsx: `owedLabel` derivation] — same class of bug already fixed in Story 3.4's monthly uploader.
- [x] [Review][Patch] Check ordering in `POST /api/sessions/[id]/attendance` [src/app/api/sessions/[id]/attendance/route.ts] — the new payment-mode gate (`isFreeRegisterAllowed`) runs before the pre-existing `CANCELLED` status check, so a PER_SESSION member hitting a cancelled session gets a misleading "payment required" (403) instead of "session is cancelled."
- [x] [Review][Patch] Hand-rolled `PaymentMode`/`PaymentStatus` string-literal unions instead of the actual Prisma types [src/components/sessions/rsvp-button.tsx] — no compile-time safety tying these to the real enums.
- [x] [Review][Patch] Dead i18n key `validation.sessionRequired` (en+id) [src/lib/i18n/dictionaries.ts:450,900] — never referenced anywhere in the diff or the wider codebase.
- [x] [Review][Patch] `payment.upsert`'s `update` branch doesn't refresh `month`/`year` on re-upload, unlike `create` [src/lib/payments.ts: `registerAndPaySession`] — low-impact (session dates rarely change) but a literal Task 1 deviation; trivial to align.
- [x] [Review][Defer] Both `releaseSessionSeat` (member self-cancel) and the admin-reject path hard-delete the `Payment` row with no cleanup of the associated Supabase Storage proof object [src/lib/payments.ts] — deferred, same root gap already deferred from Story 3.4's review (`upsertMonthlyPayment`'s resubmit-overwrite case); this is the same gap surfacing via a second code path. Folded into that existing deferred-work.md entry.
- [x] [Review][Defer] Rejecting a payment has no guard against the session already being `status: COMPLETED` [src/app/api/payments/[id]/route.ts] — deferred. Whether a late rejection should ever retroactively erase historical attendance is a business-rule question, not a mechanical fix; pick up alongside the storage-cleanup item in a future payment-lifecycle hardening pass.

## Dev Notes

### What this story adds (READ FIRST)
Story 3.2 already extended `Payment` with `type = SESSION` + nullable `sessionId` + the `@@unique([userId, sessionId])` index, and Story 3.1 built `resolvePaymentMode`. **The schema substrate is complete — this story writes no migration and changes no schema.** It wires the **per-session runtime flow** on top of that substrate:
1. **A per-session branch on `POST /api/payments/upload`** — proof upload → **atomic** SESSION `Payment` (PENDING) + `REGISTERED` `Attendance` in one `$transaction` (AC1, AD-14).
2. **A gate on the free `POST /api/sessions/[id]/attendance`** — per-session (and unselected) members are rejected; only monthly members register free (AC2, AD-6).
3. **Seat release on reject/cancel** — admin `PATCH → REJECTED` (SESSION) and member `DELETE` both remove the paired `Attendance` atomically (AC4).
4. **The register-&-pay UI** — a "Register & pay" CTA + a per-session proof uploader + session states (AC6, AC7).

The **monthly** billing path (Story 3.4) is untouched: `resolveMonthlyOwed`, `upsertMonthlyPayment`, the monthly branch of the upload route, and the monthly uploader page all stay exactly as-is (NFR-8).

### The security boundary is the server, always (AD-2, AD-6)
- **Amount authority is server-side.** For SESSION rows, `amount = ActivitySession.fee`, read on the server. Never trust a client-sent amount (there is no amount field on the per-session uploader — it is display-only).
- **The mode gate is the route, not the UI.** The uploader's "Register & pay" CTA is convenience; the `POST /api/payments/upload` per-session gate (`resolveSessionCharge`) and the free-route gate are what actually enforce mode. Resolve the mode for the **session's** billing period (`month`/`year` from `session.date`), **not** the current period — a session in a future/past month must resolve mode for *that* month (AD-7/AD-13).
- **Capacity authority is the `Attendance` count** (`REGISTERED`/`PRESENT`), re-checked **inside** the transaction. A `Payment` never holds a seat on its own — they are created atomically, so "paid but no seat" and "seat but no charge" are both impossible for the per-session path (AD-6).

### Atomicity + orphan-avoidance ordering (AD-14, NFR-3) — critical
The order is non-negotiable:
```
1. gate (resolveSessionCharge)          → reject BEFORE any storage write (no orphan on a rejected request)
2. file checks                          → 400 before storage
3. uploadPaymentProof(...)              → storage write (Supabase)
4. prisma.$transaction([ payment.upsert, attendance.upsert ]) with in-tx capacity check
      └─ on SessionFullError / any error → rollback: NO Payment, NO Attendance persists (AC5)
```
The **only** rejection that can happen *after* the storage upload is the in-transaction capacity race (`SessionFullError`). That leaves an orphaned Supabase object — **accepted pre-launch, no compensation job** (AD-14). Every *predictable* rejection (wrong mode, no fee, bad file, not registerable) happens **before** the upload, so the common case never orphans.

### Files to REUSE — do not reinvent
- **Mode resolver + period:** `resolvePaymentMode`, `currentPeriod` (pure `Date → {month,year}`), `PaymentMode` re-export — `src/lib/payment-mode.ts` (server-only). Feed the resolver the membership mode fields + the Activity's `allowsMonthly`/`allowsPerSession`, and the **session's** month/year.
- **Monthly write as the pattern to mirror (not to call):** `upsertMonthlyPayment` (`src/lib/payments.ts`) shows the re-upload/reset-to-PENDING/re-snapshot semantics. SESSION rows use `prisma.payment.upsert` on `(userId, sessionId)` (AR-4/AD-5) — the native unique lets you use `upsert` directly (unlike the monthly partial index). Follow the same "reset to PENDING, clear confirmedBy/At on re-upload" shape.
- **Auth/scope:** `await auth()` (`@/lib/auth`), `assertMembership(userId, ekskulId)` (`@/lib/ekskul.ts:35`), `isAdminRole` (`@/lib/utils`) — never `role === 'ADMIN'`.
- **Storage:** `uploadPaymentProof(buffer, path, type)` (`@/lib/supabase`) — service-role, server-only. Same helper the monthly upload uses.
- **Session read for prefill:** `GET /api/sessions/[id]` (`src/app/api/sessions/[id]/route.ts:10`) already returns the session (incl. `fee`) — use it for the uploader's display-only prefill; the server still recomputes the amount on write.
- **Money render:** inline `Rp {n.toLocaleString('id-ID')}` + `tabular-nums` (see `(main)/payments/page.tsx:134`, `payments/upload/page.tsx:222`). There is **no** `formatCurrency` util — do not create one.
- **Client i18n + form/fetch pattern:** `useLocale()` + `getDictionary(locale)`; `fetch` + `sonner` toast + `loading` busy state (see `payments/upload/page.tsx`, `rsvp-button.tsx`). Mirror it — no new fetch abstraction.
- **shadcn primitives present** (`src/components/ui/`): `button` (has `loading`), `input`, `label`, `select`, `badge`, `card`, `separator`, `avatar`. Reuse; add no new dependency.

### Route dispatcher shape after Task 2 (sketch)
```ts
// POST /api/payments/upload — thin dispatcher (≤ 40 lines)
const session = await auth(); if (!session?.user?.id) return 401;
const t = getDictionary(await getLocale());
const form = await req.formData();
const sessionId = form.get('sessionId') as string | null;
return sessionId
  ? handleSessionUpload({ userId: session.user.id, sessionId, form, t })
  : handleMonthlyUpload({ userId: session.user.id, form, t }); // existing flow, unchanged
```

### Member self-cancel policy (DECIDED)
`DELETE /api/sessions/[id]/attendance` for a per-session member removes **both** the `Attendance` **and** the paired SESSION `Payment` in one transaction — a self-cancel that frees the seat and leaves no orphaned charge (AC4). The uploaded proof object orphans (accepted, NFR-3). **Exception:** if the paired SESSION `Payment` is `CONFIRMED` (paid + admin-verified), the member may **not** self-cancel — the DELETE returns 403 and the member is routed to an admin, whose reject path releases the seat. This protects the money-verified record from silent loss. So: PENDING/REJECTED → member self-cancel deletes both; CONFIRMED → blocked (admin-only via reject).

### Scope boundary
- **In scope:** the `src/lib/payments.ts` helpers (`resolveSessionCharge`, `registerAndPaySession`, `releaseSessionSeat`, session-reject seat release, `SessionFullError`); the per-session branch of `POST /api/payments/upload`; the free-route gate + cancel seat-release on `POST`/`DELETE /api/sessions/[id]/attendance`; the admin `PATCH /api/payments/[id]` seat-release + note-required + `confirmedBy/At`-on-both; the reject-note prompt in `payment-actions.tsx`; the `RSVPButton` mode branch + session-detail resolution; the NEW per-session pay page; i18n keys.
- **NOT in scope:** any schema / `prisma db push` / enum / partial-index change (complete from 3.1/3.2); the **monthly** billing flow (`resolveMonthlyOwed`, `upsertMonthlyPayment`, the monthly upload branch + `payments/upload/page.tsx`) — untouched (NFR-8); the admin manual-create route `POST /api/payments` (admin may still set an amount there); the admin session attendance management (`attendance/manual`) — unchanged; the Epic-4 UI refresh (responsive shells, dark-mode audit, shared-component extraction) — this story ships functional, i18n'd UI on the existing shadcn primitives, polish lands in Epic 4.

### Next.js 16 / project specifics
- The NEW page lives at `src/app/(main)/sessions/[id]/pay/page.tsx` — already covered by the `proxy.ts` matcher (`/sessions` prefix) and the `(main)/layout.tsx` `auth()` guard; **no** proxy/layout change needed.
- No new API route is added — `POST /api/payments/upload` is extended, already under the api matcher.
- `src/lib` must not import from `src/app` (AR-2). Route Handlers, `resolvePaymentMode`, `getDictionary`, `@/lib/supabase` are server-only — never import them into the client uploader; the client uses the effective mode/status passed from the server component + `GET /api/sessions/[id]` for prefill.
- Every `prisma.$transaction` uses the single `prisma` singleton (`@/lib/prisma`); the prod pool is capped at 1 — keep transactions short (two upserts + one count), no external calls inside a transaction (the Supabase upload is deliberately *before* the tx).

### Lint gate note (carried from Stories 3.1–3.4)
Repo-wide `npm run lint` (bare `eslint`) still fails on untracked `.claude/skills/wds-*` template `.js` files unrelated to this story. Scope `eslint` to the changed files (clean) and rely on `npm run build` green. If the repo-wide gate must pass, add `.claude/` to eslint ignores.

### References
- [Source: epics.md#Story 3.5] (lines 445-479) — ACs + FR-12/FR-9 mapping
- [Source: epics.md#AR-5] (line 66) — pre-pay-on-register atomic contract (the spine of this story)
- [Source: prisma/schema.prisma:169-242] — `ActivitySession`, `Attendance` (`@@unique([userId, sessionId])`), `Payment` (`type`/`sessionId`/`@@unique([userId, sessionId])`, `session onDelete: Restrict`)
- [Source: src/lib/payments.ts:47-130] — `resolveMonthlyOwed` + `upsertMonthlyPayment` (patterns to mirror; do not call for SESSION)
- [Source: src/lib/payment-mode.ts:39-115] — `currentPeriod` (Date→period), `resolvePaymentMode`, `PaymentMode`
- [Source: src/app/api/payments/upload/route.ts:25-116] — the route to extend (add the `sessionId` branch; keep the monthly branch intact)
- [Source: src/app/api/sessions/[id]/attendance/route.ts:9-107] — the free register `POST` (gate) + `DELETE` (seat release)
- [Source: src/app/api/payments/[id]/route.ts:41-75] — the admin `PATCH` (seat release on SESSION reject + note-required + confirmedBy/At)
- [Source: src/lib/validations/payment.ts:23-28] — `confirmPaymentSchema` → `buildConfirmPaymentSchema(t)` with note-required-on-reject
- [Source: src/app/(admin)/admin/payments/payment-actions.tsx:24-42] — admin reject must now send a `notes` reason
- [Source: src/app/(main)/sessions/[id]/page.tsx:37-151] — session detail: resolve effective mode + payment status, feed `RSVPButton`
- [Source: src/components/sessions/rsvp-button.tsx:18-103] — mode-branch the CTA (`PER_SESSION` → register-&-pay link)
- [Source: src/app/(main)/payments/upload/page.tsx:1-288] — the monthly uploader: the pattern for the NEW per-session pay page (read-only amount, image-gated submit, optimistic transition) — do not modify it
- [Source: src/app/api/sessions/[id]/route.ts:10-48] — `GET /api/sessions/[id]` for the uploader prefill
- [Source: src/lib/i18n/dictionaries.ts:99-157,326-356,400+] — `sessions`/`payments`/`validation` groups to extend (en/id parity)
- [Source: project-context.md] — auth/zod contract, server-only rules, enum-from-`@prisma/client`, code-quality caps

### Testing standards
No automated tests in this project. Verify by construction + `npx eslint <changed files>` + `npm run build`. Manual reasoning checks:
- **Atomic register:** a per-session member uploads valid proof for an open session → **one** SESSION `Payment` (PENDING, `amount = session.fee`, `type = SESSION`, `sessionId` set, `month`/`year` from `session.date`) **and** **one** REGISTERED `Attendance` exist; both created in the same transaction.
- **Amount server-authoritative:** any client-supplied amount is ignored; the persisted `amount` equals `ActivitySession.fee` at write time (snapshot).
- **Free route gated:** a per-session (or unselected) member calling `POST /api/sessions/[id]/attendance` → 403, no Attendance; a monthly member → still registers free (unchanged).
- **Wrong-period mode:** the gate resolves mode for the **session's** month/year, not "now" — a member who is per-session this month but monthly next month is gated per the session's actual period.
- **Capacity race → no overbook, no half-write:** two concurrent registers on the last seat → at most `maxPlayers` REGISTERED attendances; the loser's transaction rolls back leaving **no** Payment and **no** Attendance (its Supabase object orphans, accepted).
- **No-fee / not-registerable gated:** session `fee = 0` → 400 `noSessionFee`; a `CANCELLED`/`COMPLETED` session → 400/404, **before** any storage write (no orphan).
- **Admin reject releases seat + note-required:** rejecting a SESSION payment removes the paired Attendance atomically, writes `confirmedBy`/`confirmedAt`, and **requires** a note (empty note → 400); a **monthly** reject still updates the row with no attendance touched.
- **Member cancel releases seat:** `DELETE` removes the Attendance **and** the paired SESSION Payment atomically when it is PENDING/REJECTED; when the paired payment is **CONFIRMED** the DELETE is rejected with 403 (blocked — admin-only), the seat and record stay intact; a monthly member's cancel is unaffected.
- **UI states:** per-session CTA reads "Register & pay" and routes to the uploader; registered-pending / rejected-reupload / session-full states render as text (not color-only); the uploader's amount is read-only and prefilled to the session fee; submit disabled with no image.
- **No monthly regression:** monthly upload → PENDING → confirm → CONFIRMED, re-upload resets, history shows the row — all unchanged.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- First `npm run build` failed type check: `payment.sessionId` (`string | null`) not narrowed inside the reject-seat-release block because the guard was a separate `const`. Fixed by inlining the `sessionId !== null` guard into the `if` so TS narrows `payment.sessionId` to `string`, then destructuring `{ userId, sessionId }`.
- Second `npm run build` → green (Compiled ✓, TypeScript ✓, 34/34 static pages; `/sessions/[id]/pay` present in the route table).
- `npx eslint` on all 11 changed files → "No issues found" (exit 0).

### Completion Notes List

- **Task 1 — `src/lib/payments.ts` helpers:** added `resolveSessionCharge` (pre-storage gate: session open + active member + effective mode `PER_SESSION` for the session's period + `fee >= MIN_SESSION_FEE`, else a typed `notFound|notMember|notRegisterable|notPerSession|noFee` reason), `registerAndPaySession` (one `$transaction`: in-tx capacity re-check on `REGISTERED`/`PRESENT` count excluding self → `SessionFullError`, then `payment.upsert` SESSION/PENDING/amount-snapshot + `attendance.upsert` REGISTERED), `releaseSessionSeat` (member cancel: `CONFIRMED` paired payment → `confirmedLocked`, else delete attendance + SESSION payment atomically), `isFreeRegisterAllowed` (true only when effective mode is `MONTHLY`). `SessionFullError` exported; enums (`PaymentType`/`PaymentStatus`/`PaymentMode`/`SessionStatus`/`AttendanceStatus`) from `@prisma/client`; `MIN_SESSION_FEE`/`SEAT_HELD_STATUSES` named consts; month/year via `currentPeriod(session.date)`.
- **Task 2 — `POST /api/payments/upload`:** refactored into a thin dispatcher (`auth` → dict → parse form → branch on `sessionId`) + `handleMonthlyUpload` (existing flow, unchanged) + `handleSessionUpload` (gate before storage → shared `validateProofFile` → `storeProof` → `registerAndPaySession`, `SessionFullError` → 409). Shared `validateProofFile`/`storeProof` helpers. Per-session amount is server-sourced (`session.fee`); client amount never read. `sessionChargeError` maps each gate reason to status+dict message.
- **Task 3 — `POST/DELETE /api/sessions/[id]/attendance`:** POST now calls `isFreeRegisterAllowed` after membership — non-`MONTHLY` (per-session/unselected) → 403 `payRequired`, monthly free-register otherwise unchanged. DELETE now calls `releaseSessionSeat` → `confirmedLocked` → 403 `cancelBlockedConfirmed`, `notRegistered` → 404, else success (also removes the paired SESSION payment).
- **Task 4 — admin reject:** `confirmPaymentSchema` → `buildConfirmPaymentSchema(t)` with a `.refine` requiring a non-empty `notes` when `status === REJECTED`. `PATCH /api/payments/[id]` fetches the payment, sets `confirmedBy`/`confirmedAt` on **both** confirm and reject, and on `REJECTED` + `type === SESSION` runs `payment.update` + `attendance.deleteMany` in one `$transaction` (seat release). `payment-actions.tsx` now prompts for a rejection reason (`window.prompt`) and sends it as `notes`; empty → toast + abort.
- **Task 5 — UI:** `GET /api/sessions/[id]` now includes `ekskul { id, name, color }` for the uploader prefill. Session detail resolves the caller's effective mode for the session's period + their SESSION payment status (server-only) and passes `paymentMode`/`sessionFee`/`sessionPaymentStatus` to `RSVPButton`. `RSVPButton` branches: non-`MONTHLY` → `PerSessionCta` (register-unpaid "Register & pay"+fee, registered-pending + cancel, rejected + re-upload, confirmed "Registered · paid", full disabled — all text, not color-only); `MONTHLY` keeps the free RSVP path. New client page `src/app/(main)/sessions/[id]/pay/page.tsx`: fetches session prefill, read-only amount = `session.fee` (`tabular-nums`) + `amountLocked` + money-honest `sessionOwedFor`, image-gated submit, optimistic toast → `/sessions/[id]`.
- **Task 6 — i18n:** added `sessions` (`registerAndPay`, `payRequired`, `notFound`, `notRegisterable`, `registeredPending`, `registeredPaid`, `paymentRejected`, `cancelBlockedConfirmed`), `payments` (`notPerSessionMode`, `noSessionFee`, `sessionOwedFor`, `paySessionTitle`, `rejectReasonPrompt`), `validation` (`rejectReasonRequired`, `sessionRequired`) — en/id parity.
- **Task 7 — verify:** `npx eslint` (11 files) exit 0; `npm run build` green. Monthly billing path (route monthly branch, `upsertMonthlyPayment`, `resolveMonthlyOwed`, monthly uploader) untouched — no regression. No schema/`db push` change (substrate complete from 3.1/3.2).

### File List

- `src/lib/payments.ts` (M) — `resolveSessionCharge`, `registerAndPaySession`, `releaseSessionSeat`, `isFreeRegisterAllowed`, `SessionFullError`, `SessionForCharge`/`SessionCharge`/`SessionRegistrationInput`/`SeatReleaseResult` types, `MIN_SESSION_FEE`/`SEAT_HELD_STATUSES`; imports `SessionStatus`/`AttendanceStatus`/`currentPeriod`
- `src/app/api/payments/upload/route.ts` (M) — dispatcher + `handleMonthlyUpload`/`handleSessionUpload` + `validateProofFile`/`storeProof`/`sessionChargeError`
- `src/app/api/sessions/[id]/attendance/route.ts` (M) — free-register mode gate (POST) + seat-release cancel (DELETE)
- `src/app/api/payments/[id]/route.ts` (M) — SESSION-reject seat release in a `$transaction`, `confirmedBy`/`confirmedAt` on both, `buildConfirmPaymentSchema(t)`
- `src/lib/validations/payment.ts` (M) — `confirmPaymentSchema` → `buildConfirmPaymentSchema(t)` with note-required-on-reject
- `src/app/(admin)/admin/payments/payment-actions.tsx` (M) — reject prompts for + sends a reason
- `src/app/api/sessions/[id]/route.ts` (M) — GET includes `ekskul { id, name, color }` for prefill
- `src/app/(main)/sessions/[id]/page.tsx` (M) — resolve effective mode + SESSION payment status, feed `RSVPButton`
- `src/components/sessions/rsvp-button.tsx` (M) — mode-branch CTA + `PerSessionCta` states
- `src/app/(main)/sessions/[id]/pay/page.tsx` (A) — per-session register-&-pay proof uploader
- `src/lib/i18n/dictionaries.ts` (M) — new `sessions`/`payments`/`validation` keys (en/id parity)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 3.5 drafted (ready-for-dev). Per-session pre-pay-on-register: atomic SESSION Payment + REGISTERED Attendance on proof upload; free-attendance route gated to monthly-only; capacity authority = Attendance count re-checked in-transaction; admin reject / member cancel release the seat atomically; admin reject now note-required + records confirmedBy/At; register-&-pay CTA + dedicated per-session proof uploader + session states; i18n keys (en/id). No schema change (substrate complete from 3.1/3.2). |
| 2026-07-01 | Story 3.5 implemented → review. Added the per-session server helpers (`resolveSessionCharge`/`registerAndPaySession`/`releaseSessionSeat`/`isFreeRegisterAllowed`); extended `POST /api/payments/upload` with an atomic per-session branch; gated the free attendance route to monthly-only + seat-release on cancel; admin SESSION-reject releases the seat atomically + note-required + `confirmedBy`/`confirmedAt` on both; register-&-pay CTA + new per-session uploader page + session states; i18n en/id. `npx eslint` (11 files) + `npm run build` green; monthly path unchanged (NFR-8). |

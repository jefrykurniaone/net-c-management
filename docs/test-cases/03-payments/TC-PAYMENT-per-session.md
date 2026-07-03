# Test Cases — Per-Session Payment (Pre-Pay-on-Register)

Scope: the per-session flow via `/sessions/[id]/pay` and `POST /api/payments/upload` **with** `sessionId` — an atomic SESSION Payment + REGISTERED Attendance.

Code references: `src/app/(main)/sessions/[id]/pay/page.tsx`, `src/app/api/payments/upload/route.ts` (`handleSessionUpload`), `src/lib/payments.ts` (`resolveSessionCharge`, `registerAndPaySession`, error classes).

Key business rules:
- Registering a paid session as a PER_SESSION member happens **only** through this flow — payment and seat are created atomically; a seat is never held without a charge (AD-6).
- Amount = the session's `fee`, server-sourced; month/year derived from the session date (AD-4).
- Gates (mode, fee, session state, membership) run **before** storage; in-transaction failures (full/confirmed) may orphan an uploaded object — accepted pre-launch (AD-14).
- One SESSION payment per member per session (`@@unique([userId, sessionId])`).

---

## A. Happy Path

### TC-PAYS-001 — Per-session member pre-pays and gets a seat
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-persession`; SCHEDULED Activity A session with `fee > 0` and free capacity.
- **Steps**:
  1. From the session detail, go to the pay page, attach `proof-ok.jpg`, submit.
- **Expected result**:
  - `201`; Payment row: type SESSION, `sessionId` set, status PENDING, `amount = session.fee`, month/year = session date's period.
  - Attendance row REGISTERED created in the same transaction.
  - Session detail shows the member as registered; payment appears in history.

### TC-PAYS-002 — Amount and period are server-derived
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Send the multipart request directly with forged `amount`, `month`, `year` fields.
- **Expected result**: Stored amount = session fee; month/year = session date's period. Client values ignored.

### TC-PAYS-003 — Outsider auto-joins on register-and-pay
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: `member-outsider` (not a member of Activity A).
- **Steps**:
  1. Pre-pay a paid Activity A session.
- **Expected result**: `201`; Membership created (join-on-register), PER_SESSION adopted if the member had no mode, payment + attendance created.

### TC-PAYS-004 — Unselected member adopts PER_SESSION here
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member of Activity A, `paymentMode = null`.
- **Steps**:
  1. Complete a per-session pre-pay.
- **Expected result**: `paymentMode = PER_SESSION`, `effectiveFrom = current period`; flow succeeds.

## B. Gate Rejections (Before Storage)

### TC-PAYS-010 — MONTHLY member blocked from the per-session flow
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: `member-monthly` (effective mode MONTHLY).
- **Steps**:
  1. `POST /api/payments/upload` with `sessionId` of a paid Activity A session.
- **Expected result**: `403` `notPerSessionMode`; no payment, no attendance, no storage object.

### TC-PAYS-011 — Non-existent session
- **Priority**: P1 | **Type**: Negative
- **Steps**: Submit with `sessionId = "bogus"`.
- **Expected result**: `404` session `notFound`.

### TC-PAYS-012 — Session with fee = 0
- **Priority**: P1 | **Type**: Negative
- **Preconditions**: Activity D free session.
- **Steps**: Pre-pay it.
- **Expected result**: `400` `noSessionFee` — free sessions use the free RSVP path instead.

### TC-PAYS-013 — CANCELLED / COMPLETED session
- **Priority**: P0 | **Type**: Negative
- **Steps**: Pre-pay a CANCELLED session, then a COMPLETED one.
- **Expected result**: `400` `notRegisterable` for both; nothing stored.

### TC-PAYS-014 — File validation mirrors the monthly flow
- **Priority**: P1 | **Type**: Negative
- **Steps**: Repeat missing-file, wrong-type (`proof-wrong.pdf`), and oversize (`proof-large.jpg`) attempts on the per-session flow.
- **Expected result**: `400` with `fileRequired` / `fileTypeInvalid` / `fileSizeProof` respectively; gates run before storage.

## C. In-Transaction Failures

### TC-PAYS-020 — Session fills up between gate and commit
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: One seat left; two per-session members submit simultaneously (or fill the seat between another member's gate and commit).
- **Steps**:
  1. Fire two pre-pay requests for the last seat.
- **Expected result**: One succeeds `201`; the other gets `409` with the `sessionFull` message; the loser has NO attendance and NO payment row (transaction rolled back). Orphaned storage object acceptable (documented).

### TC-PAYS-021 — Re-pay a session already CONFIRMED
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Member's SESSION payment for this session is CONFIRMED.
- **Steps**:
  1. Submit another proof for the same session.
- **Expected result**: `409` `alreadyConfirmed`; the confirmed payment is untouched.

### TC-PAYS-022 — Re-pay while PENDING (re-upload proof)
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Member's SESSION payment is PENDING.
- **Steps**:
  1. Submit a new proof for the same session.
- **Expected result**: No duplicate row (unique `userId+sessionId`) — the existing payment is updated with the new proof (or a controlled 4xx; verify actual behavior and document). Never two payments for one member+session.

### TC-PAYS-023 — Re-pay after REJECTED
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member's SESSION payment was REJECTED (seat was released).
- **Steps**:
  1. Pre-pay the same session again (capacity available).
- **Expected result**: Succeeds; payment back to PENDING with the new proof; attendance REGISTERED again.

## D. Cancellation Interplay (cross-ref TC-SESM-031/032)

### TC-PAYS-030 — Self-cancel removes PENDING payment + seat atomically
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. Pre-pay a session (PENDING), then `DELETE /api/sessions/[id]/attendance`.
- **Expected result**: Attendance and PENDING payment both gone; seat freed; history no longer shows the pending charge.

### TC-PAYS-031 — Self-cancel blocked once CONFIRMED
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. Admin confirms the session payment, then the member tries to cancel.
- **Expected result**: `403` `cancelBlockedConfirmed`; only admin rejection can release the seat.

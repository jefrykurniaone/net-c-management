# Test Cases — Payment Review (Admin): Confirm, Reject, Manual Create, Export

Scope: admin payment list/filters, confirm/reject via `PATCH /api/payments/[id]` (including seat release on reject), manual payment creation, and CSV export.

Code references: `src/app/(admin)/admin/payments/*`, `src/app/api/payments/[id]/route.ts`, `src/app/api/payments/route.ts` (POST), `src/app/api/payments/export/route.ts`, `src/lib/validations/payment.ts`.

Key business rules:
- Only PENDING payments can be reviewed; a second review returns `409`.
- Confirm and reject both record `confirmedBy` + `confirmedAt`.
- Rejecting a SESSION payment deletes the paired REGISTERED attendance (atomic); PRESENT is never erased.
- Rejecting a MONTHLY payment deletes ALL of that member's REGISTERED attendances in the activity's sessions for that month; PRESENT/ABSENT history stays.

---

## A. Admin List & Filters

### TC-PAYA-001 — Admin sees all members' payments
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. As `admin`, open `/admin/payments`; call `GET /api/payments` and `GET /api/payments?userId=<member id>`.
- **Expected result**: All payments visible; `userId` filter narrows to one member; user + activity info included per row.

### TC-PAYA-002 — Filters: status, month, year, activity
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `GET /api/payments?status=PENDING&month=6&year=2026&activityId=<A>`.
- **Expected result**: Rows match all filters; pagination totals correct.

### TC-PAYA-003 — Proof image is viewable
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open a PENDING payment's proof from the admin list.
- **Expected result**: The uploaded image renders (URL valid, object exists in `payment-proofs`).

## B. Confirm

### TC-PAYA-010 — Confirm a monthly payment
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. `PATCH /api/payments/[id]` with `{ "status": "CONFIRMED" }` on a PENDING monthly payment.
- **Expected result**: `200`; status CONFIRMED; `confirmedBy = acting admin id`, `confirmedAt` set; member sees CONFIRMED in history.

### TC-PAYA-011 — Confirm a session payment
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. Confirm a PENDING SESSION payment.
- **Expected result**: `200`; attendance stays REGISTERED; the member can no longer self-cancel (403 `cancelBlockedConfirmed`).

### TC-PAYA-012 — Confirm with notes
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. Confirm with `{ "status": "CONFIRMED", "notes": "verified via bank statement" }`.
- **Expected result**: Notes persisted and visible.

## C. Reject & Seat Release

### TC-PAYA-020 — Reject a SESSION payment releases the seat
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: PENDING SESSION payment; paired attendance REGISTERED; session upcoming.
- **Steps**:
  1. PATCH `{ "status": "REJECTED", "notes": "wrong amount" }`.
- **Expected result**: `200`; payment REJECTED with notes; the REGISTERED attendance row is DELETED in the same transaction; seat freed; capacity count drops.

### TC-PAYA-021 — Reject a SESSION payment after the member is PRESENT
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: Attendance already PRESENT (session happened), payment still PENDING.
- **Steps**:
  1. Reject the payment.
- **Expected result**: Payment REJECTED, but the PRESENT attendance row remains — history is never retroactively erased.

### TC-PAYA-022 — Reject a MONTHLY payment releases the month's seats
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member's monthly payment (month M) is PENDING; member is REGISTERED in 3 upcoming sessions of Activity A in month M, and PRESENT in 1 past session of month M; also REGISTERED in a session of a DIFFERENT activity in month M.
- **Steps**:
  1. Reject the monthly payment.
- **Expected result**: `200`; the 3 REGISTERED rows for Activity A in month M are deleted; the PRESENT row stays; the other activity's registration is untouched; sessions outside month M untouched.

### TC-PAYA-023 — Re-review is blocked
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. Confirm a payment, then PATCH it again (confirm or reject).
- **Expected result**: Second request `409` `paymentAlreadyReviewed`; state unchanged. Same for double-reject.

### TC-PAYA-024 — Concurrent confirm + reject
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. Fire confirm and reject on the same PENDING payment simultaneously (two admin tabs).
- **Expected result**: One wins, the other gets `409`; never a half-applied state (e.g. REJECTED status but seat still held).

### TC-PAYA-025 — Invalid review payload
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. PATCH with `{ "status": "PAID" }`, `{}`, malformed JSON.
- **Expected result**: `400` validation error with details; no state change.

### TC-PAYA-026 — Review by MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. As `member-monthly`, PATCH their own payment to CONFIRMED.
- **Expected result**: `403 Forbidden` — members can never self-confirm.

### TC-PAYA-027 — Review a non-existent payment
- **Priority**: P2 | **Type**: Negative
- **Steps**: PATCH `/api/payments/bogus-id`.
- **Expected result**: `404 Payment not found`.

## D. Manual Payment Creation (Admin)

### TC-PAYA-030 — Admin records a manual payment
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `POST /api/payments` with a valid payload (member, activity, amount, month, year).
- **Expected result**: `201`; payment created (e.g. for cash payments without proof).

### TC-PAYA-031 — Manual creation validation
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. POST with missing userId/activityId, negative amount, month 13.
- **Expected result**: `400` with zod details per case.

### TC-PAYA-032 — Manual duplicate monthly period
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Member already has a MONTHLY payment for activity/month/year.
- **Steps**:
  1. POST another MONTHLY payment for the same member/activity/period.
- **Expected result**: Blocked by the partial unique index — controlled error, not a raw 500 (flag if unhandled P2002 leaks).

## E. Export

### TC-PAYA-040 — CSV export by period
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `GET /api/payments/export?month=6&year=2026` as admin.
- **Expected result**: CSV with correct rows, headers, filename, and content-type.

### TC-PAYA-041 — Export as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**: Same call as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-PAYA-042 — Export an empty period
- **Priority**: P2 | **Type**: Edge
- **Steps**: Export a month with no payments.
- **Expected result**: Valid CSV with headers only (or a clear empty result) — no 500.

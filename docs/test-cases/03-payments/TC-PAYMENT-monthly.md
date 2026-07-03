# Test Cases — Monthly Dues Payment (Proof Upload)

Scope: the monthly dues flow via `/payments/upload` and `POST /api/payments/upload` (without `sessionId`), including join-on-pay, mode adoption, server-side amount, and month-wide attendance sync.

Code references: `src/app/(main)/payments/upload/page.tsx`, `src/app/api/payments/upload/route.ts` (`handleMonthlyUpload`), `src/lib/payments.ts` (`upsertMonthlyPayment`, `resolveMonthlyOwed`, `adoptModeIfUnselected`, `syncMonthlyAttendances`).

Key business rules:
- Amount is computed **server-side** from the activity's `monthlyFee`; any client-sent amount is ignored (AD-2).
- Paying monthly dues implies joining the activity (join-on-pay) and adopts MONTHLY mode for an unselected member.
- All gates run **before** the file hits storage — a rejected request must not orphan a proof object.
- A paid month buys the whole month: the member is auto-registered into every open session of the activity for that period (capacity-respecting).
- Uniqueness: one MONTHLY payment per member/activity/month/year (partial unique index); re-upload updates the existing row.

---

## A. Happy Path

### TC-PAYM-001 — Monthly upload succeeds
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-monthly`, Activity A (`monthlyFee > 0`), current month/year, `proof-ok.jpg`.
- **Steps**:
  1. Open `/payments/upload`, pick Activity A, month, year, attach `proof-ok.jpg`, submit.
- **Expected result**:
  - `201`; Payment row: type MONTHLY, status PENDING, `amount = Activity A monthlyFee`, `sessionId = null`, `proofUrl`/`proofPath` set.
  - Proof object exists in `payment-proofs` under `userId/yyyy-mm-uuid.ext`.
  - Payment appears in `/payments` history as PENDING.

### TC-PAYM-002 — Month-wide attendance sync after upload
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Activity A has 3 SCHEDULED sessions in the paid month, 1 COMPLETED, 1 CANCELLED; capacity available.
- **Steps**:
  1. Upload monthly dues for that month.
  2. Check the member's attendance rows.
- **Expected result**: Member is REGISTERED into the open (SCHEDULED/registerable) sessions of that month only; COMPLETED/CANCELLED sessions untouched; no duplicates if some were already registered.

### TC-PAYM-003 — Attendance sync respects capacity
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: One of the month's sessions is already full.
- **Steps**:
  1. Upload monthly dues.
- **Expected result**: The full session is skipped (no overbooking); other sessions get registrations; upload itself still succeeds `201`.

### TC-PAYM-004 — Amount is server-sourced (client amount ignored)
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Send the multipart request directly with an extra `amount=1` field.
- **Expected result**: Stored `amount` equals the activity's `monthlyFee`, not 1.

### TC-PAYM-005 — Re-upload for the same period updates, not duplicates
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: PENDING (or REJECTED) monthly payment already exists for Activity A, month M.
- **Steps**:
  1. Upload a new proof for the same activity/month/year.
- **Expected result**: `201`; still exactly ONE payment row for that member/activity/period (upsert); proof replaced/updated; a REJECTED payment returns to PENDING for re-review. Verify no duplicate row (partial unique index holds).

## B. Join-on-Pay & Mode Adoption

### TC-PAYM-010 — Outsider paying dues auto-joins the activity
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: `member-outsider` (not a member of Activity A).
- **Steps**:
  1. Upload monthly dues for Activity A.
- **Expected result**: `201`; Membership row for Activity A is created/activated; payment recorded.

### TC-PAYM-011 — Unselected member adopts MONTHLY mode on dues upload
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member of Activity A with `paymentMode = null`.
- **Steps**:
  1. Upload monthly dues.
  2. Check membership mode.
- **Expected result**: `paymentMode = MONTHLY`, `effectiveFrom = current period`; upload succeeds.

### TC-PAYM-012 — PER_SESSION member blocked from the monthly flow
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: `member-persession` (effective mode PER_SESSION for the period).
- **Steps**:
  1. Upload monthly dues for Activity A.
- **Expected result**: `403` with the `notMonthlyMode` message; no payment row; **no proof object left in storage** (gate runs before upload).

## C. Validation & Negative Cases

### TC-PAYM-020 — Missing activityId
- **Priority**: P1 | **Type**: Negative
- **Steps**: Send the form without `activityId`.
- **Expected result**: `400` `activityRequired`.

### TC-PAYM-021 — Activity with monthlyFee = 0
- **Priority**: P1 | **Type**: Negative
- **Preconditions**: Activity D (`monthlyFee = 0`).
- **Steps**: Upload monthly dues for Activity D.
- **Expected result**: `400` with the `noMonthlyFee` message; nothing stored.

### TC-PAYM-022 — Month/year boundary validation
- **Priority**: P1 | **Type**: Edge
- **Steps**: Attempt uploads with:
  - `month = 0`, `month = 13`, `month = "abc"`
  - `year = 2019` (below 2020), `year = current + 2` (beyond max future)
  - boundary-valid: `month = 1`, `month = 12`, `year = 2020`, `year = current + 1`
- **Expected result**: Invalid variants → `400` `monthYearInvalid`. Boundary-valid variants → accepted.

### TC-PAYM-023 — Missing file
- **Priority**: P1 | **Type**: Negative
- **Steps**: Submit without a file.
- **Expected result**: `400` `fileRequired`.

### TC-PAYM-024 — Disallowed file type
- **Priority**: P0 | **Type**: Negative
- **Steps**: Upload `proof-wrong.pdf`; also try a `.gif` and an `.svg`.
- **Expected result**: `400` `fileTypeInvalid` (only jpeg/jpg/png/webp allowed).

### TC-PAYM-025 — File over 5MB
- **Priority**: P1 | **Type**: Negative
- **Steps**: Upload `proof-large.jpg` (> 5MB).
- **Expected result**: `400` `fileSizeProof`.

### TC-PAYM-026 — File exactly at the 5MB boundary
- **Priority**: P2 | **Type**: Edge
- **Steps**: Upload a file of exactly 5 × 1024 × 1024 bytes, then one byte over.
- **Expected result**: Exactly 5MB accepted; 5MB + 1 byte rejected.

### TC-PAYM-027 — Renamed non-image (`proof-fake.jpg`)
- **Priority**: P2 | **Type**: Edge (security)
- **Steps**: Upload a text/binary file renamed `.jpg` with MIME `image/jpeg`.
- **Expected result**: Passes the MIME check (validation is type-header based — document this as a known limitation); stored object must never be served with an executable content type.

### TC-PAYM-028 — Upload without login
- **Priority**: P0 | **Type**: Negative
- **Steps**: `POST /api/payments/upload` without a session.
- **Expected result**: `401 Unauthorized`.

### TC-PAYM-029 — Bogus activityId
- **Priority**: P2 | **Type**: Negative
- **Steps**: Upload with `activityId = "bogus"`.
- **Expected result**: Controlled 4xx (membership/owed resolution fails) — no 500, no orphan storage object.

## D. Payment History (Member View)

### TC-PAYM-030 — Member sees only their own payments
- **Priority**: P0 | **Type**: Negative (security)
- **Preconditions**: Payments exist for multiple users.
- **Steps**:
  1. As `member-monthly`, call `GET /api/payments` and `GET /api/payments?userId=<other user id>`.
- **Expected result**: Both return only the member's own payments — the `userId` filter must be ignored for non-admins.

### TC-PAYM-031 — Member cannot open another member's payment detail
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. As `member-monthly`, `GET /api/payments/[id]` for another member's payment.
- **Expected result**: `403 Forbidden`.

### TC-PAYM-032 — History filters
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. `GET /api/payments?month=6&year=2026&status=PENDING&activityId=<A>`.
- **Expected result**: Results match all filters; sorted year desc, month desc; pagination fields (`total`, `page`, `limit`) correct.

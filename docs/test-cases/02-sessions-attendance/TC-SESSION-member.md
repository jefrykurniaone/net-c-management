# Test Cases — Sessions (Member Side): List, Detail, RSVP, Cancel

Scope: session list/detail pages, free RSVP (`POST /api/sessions/[id]/attendance`), and cancellation (`DELETE /api/sessions/[id]/attendance`). The paid per-session registration flow is covered in `03-payments/TC-PAYMENT-per-session.md`.

Code references: `src/app/(main)/sessions/*`, `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/route.ts`, `src/app/api/sessions/[id]/attendance/route.ts`, `src/lib/payments.ts` (`isFreeRegisterAllowed`, `releaseSessionSeat`).

Key business rules:
- Free RSVP is only for members whose effective mode is **MONTHLY** *and* whose dues for the session's period are already uploaded (PENDING/CONFIRMED). PER_SESSION or unselected members must pre-pay (403 `payRequired`).
- Capacity counts only seat-holding rows (`REGISTERED`, `PRESENT`); `ABSENT` rows have released their seat.
- Cancelling deletes any paired PENDING/REJECTED SESSION payment atomically; a CONFIRMED payment blocks self-cancel.

---

## A. Session List & Detail

### TC-SESM-001 — Member sees sessions of active activities only
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Sessions exist for Activity A (active) and Activity C (inactive). Logged in as `member-monthly`.
- **Steps**:
  1. Open `/sessions`; also call `GET /api/sessions`.
- **Expected result**: Only Activity A sessions are listed. Activity C sessions are hidden (admins would still see them).

### TC-SESM-002 — Upcoming filter
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Mix of past sessions, upcoming SCHEDULED, and CANCELLED/COMPLETED sessions.
- **Steps**:
  1. Call `GET /api/sessions?upcoming=true`.
- **Expected result**: Only sessions with `date >= now` and status SCHEDULED/ONGOING are returned, sorted by date ascending.

### TC-SESM-003 — Pagination bounds
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Call `GET /api/sessions?page=0&limit=999`.
  2. Call `GET /api/sessions?page=-5&limit=-1`.
  3. Call `GET /api/sessions?page=abc&limit=abc`.
- **Expected result**: No 500. Page is clamped to ≥ 1, limit to 1..50. Non-numeric input falls back to defaults or is clamped (`NaN` must not leak into the query).

### TC-SESM-004 — Filter by activityId
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. Call `GET /api/sessions?activityId=<Activity A id>`.
- **Expected result**: Only that activity's sessions are returned.

### TC-SESM-005 — Session detail shows attendees, capacity, and bank info
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open `/sessions/[id]` for an Activity A session with several registrations.
- **Expected result**: Detail shows title, date/time, location, fee, attendee list (name + avatar) ordered by registration time, filled/total capacity, and the activity's bank account info.

### TC-SESM-006 — Non-existent session detail
- **Priority**: P2 | **Type**: Negative
- **Steps**:
  1. Open `/sessions/bogus-id`; call `GET /api/sessions/bogus-id`.
- **Expected result**: API `404 { "error": "Session not found" }`; page shows a not-found state, no crash.

## B. Free RSVP (Monthly-Mode Members)

### TC-SESM-010 — Monthly member with paid dues can RSVP
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-monthly` has uploaded dues (PENDING or CONFIRMED) for the session's month; Activity A session is SCHEDULED with free capacity.
- **Steps**:
  1. Click register on the session detail page (or `POST /api/sessions/[id]/attendance`).
- **Expected result**: `201`; `Attendance` row created with status `REGISTERED`; attendee count increases; UI switches to "registered" state.

### TC-SESM-011 — Monthly member WITHOUT dues for the period is rejected
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: `member-monthly` has no PENDING/CONFIRMED payment for the session's month.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance`.
- **Expected result**: `403` with the `payRequired` message. No attendance row created. Seat lock follows money.

### TC-SESM-012 — Per-session member cannot use the free path
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Logged in as `member-persession`.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` on a paid Activity A session.
- **Expected result**: `403` `payRequired` — must go through the pre-pay flow (`POST /api/payments/upload` with `sessionId`).

### TC-SESM-013 — Member with unselected mode is rejected on a paid session
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Member of Activity A with `paymentMode = null`.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` on a paid session.
- **Expected result**: `403` `payRequired`. Mode is never adopted through the free-RSVP path.

### TC-SESM-014 — Free session (fee = 0) auto-joins the activity
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Activity D (free) session; logged in as `member-outsider` (not a member of Activity D).
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` on the Activity D session.
- **Expected result**: `201`; a membership for Activity D is created automatically (join-on-register only allowed when fee = 0), attendance `REGISTERED`.

### TC-SESM-015 — Paid session does NOT auto-join
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Logged in as `member-outsider`; paid Activity A session.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance`.
- **Expected result**: Rejected (403). No membership row is silently created for a paid session via the free path.

### TC-SESM-016 — RSVP to a CANCELLED session
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` on a CANCELLED session.
- **Expected result**: `400 { "error": "Session is cancelled" }`.

### TC-SESM-017 — RSVP to a COMPLETED session
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` on a COMPLETED session.
- **Expected result**: `400 { "error": "Session already completed" }`.

### TC-SESM-018 — RSVP when the session is full
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: Session with `maxPlayers = N` already has N seat-holding attendances (REGISTERED/PRESENT). The acting member is eligible (monthly, dues paid).
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` as one more eligible member.
- **Expected result**: `400 { "error": "Session is full" }`; count never exceeds `maxPlayers`.

### TC-SESM-019 — ABSENT rows do not consume capacity
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Session full at N, then one attendee's status becomes ABSENT (cancelled seat).
- **Steps**:
  1. Another eligible member registers.
- **Expected result**: `201` — the ABSENT row released its seat, so a slot is available.

### TC-SESM-020 — Re-registration is idempotent (upsert)
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Member already REGISTERED for the session.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance` again.
- **Expected result**: `201`, still exactly one attendance row (unique `userId+sessionId`), status remains `REGISTERED`. No duplicate.

### TC-SESM-021 — Re-register after being ABSENT
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: Member's attendance status is ABSENT for an upcoming session; member is still eligible.
- **Steps**:
  1. `POST /api/sessions/[id]/attendance`.
- **Expected result**: Existing row is updated back to `REGISTERED` (upsert path), seat is re-held, capacity respected.

## C. Cancel Registration

### TC-SESM-030 — Cancel a free RSVP
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member is REGISTERED (monthly path, no session payment).
- **Steps**:
  1. `DELETE /api/sessions/[id]/attendance`.
- **Expected result**: `200 { "success": true }`; seat released; attendee list no longer shows the member.

### TC-SESM-031 — Cancel a pre-paid registration with PENDING payment
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-persession` registered via pre-pay; the SESSION payment is still PENDING.
- **Steps**:
  1. `DELETE /api/sessions/[id]/attendance`.
- **Expected result**: `200`; the attendance AND the PENDING SESSION payment are removed atomically — no orphan payment left holding a seat.

### TC-SESM-032 — Cancel blocked when the session payment is CONFIRMED
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Member's SESSION payment for this session is CONFIRMED.
- **Steps**:
  1. `DELETE /api/sessions/[id]/attendance`.
- **Expected result**: `403` with the `cancelBlockedConfirmed` message. Attendance and payment remain. Only an admin reject can release it.

### TC-SESM-033 — Cancel when not registered
- **Priority**: P2 | **Type**: Negative
- **Steps**:
  1. `DELETE /api/sessions/[id]/attendance` for a session the member never registered for.
- **Expected result**: `404 { "error": "Not registered" }`.

### TC-SESM-034 — Cancel without login
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. `DELETE /api/sessions/[id]/attendance` without a session cookie.
- **Expected result**: `401 Unauthorized`.

## D. Concurrency

### TC-SESM-040 — Two members race for the last seat
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: One seat left; two eligible members.
- **Steps**:
  1. Fire both `POST /api/sessions/[id]/attendance` requests as close to simultaneously as possible.
- **Expected result**: At most one succeeds `201`; final seat-holding count must not exceed `maxPlayers`. (Known area to watch: check-then-insert races.)

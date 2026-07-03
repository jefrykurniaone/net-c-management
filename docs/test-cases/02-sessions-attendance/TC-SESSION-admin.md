# Test Cases — Sessions (Admin Side): CRUD, Status, Manual Attendance, Export

Scope: session creation/edit/delete by admin, status transitions, manual attendance marking, and attendance export.

Code references: `src/app/(admin)/admin/sessions/*`, `src/app/api/sessions/route.ts` (POST), `src/app/api/sessions/[id]/route.ts` (PATCH/DELETE), `src/app/api/sessions/[id]/attendance/manual/route.ts`, `src/app/api/sessions/[id]/export/route.ts`, `src/lib/validations/session.ts`.

---

## A. Create Session

### TC-SESA-001 — Admin creates a session (happy path)
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Logged in as `admin`; Activity A exists.
- **Steps**:
  1. Open `/admin/sessions/new`, fill title, date, start/end time, location, maxPlayers, fee, select Activity A, submit.
- **Expected result**: `201`; session appears in the admin list and (once SCHEDULED and upcoming) in the member list with the activity badge.

### TC-SESA-002 — Create with missing/invalid fields
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Submit with empty title / empty date / malformed time / negative fee / maxPlayers 0 or negative (one variation per attempt), or POST the payloads directly.
- **Expected result**: `400` with zod `details`; nothing persisted. UI shows localized field errors.

### TC-SESA-003 — Create as MEMBER (authorization)
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. `POST /api/sessions` with a valid payload as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-SESA-004 — Session fee defaults from the activity's sessionFee
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. Open the create form with Activity A selected.
- **Expected result**: Fee field is pre-filled with Activity A's `sessionFee` (admin can override).

## B. Edit & Status Transitions

### TC-SESA-010 — Edit session fields
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open `/admin/sessions/[id]/edit`, change title, location, time, fee, maxPlayers; save.
- **Expected result**: `200`; changes visible on member detail page immediately.

### TC-SESA-011 — Change status SCHEDULED → ONGOING → COMPLETED
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. PATCH status to ONGOING, then COMPLETED.
- **Expected result**: Each transition persists. Once COMPLETED, member RSVP is rejected (`400 Session already completed`).

### TC-SESA-012 — Cancel a session with registered members
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: Session has REGISTERED attendees (some via monthly dues, some pre-paid).
- **Steps**:
  1. PATCH status to CANCELLED.
  2. Check member views and payment records.
- **Expected result**: Status CANCELLED; new RSVPs rejected (`400 Session is cancelled`). Verify and document what happens to existing attendances/session payments (business decision — flag if pre-paid members keep a PENDING payment for a cancelled session with no refund path).

### TC-SESA-013 — Shrink maxPlayers below current registrations
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Session has 10 seat-holders.
- **Steps**:
  1. PATCH `maxPlayers` to 5.
- **Expected result**: Update succeeds; existing 10 attendances remain (no one is evicted); new registrations are rejected as full. No crash on capacity display (e.g. "10/5").

### TC-SESA-014 — Edit a non-existent session
- **Priority**: P2 | **Type**: Negative
- **Steps**:
  1. `PATCH /api/sessions/bogus-id` with a valid payload.
- **Expected result**: No 500 — a controlled error (Prisma P2025 must be handled or surfaced as 404/500-with-log; flag if it 500s).

## C. Delete Session

### TC-SESA-020 — Delete a session without payments
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `DELETE /api/sessions/[id]` on a session with only attendances (no SESSION payments).
- **Expected result**: `200 { success: true }`; attendances cascade-deleted; session gone from all lists.

### TC-SESA-021 — Delete a session that has SESSION payments
- **Priority**: P0 | **Type**: Negative (data integrity)
- **Preconditions**: Session has at least one Payment row with `sessionId` set (`onDelete: Restrict` on the relation).
- **Steps**:
  1. `DELETE /api/sessions/[id]`.
- **Expected result**: Deletion is blocked by the DB restrict constraint — a paid session cannot be silently deleted out from under a payment record. Verify the API returns a controlled error (not an unhandled 500 leaking Prisma internals — flag if it does).

### TC-SESA-022 — Delete as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. `DELETE /api/sessions/[id]` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

## D. Manual Attendance (Admin)

### TC-SESA-030 — Mark a registered member PRESENT
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. `POST /api/sessions/[id]/attendance/manual` with `{ userId, status: "PRESENT" }` for a REGISTERED member.
- **Expected result**: `200`; attendance status becomes PRESENT; reflected in the session detail attendee list.

### TC-SESA-031 — Mark ABSENT releases the seat
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Mark a REGISTERED member ABSENT.
  2. Have another eligible member register.
- **Expected result**: ABSENT row stays (history) but no longer counts toward capacity; the new member can take the freed seat.

### TC-SESA-032 — Manual upsert creates attendance for a walk-in
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. `POST .../attendance/manual` with a `userId` who never registered, status PRESENT.
- **Expected result**: `200`; attendance row is created (upsert). Note: this path does not check capacity, membership, or payment — verify this is intended for walk-ins and document it.

### TC-SESA-033 — Invalid payload
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Send `{ userId: "", status: "PRESENT" }`, then `{ userId: "<valid>", status: "LATE" }`.
- **Expected result**: `400 { "error": "Invalid payload" }` for both.

### TC-SESA-034 — Manual attendance as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. Call the manual endpoint as `member-monthly` trying to mark themselves PRESENT.
- **Expected result**: `403 Forbidden`.

### TC-SESA-035 — Bogus userId in manual attendance
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. `POST .../attendance/manual` with `userId: "bogus"`.
- **Expected result**: Controlled error (FK violation must not surface as a raw 500 — flag if it does).

## E. Attendance Export

### TC-SESA-040 — Export session attendance
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `GET /api/sessions/[id]/export` as admin on a session with mixed statuses (REGISTERED/PRESENT/ABSENT).
- **Expected result**: CSV downloads with correct rows/statuses and proper content-type/filename headers.

### TC-SESA-041 — Export as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. `GET /api/sessions/[id]/export` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-SESA-042 — Export with special characters in names
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: An attendee whose name contains commas, quotes, or newlines (e.g. `"Budi, \"Smash\" Jr."`).
- **Steps**:
  1. Export and open the CSV.
- **Expected result**: Fields are properly escaped/quoted; columns do not shift.

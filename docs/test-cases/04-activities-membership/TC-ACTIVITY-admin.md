# Test Cases — Activity Management (Admin)

Scope: activity CRUD via `/admin/activities` and `/api/activities` — creation, editing (fees, modes, schedule, bank account), deactivation, and the delete guard.

Code references: `src/app/(admin)/admin/activities/*`, `src/app/api/activities/route.ts`, `src/app/api/activities/[id]/route.ts`, `src/lib/validations/activity.ts`.

---

## A. Create

### TC-ACT-001 — Create an activity (happy path)
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. As `admin`, create an activity: name, unique slug, color, monthlyFee, sessionFee, `allowsMonthly`/`allowsPerSession`, maxPlayers, location, bank fields.
- **Expected result**: `201`; appears in the admin list and in member-facing activity choices (onboarding, memberships).

### TC-ACT-002 — Duplicate slug
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Create another activity with an existing slug.
- **Expected result**: `409` `activitySlugTaken` (P2002 mapped); localized message shown.

### TC-ACT-003 — Validation failures
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. POST with empty name, empty slug, negative fees, maxPlayers ≤ 0, `recurringDay = 7` (one per attempt).
- **Expected result**: `400` with zod details per case; nothing persisted.

### TC-ACT-004 — Create as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**: `POST /api/activities` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-ACT-005 — Both payment modes disabled
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. Create/update an activity with `allowsMonthly = false` AND `allowsPerSession = false`.
- **Expected result**: Either blocked by validation, or (if allowed) members of it can never select a mode and every paid path rejects — verify actual behavior and flag if it produces a dead-end activity silently.

## B. Update

### TC-ACT-010 — Edit fees and modes
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. PATCH Activity A: change `monthlyFee`, `sessionFee`, toggle `allowsPerSession`.
- **Expected result**: `200`. New monthly uploads use the NEW `monthlyFee`; existing payment rows keep their historical amount; new sessions inherit the new `sessionFee` default.

### TC-ACT-011 — Disable a mode members already use
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: `member-persession` on Activity A.
- **Steps**:
  1. PATCH Activity A `allowsPerSession = false`.
  2. As `member-persession`, try a per-session pre-pay and a mode re-select.
- **Expected result**: Mode PATCH to PER_SESSION now `400` `paymentModeNotOffered`. Verify how the existing PER_SESSION member is treated afterwards (documented behavior, no crash).

### TC-ACT-012 — Update bank account fields
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. PATCH bank name/number/holder.
- **Expected result**: `200`; payment-upload pages show the new bank info with a working copy button; empty strings mean "not configured" and hide/soften the display.

### TC-ACT-013 — Deactivate an activity
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Activity A has members, sessions, payments.
- **Steps**:
  1. PATCH `isActive = false`.
- **Expected result**: `200`. Members no longer see it in activity lists or its sessions in `/sessions`; onboarding no longer offers it; mode PATCH returns 404. Historical payments/attendance remain intact. Admin still sees it with `?includeInactive=true`.

### TC-ACT-014 — Reactivate
- **Priority**: P2 | **Type**: Positive
- **Steps**: PATCH `isActive = true` back.
- **Expected result**: Activity and its sessions reappear for members; memberships still intact.

### TC-ACT-015 — Update a non-existent activity
- **Priority**: P2 | **Type**: Negative
- **Steps**: `PATCH /api/activities/bogus-id`.
- **Expected result**: `404 Not found` (P2025 mapped).

## C. Delete Guard

### TC-ACT-020 — Delete an activity with sessions or payments is blocked
- **Priority**: P0 | **Type**: Negative (data integrity)
- **Preconditions**: Activity A has ≥ 1 session or ≥ 1 payment.
- **Steps**:
  1. `DELETE /api/activities/[id]`.
- **Expected result**: `409` `activityDeleteHasDataError` — admin must deactivate instead. Data untouched.

### TC-ACT-021 — Delete a fresh activity with members only
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: New activity, has memberships but zero sessions and zero payments.
- **Steps**:
  1. DELETE it.
- **Expected result**: `200 { success: true }`; memberships cascade-deleted; gone everywhere.

### TC-ACT-022 — Delete as MEMBER / delete non-existent
- **Priority**: P0/P2 | **Type**: Negative
- **Steps**:
  1. DELETE as `member-monthly` → expect `403`.
  2. DELETE `bogus-id` as admin → expect `404`.

## D. Listing Visibility

### TC-ACT-030 — Member list hides inactive activities
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. As member: `GET /api/activities` and `GET /api/activities?includeInactive=true`.
- **Expected result**: Both return active only — the `includeInactive` flag is admin-gated and silently ignored for members.

### TC-ACT-031 — `mine=true` returns only joined activities
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. As `member-monthly` (member of A only): `GET /api/activities?mine=true`.
- **Expected result**: Only Activity A returned.

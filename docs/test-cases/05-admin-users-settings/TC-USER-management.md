# Test Cases — User Management (Admin)

Scope: member list/search (`GET /api/users`), role & active-status changes (`PATCH /api/users`), and member detail (`/admin/members/[id]`).

Code references: `src/app/(admin)/admin/members/*`, `src/app/api/users/route.ts`.

Key business rules:
- Admin cannot demote themselves.
- OWNER accounts are immutable — nobody (including OWNER) can change them via this endpoint.

---

## A. List & Search

### TC-USR-001 — Admin lists members with counts
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. As `admin`, open `/admin/members`; call `GET /api/users`.
- **Expected result**: Users listed newest-first with role, active flag, profile-complete flag, attendance & payment counts; pagination fields correct.

### TC-USR-002 — Search by name and email (case-insensitive)
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. `GET /api/users?search=budi`, then search a partial email in MiXeD case.
- **Expected result**: Matches on name OR email, case-insensitive; empty search returns all.

### TC-USR-003 — Pagination bounds
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. `GET /api/users?page=0&limit=101`, `?page=-1&limit=abc`.
- **Expected result**: Page clamped ≥ 1, limit clamped 1..100; no 500 on non-numeric input.

### TC-USR-004 — List as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**: `GET /api/users` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

## B. Role Changes

### TC-USR-010 — Promote MEMBER to ADMIN
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. As `admin`, PATCH `{ id: <member>, role: "ADMIN" }`.
- **Expected result**: `200`; on the target's next request they can access `/admin` (database sessions — see TC-AUTH-042).

### TC-USR-011 — Demote ADMIN to MEMBER
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. PATCH another admin down to MEMBER.
- **Expected result**: `200`; target loses admin access on next request.

### TC-USR-012 — Self-demotion blocked
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. As `admin`, PATCH `{ id: <own id>, role: "MEMBER" }`.
- **Expected result**: `400 Cannot demote yourself` — prevents locking the community out of admin access.

### TC-USR-013 — OWNER is immutable
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. As `admin`, PATCH the OWNER's role to MEMBER; then PATCH `isActive: false` on the OWNER.
- **Expected result**: `403 Cannot modify an OWNER account` for both.

### TC-USR-014 — Nobody can be promoted to OWNER via API
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. PATCH `{ id: <member>, role: "OWNER" }`.
- **Expected result**: Rejected (payload type only allows ADMIN/MEMBER) — verify the value is not persisted; OWNER promotion only via the `db:promote` script.

## C. Activate / Deactivate

### TC-USR-020 — Deactivate a member
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. PATCH `{ id: <member>, isActive: false }`.
- **Expected result**: `200`; flag persisted. Verify what an inactive user can still do (login? RSVP? upload?) and document — flag if `isActive` is not enforced anywhere in the auth/middleware path.

### TC-USR-021 — Reactivate
- **Priority**: P2 | **Type**: Positive
- **Steps**: PATCH back `isActive: true`.
- **Expected result**: `200`; member fully functional.

### TC-USR-022 — PATCH validation
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. PATCH `{}` (no id) → `400 User ID required`.
  2. PATCH `{ id: "bogus" }` → `404 User not found`.
  3. PATCH as `member-monthly` → `403`.

## D. Member Detail Page

### TC-USR-030 — Detail shows profile, memberships, attendance & payment history
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open `/admin/members/[id]` for a member with data.
- **Expected result**: Profile info, joined activities with modes, attendance history, and payment history render correctly.

### TC-USR-031 — Detail for a bogus id
- **Priority**: P2 | **Type**: Negative
- **Steps**: Open `/admin/members/bogus-id`.
- **Expected result**: Not-found state, no crash.

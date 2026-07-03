# Test Cases — Member Profile & Avatar

Scope: viewing/updating own profile (`GET/PATCH /api/users/profile`), avatar upload (`POST /api/users/profile/avatar`), and admin contact info (`GET /api/users/admin-contacts`).

Code references: `src/app/(main)/profile/page.tsx`, `src/app/api/users/profile/route.ts`, `src/app/api/users/profile/avatar/route.ts`, `src/app/api/users/admin-contacts/route.ts`.

---

## A. Profile

### TC-PROF-001 — View own profile
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. As `member-monthly`, open `/profile`; call `GET /api/users/profile`.
- **Expected result**: Own name, email, phone, avatar, and activity memberships (with payment modes) shown.

### TC-PROF-002 — Update name and phone
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. PATCH a new valid name and phone.
- **Expected result**: `200`; changes persist and render after reload.

### TC-PROF-003 — Update validation
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. PATCH empty name; invalid phone format.
- **Expected result**: `400` with localized zod errors; no change.

### TC-PROF-004 — Profile scoping
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. PATCH with an extra `id`/`userId`/`role` field targeting another user or role escalation.
- **Expected result**: Foreign fields ignored by the schema — only the caller's own name/phone can change; role untouched.

### TC-PROF-005 — Unauthenticated
- **Priority**: P0 | **Type**: Negative
- **Steps**: GET/PATCH profile without a session.
- **Expected result**: `401 Unauthorized`.

## B. Avatar

### TC-PROF-010 — Upload avatar
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Upload a valid image via the profile page.
- **Expected result**: `200/201`; stored in the `avatars` bucket; `user.image` updated; avatar renders in the shell and attendee lists.

### TC-PROF-011 — Avatar validation
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Upload a PDF, an oversized file, and no file (one per attempt).
- **Expected result**: `400` per case; existing avatar untouched.

### TC-PROF-012 — Replace avatar
- **Priority**: P2 | **Type**: Edge
- **Steps**: Upload a new avatar over an old one.
- **Expected result**: New avatar shown everywhere; verify old object cleanup or documented retention.

## C. Admin Contacts

### TC-PROF-020 — Member can fetch admin contacts
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. As `member-monthly`, `GET /api/users/admin-contacts`.
- **Expected result**: Admin/owner names + WhatsApp numbers returned (for the "contact admin" flow); no unrelated personal data leaks.

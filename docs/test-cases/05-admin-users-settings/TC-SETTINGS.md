# Test Cases — Community Settings & Branding (Admin)

Scope: key-value settings (`GET/PATCH /api/settings`), logo upload (`POST /api/settings/logo`), and white-label branding fallbacks.

Code references: `src/app/(admin)/admin/settings/page.tsx`, `src/app/api/settings/route.ts`, `src/app/api/settings/logo/route.ts`, `src/lib/settings.ts`.

---

## A. Settings CRUD

### TC-SET-001 — Update community name and defaults
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. As `admin`, open `/admin/settings`; change community name, default location, admin WhatsApp; save.
- **Expected result**: `200`; values upserted in the `Settings` table; new name appears in the app shell (sidebar/header) for all users after reload.

### TC-SET-002 — Locale-aware default community name
- **Priority**: P1 | **Type**: Positive (white-label)
- **Preconditions**: Fresh DB with no `communityName` setting row.
- **Steps**:
  1. Load the app with locale `en`, then with locale `id`.
- **Expected result**: Name falls back to "XClub Community" (en/id) — no hardcoded legacy brand anywhere.

### TC-SET-003 — PATCH as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**: `PATCH /api/settings` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-SET-004 — GET settings requires expected exposure
- **Priority**: P1 | **Type**: Negative (security)
- **Steps**:
  1. `GET /api/settings` without login, then as member.
- **Expected result**: Verify against intended behavior — the settings map contains only non-secret community values. Flag if anything sensitive is exposed or if unauthenticated access is unintended.

### TC-SET-005 — Empty/whitespace values
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Save an empty community name / whitespace-only values.
- **Expected result**: Either validation rejects, or the app falls back to the locale default gracefully — never a blank header.

## B. Logo Upload

### TC-SET-010 — Upload a logo
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Upload a valid image as the community logo.
- **Expected result**: `200/201`; object stored in the `logos` bucket; `logoUrl` setting updated; logo renders in the shell for all users.

### TC-SET-011 — Logo file validation
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Upload a PDF, an oversized image, and no file (one per attempt).
- **Expected result**: `400` with the appropriate validation message per case; setting unchanged.

### TC-SET-012 — Upload as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Steps**: `POST /api/settings/logo` as `member-monthly`.
- **Expected result**: `403 Forbidden`.

### TC-SET-013 — Replace an existing logo
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Upload a second logo over an existing one.
- **Expected result**: New logo displayed; verify the old storage object is cleaned up or documented as retained.

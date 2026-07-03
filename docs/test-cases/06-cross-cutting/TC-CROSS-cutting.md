# Test Cases — Cross-Cutting: i18n, Authorization Matrix, Uploads, Robustness

Scope: concerns that span every feature — locale switching, a full authorization sweep, shared file-upload rules, dashboard aggregation, and general robustness.

Code references: `src/lib/i18n/*`, `src/app/api/locale/route.ts`, `src/lib/supabase.ts`, `src/app/(main)/dashboard/page.tsx`.

---

## A. i18n / Locale

### TC-I18N-001 — Switch language EN ↔ ID
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Switch locale via the UI (POST `/api/locale`).
  2. Walk through dashboard, sessions, payments, profile, admin pages.
- **Expected result**: `NEXT_LOCALE` cookie set; ALL user-facing strings switch language; no hardcoded leftovers in either language.

### TC-I18N-002 — API error messages are localized
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. With locale `id`, trigger validation errors (e.g. dues upload with month 13; RSVP without dues).
  2. Repeat with locale `en`.
- **Expected result**: Error messages come from the dictionary in the active language.

### TC-I18N-003 — Invalid/missing locale cookie
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Set `NEXT_LOCALE=xx` manually; reload. Then delete the cookie; reload.
- **Expected result**: Falls back to the default locale; no crash.

## B. Authorization Sweep (API Matrix)

### TC-AUTHZ-001 — Full endpoint × role matrix
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**: For each endpoint below, call as (a) unauthenticated, (b) MEMBER, (c) ADMIN, and verify the status:

| Endpoint | Unauth | MEMBER | ADMIN |
|---|---|---|---|
| `GET /api/sessions` | 401 | 200 | 200 |
| `POST /api/sessions` | 401 | 403 | 201 |
| `PATCH/DELETE /api/sessions/[id]` | 401 | 403 | 200 |
| `POST /api/sessions/[id]/attendance` | 401 | 201/4xx | 201/4xx |
| `POST /api/sessions/[id]/attendance/manual` | 401 | 403 | 200 |
| `GET /api/sessions/[id]/export` | 401 | 403 | 200 |
| `GET /api/payments` | 401 | 200 (own only) | 200 (all) |
| `POST /api/payments` | 401 | 403 | 201 |
| `PATCH /api/payments/[id]` | 401 | 403 | 200 |
| `GET /api/payments/export` | 401 | 403 | 200 |
| `POST /api/payments/upload` | 401 | 201/4xx | 201/4xx |
| `GET /api/activities` | 401 | 200 (active only) | 200 |
| `POST /api/activities` | 401 | 403 | 201 |
| `PATCH/DELETE /api/activities/[id]` | 401 | 403 | 200 |
| `GET/PATCH /api/users` | 401 | 403 | 200 |
| `GET/PATCH /api/users/profile` | 401 | 200 | 200 |
| `PATCH /api/users/memberships/[id]/mode` | 401 | 200/4xx | 200/4xx |
| `PATCH /api/settings` | 401 | 403 | 200 |
| `POST /api/settings/logo` | 401 | 403 | 200/201 |

- **Expected result**: Matrix holds exactly; any drift is a finding.

### TC-AUTHZ-002 — IDOR probes
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. As member X: fetch member Y's payment by id, PATCH mode on an activity Y belongs to but X doesn't, cancel Y's attendance.
- **Expected result**: Every cross-user access is 403/404; server derives identity from the session, never from the payload.

## C. Shared Upload Rules

### TC-UPL-001 — Consistent file rules across upload endpoints
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. For each of payment proof, avatar, logo: try `proof-wrong.pdf`, `proof-large.jpg`, empty file (0 bytes), and a valid `.webp`.
- **Expected result**: Each endpoint enforces its type/size rules with a localized `400`; 0-byte file handled gracefully; webp accepted where allowed.

### TC-UPL-002 — Storage privacy
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Take a stored proof URL/path; try fetching it unauthenticated / as another member (depending on bucket policy).
- **Expected result**: Matches the intended bucket policy (service-role only vs public URLs). Flag if payment proofs of other members are guessable/publicly readable.

### TC-UPL-003 — Service key never reaches the browser
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Inspect all client bundles/network traffic for `SUPABASE_SERVICE_ROLE_KEY`.
- **Expected result**: Key appears server-side only.

## D. Dashboard & Aggregation

### TC-DASH-001 — Member dashboard summary is consistent
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Member with upcoming registrations, mixed payment statuses.
- **Steps**:
  1. Open `/dashboard`; cross-check numbers against `/sessions` and `/payments`.
- **Expected result**: Upcoming sessions, attendance, and dues status match the underlying data; no stale/mismatched counts.

### TC-DASH-002 — Admin dashboard stats
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open `/admin`; verify member counts, pending payments, and session stats against the DB.
- **Expected result**: All aggregates correct.

### TC-DASH-003 — Empty states
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: Fresh member with no memberships beyond onboarding, no payments, no sessions.
- **Steps**:
  1. Open dashboard, sessions, payments pages.
- **Expected result**: Friendly localized empty states; no crashes on empty arrays.

## E. Robustness

### TC-ROB-001 — Malformed JSON bodies
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Send syntactically invalid JSON to every POST/PATCH endpoint.
- **Expected result**: Controlled `400` (not an unhandled 500) — known gap pattern: routes that call `req.json()` without try/catch; flag each that 500s.

### TC-ROB-002 — Wrong content type
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Send `text/plain` bodies to JSON endpoints and JSON to the multipart upload endpoint.
- **Expected result**: Controlled 4xx errors.

### TC-ROB-003 — Long input values
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. 10,000-character session title/notes; very long name in onboarding.
- **Expected result**: Zod max-length limits (where defined) reject with 400; UI does not break on long rendered strings.

### TC-ROB-004 — XSS via stored strings
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Set name / session title / notes to `<script>alert(1)</script>` and `<img src=x onerror=alert(1)>`.
  2. View every page that renders them (attendee lists, admin tables, dashboards).
- **Expected result**: Rendered as inert text (React escaping); no script execution anywhere — pay attention to any `dangerouslySetInnerHTML` usage.

### TC-ROB-005 — Timezone/period boundary
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. Around midnight at a month boundary (e.g. Jul 31 → Aug 1), create a session dated on the boundary and pay dues for each adjacent month; verify which period the session's payments/sync land in.
- **Expected result**: Month attribution is consistent between session date, payment period, monthly-attendance sync, and reject-releases (UTC vs local handling must agree — the reject path uses UTC month windows).

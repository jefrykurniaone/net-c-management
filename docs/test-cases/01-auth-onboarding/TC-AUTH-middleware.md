# Test Cases — Authentication & Middleware Routing

Scope: Google OAuth sign-in, dev login, route protection via middleware (`src/proxy.ts`), layout guards, and sessions.

Code references: `src/proxy.ts`, `src/lib/auth.ts`, `src/app/auth/*`, `src/app/api/dev-login/route.ts`.

---

## A. Unauthenticated Access

### TC-AUTH-001 — Redirect to sign-in when accessing protected routes
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Not logged in (no session cookie).
- **Steps**:
  1. Directly access `/dashboard`, `/sessions`, `/payments`, `/profile`, `/admin` (one by one).
- **Expected result**: Every URL redirects to `/auth/signin`.

### TC-AUTH-002 — API returns 401 without a session
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Not logged in.
- **Steps**:
  1. Send `GET /api/sessions`, `GET /api/payments`, `GET /api/activities`, `GET /api/users/profile` without a session cookie.
- **Expected result**: All respond `401` with body `{ "error": "Unauthorized" }` (JSON, not an HTML redirect).

### TC-AUTH-003 — Sign-in page reachable without login
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Open `/auth/signin`.
- **Expected result**: Sign-in page renders with the Google login button; no redirect loop.

## B. Google OAuth Login

### TC-AUTH-010 — First login creates a new user
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: A Google account that has never logged into the app.
- **Steps**:
  1. Click Google login on `/auth/signin`, complete the OAuth consent.
- **Expected result**:
  - A new `User` row is created (role `MEMBER`, `isProfileComplete = false`).
  - After login, the user is redirected to `/onboarding` (not the dashboard).

### TC-AUTH-011 — Returning user with complete profile
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: User has already completed onboarding (`isProfileComplete = true`).
- **Steps**:
  1. Log in via Google.
- **Expected result**: Redirected to `/dashboard` without passing through onboarding.

### TC-AUTH-012 — Cancel/deny on the Google consent screen
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Start Google login, then press Cancel/Deny on the consent screen.
- **Expected result**: Returned to the error/sign-in page (`/auth/error` or `/auth/signin`) with an understandable message; no session is created.

### TC-AUTH-013 — Account linking disabled in production
- **Priority**: P0 | **Type**: Edge (production only)
- **Preconditions**: Production build; a `User` row with email X exists in the DB but has never signed in with Google (no `Account` row).
- **Steps**:
  1. Log in with Google using email X.
- **Expected result**: Login rejected with `OAuthAccountNotLinked` (automatic linking is dev-only). Documented in the README.

## C. Middleware Routing by State

### TC-AUTH-020 — Incomplete profile forced to onboarding
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Logged in as `member-new` (`isProfileComplete = false`).
- **Steps**:
  1. Access `/dashboard`, `/sessions`, `/payments`, `/profile`, `/admin` one by one.
- **Expected result**: All redirect to `/onboarding`.

### TC-AUTH-021 — Logged-in user redirected away from auth pages
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Logged in as `member-monthly` (profile complete).
- **Steps**:
  1. Open `/auth/signin`.
- **Expected result**: Redirected to `/dashboard`.

### TC-AUTH-022 — Logged-in user with incomplete profile opens auth page
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Logged in as `member-new`.
- **Steps**:
  1. Open `/auth/signin`.
- **Expected result**: Redirected to `/onboarding` (not `/dashboard`).

### TC-AUTH-023 — MEMBER blocked from admin routes
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Logged in as `member-monthly`.
- **Steps**:
  1. Access `/admin`, `/admin/members`, `/admin/payments`, `/admin/sessions`, `/admin/activities`, `/admin/settings`.
- **Expected result**: All redirect to `/dashboard`. No admin content is ever rendered.

### TC-AUTH-024 — ADMIN and OWNER can access admin routes
- **Priority**: P0 | **Type**: Positive
- **Steps**:
  1. Log in as `admin`, open `/admin` and every subpage.
  2. Repeat as `owner`.
- **Expected result**: Both roles can open all admin pages.

### TC-AUTH-025 — Layered guard: direct admin API access as MEMBER
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Logged in as `member-monthly`.
- **Steps**:
  1. Send `GET /api/users`, `POST /api/sessions`, `PATCH /api/settings`, `POST /api/activities` directly.
- **Expected result**: All respond `403 Forbidden` — protection is not middleware/page-only.

## D. Dev Login (Non-Production)

### TC-AUTH-030 — `/auth/dev` page available in development
- **Priority**: P2 | **Type**: Positive
- **Preconditions**: `npm run dev` (NODE_ENV ≠ production).
- **Steps**:
  1. Open `/auth/dev` while logged out, then while logged in.
- **Expected result**: Page stays reachable in both states (to switch between seeded users); it is not caught by the redirect-to-dashboard rule.

### TC-AUTH-031 — `/auth/dev` and `POST /api/dev-login` disabled in production
- **Priority**: P0 | **Type**: Negative (security)
- **Preconditions**: Production build (`npm run build && npm start`).
- **Steps**:
  1. Open `/auth/dev`.
  2. Send `POST /api/dev-login` with a valid payload.
- **Expected result**: The page cannot be used to log in (redirects per production middleware rules) and the API rejects the request. No OAuth bypass exists in production.

## E. Session & Sign-out

### TC-AUTH-040 — Sign-out destroys the session
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Logged in as any user.
- **Steps**:
  1. Click sign-out.
  2. Open `/dashboard`.
- **Expected result**: Redirected to `/auth/signin`; the session cookie is no longer valid; the DB `Session` row is deleted/invalid.

### TC-AUTH-041 — Expired session
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: Log in, then set the `Session` row's `expires` column to the past (via Prisma Studio).
- **Steps**:
  1. Refresh `/dashboard`.
- **Expected result**: Treated as logged out → redirect to `/auth/signin`.

### TC-AUTH-042 — Role change takes effect on an active session
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: `member-monthly` is logged in; an admin changes their role to ADMIN.
- **Steps**:
  1. Without logging out, the member refreshes and tries `/admin`.
- **Expected result**: Because sessions are database-backed, the new role is read on the next request → `/admin` becomes accessible (and conversely on demote: admin access is lost immediately).

# Test Cases — Onboarding (First-Login Profile Completion)

Scope: the `/onboarding` page and `PATCH /api/users/onboarding` — filling in name, phone number, and activity selection on first login.

Code references: `src/app/onboarding/page.tsx`, `src/app/api/users/onboarding/route.ts`, `src/lib/validations/user.ts`.

---

### TC-ONB-001 — Successful onboarding (happy path)
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Logged in as `member-new` (`isProfileComplete = false`).
- **Steps**:
  1. Open `/onboarding` (auto-redirected here).
  2. Fill in a valid name and a valid phone number.
  3. Select at least one active activity (e.g. Activity A).
  4. Submit.
- **Expected result**:
  - Response `200`; `isProfileComplete = true`.
  - A `Membership` row is created for the selected activity.
  - Redirected to `/dashboard`; other routes no longer force onboarding.

### TC-ONB-002 — Select more than one activity
- **Priority**: P1 | **Type**: Positive
- **Steps**:
  1. Complete onboarding selecting both Activity A and Activity B.
- **Expected result**: Memberships created for both; both appear on the profile.

### TC-ONB-003 — Submit without a name / empty name
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Leave the name field empty, submit.
- **Expected result**: Validation fails — error shown on the form; the API returns `400` with zod `details` when called directly.

### TC-ONB-004 — Invalid phone number
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Enter a phone number with letters / wrong format (e.g. `abc123`), submit.
- **Expected result**: Validation fails per the zod schema; error message matches the active locale.

### TC-ONB-005 — Submit without selecting any activity
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. Fill in valid name & phone, select no activity, submit.
- **Expected result**: Rejected with `400` — "activity required" message (`activityMembershipRequired`); `isProfileComplete` stays `false`.

### TC-ONB-006 — Only inactive activities submitted (UI bypass)
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. Send `PATCH /api/users/onboarding` directly with `activityIds` containing only the id of Activity C (inactive).
- **Expected result**: `400` `activityMembershipRequired` — inactive activities are filtered server-side; no membership is created; profile remains incomplete.

### TC-ONB-007 — Mix of active + inactive + bogus activity ids
- **Priority**: P1 | **Type**: Edge
- **Steps**:
  1. Send `activityIds` = [Activity A (active), Activity C (inactive), `"bogus-id"`].
- **Expected result**: `200`; a membership is created only for Activity A. Inactive/bogus ids are ignored without a 500.

### TC-ONB-008 — Repeated onboarding (membership idempotency)
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: User already has a membership for Activity A.
- **Steps**:
  1. Call `PATCH /api/users/onboarding` again with Activity A in the list.
- **Expected result**: `200`; no duplicate membership (`skipDuplicates`); no unique-constraint error.

### TC-ONB-009 — Onboarding without login
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. Send `PATCH /api/users/onboarding` without a session.
- **Expected result**: `401 Unauthorized`.

### TC-ONB-010 — User with a complete profile opens `/onboarding`
- **Priority**: P2 | **Type**: Edge
- **Preconditions**: Logged in as `member-monthly` (profile complete).
- **Steps**:
  1. Open `/onboarding` directly via URL.
- **Expected result**: Consistent behavior (page may render or redirect) — verify a re-submit does not corrupt existing membership/payment-mode data.

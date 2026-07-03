# Test Cases — Payment Mode Selection & Switching

Scope: a member setting/changing their payment mode per activity via `PATCH /api/users/memberships/[activityId]/mode` (profile → activity memberships UI).

Code references: `src/app/(main)/profile/activity-memberships.tsx`, `src/app/api/users/memberships/[activityId]/mode/route.ts`, `src/lib/payment-mode.ts` (`currentPeriod`, `nextPeriod`, `graduateStanding`), `src/lib/validations/membership.ts`.

Key business rules (AD-7):
- Mode lives on the Membership; `null` = explicitly unselected.
- **First-ever selection** applies to the CURRENT period.
- **Change while the current period is unpaid** (no PENDING/CONFIRMED payment) applies immediately (current period).
- **Change after paying the current period** is QUEUED (`pendingMode`, effective next period) — a paid period is never rewritten. REJECTED payments do not count as paid.
- Re-picking the standing mode cancels any queued switch.
- The activity must offer the requested mode (`allowsMonthly` / `allowsPerSession`).
- Optimistic concurrency: a stale concurrent update returns `409`.

---

## A. Selection & Immediate Switch

### TC-MODE-001 — First selection applies this period
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member of Activity A, `paymentMode = null`, no payment this period.
- **Steps**:
  1. `PATCH .../mode` with `{ "mode": "MONTHLY" }`.
- **Expected result**: `200`; `paymentMode = MONTHLY`, `effectiveFrom = current YYYYMM`, `pendingMode = null`.

### TC-MODE-002 — Switch while current period unpaid → immediate
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Mode MONTHLY, NO live payment (PENDING/CONFIRMED) for Activity A this period.
- **Steps**:
  1. PATCH mode to `PER_SESSION`.
- **Expected result**: `200`; `paymentMode = PER_SESSION` effective from the CURRENT period; no pending fields set.

### TC-MODE-003 — Switch after REJECTED payment still immediate
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Member's only payment this period is REJECTED.
- **Steps**:
  1. PATCH mode to the other mode.
- **Expected result**: Immediate switch (REJECTED funds nothing — does not lock the period).

## B. Queued Switch (Paid Period)

### TC-MODE-010 — Switch after paying this period → queued for next period
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-monthly` has a PENDING or CONFIRMED payment for Activity A this period.
- **Steps**:
  1. PATCH mode to `PER_SESSION`.
- **Expected result**: `200`; `paymentMode` stays MONTHLY, `pendingMode = PER_SESSION`, `pendingEffectiveFrom = next YYYYMM`. UI shows the queued switch.

### TC-MODE-011 — Queued switch graduates when the period turns
- **Priority**: P0 | **Type**: Edge
- **Preconditions**: Membership has `pendingMode = PER_SESSION`, `pendingEffectiveFrom = next period`. Simulate period rollover (adjust system date or the pending fields).
- **Steps**:
  1. In the new period, read the membership (any mode-aware endpoint) or PATCH again.
- **Expected result**: Standing mode becomes PER_SESSION (`graduateStanding`); pending fields are consumed. Behavior gates (free RSVP vs pre-pay) now follow the new mode.

### TC-MODE-012 — Re-picking the standing mode cancels the queue
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Standing MONTHLY with a queued PER_SESSION switch.
- **Steps**:
  1. PATCH mode back to `MONTHLY`.
- **Expected result**: `200`; `pendingMode`/`pendingEffectiveFrom` cleared; standing mode and `effectiveFrom` unchanged.

### TC-MODE-013 — A session payment also locks the period
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: `member-persession` paid one SESSION payment this period (PENDING/CONFIRMED).
- **Steps**:
  1. PATCH mode to MONTHLY.
- **Expected result**: Queued for next period (any live payment in the period — monthly dues OR a session fee — locks the current period).

## C. Validation & Authorization

### TC-MODE-020 — Mode not offered by the activity
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Activity B (`allowsPerSession = false`); member of Activity B.
- **Steps**:
  1. PATCH mode to `PER_SESSION` on Activity B.
- **Expected result**: `400` `paymentModeNotOffered`.

### TC-MODE-021 — Non-member of the activity
- **Priority**: P0 | **Type**: Negative
- **Steps**:
  1. As `member-outsider`, PATCH mode on Activity A.
- **Expected result**: `403` `notMember`.

### TC-MODE-022 — Invalid body
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. PATCH with empty body, malformed JSON, `{ "mode": "WEEKLY" }`, `{ "mode": null }`.
- **Expected result**: `400` `paymentModeRequired` for each; no state change.

### TC-MODE-023 — Inactive or non-existent activity
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. PATCH mode on Activity C (inactive), then on `bogus-id`.
- **Expected result**: `404 Not found` (membership check may 403 first for bogus id — either way a controlled 4xx, never 500).

### TC-MODE-024 — Unauthenticated
- **Priority**: P0 | **Type**: Negative
- **Steps**: PATCH without a session.
- **Expected result**: `401 Unauthorized`.

## D. Concurrency

### TC-MODE-030 — Two simultaneous mode changes
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Same member, two parallel PATCH requests with different modes.
- **Steps**:
  1. Fire both concurrently.
- **Expected result**: One `200`; the other `409` (optimistic-concurrency guard, P2025). Final state matches exactly one request; no silent clobber.

## E. UI (Profile → Memberships)

### TC-MODE-040 — Mode options reflect activity offering
- **Priority**: P2 | **Type**: Positive
- **Steps**:
  1. Open profile memberships for Activity A (both modes) and Activity B (monthly only).
- **Expected result**: Activity A shows both options; Activity B shows monthly only (or per-session disabled).

### TC-MODE-041 — Queued switch is visible
- **Priority**: P2 | **Type**: Positive
- **Preconditions**: TC-MODE-010 state (queued switch).
- **Steps**:
  1. Open the profile memberships UI.
- **Expected result**: Current mode + a clear "switches to X from <next period>" indication, localized.

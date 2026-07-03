# Test Cases — Activity Membership (Join / Leave)

Scope: the member-side membership list with payment-mode state (`GET /api/users/memberships`) and join/leave (`POST /api/users/memberships`), plus the implicit join paths (join-on-pay / join-on-register — cross-referenced).

Code references: `src/app/api/users/memberships/route.ts`, `src/lib/activity.ts` (`ensureMembership`), `src/app/(main)/profile/activity-memberships.tsx`.

---

## A. Membership List

### TC-MEM-001 — List shows all active activities with a joined flag
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: `member-monthly` (member of A); activities A, B active, C inactive.
- **Steps**:
  1. `GET /api/users/memberships`.
- **Expected result**: A and B returned (C excluded); A has `joined = true` with mode fields; B has `joined = false`, mode fields null.

### TC-MEM-002 — Effective mode is server-resolved
- **Priority**: P1 | **Type**: Positive
- **Preconditions**: Member with a queued pending mode (see TC-MODE-010).
- **Steps**:
  1. `GET /api/users/memberships`.
- **Expected result**: `effectiveMode` reflects the CURRENT period's resolution (standing mode, not the pending one); pending fields exposed for the UI hint.

### TC-MEM-003 — Scoping: only own membership state
- **Priority**: P0 | **Type**: Negative (security)
- **Steps**:
  1. As `member-monthly`, inspect the response for any other member's data.
- **Expected result**: Response contains only the caller's membership fields; no other users' rows leak.

## B. Join

### TC-MEM-010 — Join an activity
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: `member-monthly` not a member of Activity B.
- **Steps**:
  1. `POST /api/users/memberships` `{ "activityId": "<B>", "action": "join" }`.
- **Expected result**: `200 { success: true }`; B now `joined = true` with `paymentMode = null` (fresh, unselected); B's sessions become joinable per payment rules.

### TC-MEM-011 — Join an inactive/bogus activity
- **Priority**: P1 | **Type**: Negative
- **Steps**:
  1. Join Activity C (inactive), then `"bogus-id"`.
- **Expected result**: `404 Not found` for both; no membership row created.

### TC-MEM-012 — Join twice (idempotent)
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Join Activity B twice.
- **Expected result**: Both `200`; exactly one membership row (unique `userId+activityId`).

### TC-MEM-013 — Missing/invalid body
- **Priority**: P2 | **Type**: Negative
- **Steps**:
  1. POST `{}`, `{ "activityId": 123 }`, `{ "action": "join" }`.
- **Expected result**: `400 Bad Request`; unknown `action` values default to join (documented) — verify no 500 on malformed JSON.

## C. Leave

### TC-MEM-020 — Leave an activity
- **Priority**: P0 | **Type**: Positive
- **Preconditions**: Member of Activity A with payment history and upcoming registrations.
- **Steps**:
  1. POST `{ "activityId": "<A>", "action": "leave" }`.
- **Expected result**: `200`; membership `isActive = false`; A shows `joined = false` in the list. Payment history remains. Verify what happens to upcoming REGISTERED seats (document — flag if seats stay held after leaving).

### TC-MEM-021 — Leave an activity never joined
- **Priority**: P2 | **Type**: Edge
- **Steps**:
  1. Leave Activity B as a non-member.
- **Expected result**: `200` no-op (updateMany matches nothing); no error.

### TC-MEM-022 — Re-join after leaving resets stale mode
- **Priority**: P1 | **Type**: Edge
- **Preconditions**: Member left Activity A while having mode MONTHLY.
- **Steps**:
  1. Join Activity A again.
  2. Check mode fields.
- **Expected result**: Membership reactivated; stale payment-mode selection is reset per `ensureMembership` (member re-picks a mode); paid paths gate accordingly.

### TC-MEM-023 — Behavior gates after leaving
- **Priority**: P0 | **Type**: Negative
- **Preconditions**: Member left Activity A.
- **Steps**:
  1. Try free RSVP on an A session, per-session pre-pay, and mode PATCH.
- **Expected result**: All treat the user as non-member (403/`notMember` or payment-gated rejection) — an inactive membership must not pass `assertMembership`.

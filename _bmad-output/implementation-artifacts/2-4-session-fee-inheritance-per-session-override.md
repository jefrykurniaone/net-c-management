---
baseline_commit: 57f801bc0eb050f328c7ff182887c50394f0bcd7
note: Verification story. The enabling change (new Session inherits the Activity's sessionFee) landed as part of Story 2.2's field-rename propagation; the edit/override + no-retroactive-rewrite behavior is inherent to the existing session architecture.
---

# Story 2.4: Session fee inheritance & per-session override

Status: review

## Story

As an Admin creating or editing a Session,
I want a new Session to default its fee from its Activity but let me override it,
So that I set per-session prices once on the Activity yet can adjust an individual Session.

**Epic:** Epic 2 — Payment Foundation
**FRs:** FR-8 (per-session price per Activity — Session inherits, overridable)
**Governed by:** AD-2 (auth-gated `/api/sessions`), AD-8 (snapshot principle — no retroactive rewrite), NFR-8 (no regression)

## Acceptance Criteria

1. **New Session inherits the Activity's `sessionFee`.**
   **Given** an Admin creates a new Session under an Activity,
   **When** the create form loads (and the Activity is selected),
   **Then** the Session's fee (`ActivitySession.fee`) defaults from that Activity's `sessionFee` (FR-8).

2. **Per-Session override persists via the auth-gated route.**
   **Given** an Admin editing a Session,
   **When** they set a different fee,
   **Then** that Session persists its own overriding fee, independent of the Activity default, via the auth-gated `PATCH /api/sessions/[id]` (AD-2).

3. **No retroactive rewrite.**
   **Given** a later change to the Activity's `sessionFee`,
   **When** existing Sessions are viewed,
   **Then** already-created Sessions keep their stored fee (no retroactive rewrite); only newly created Sessions inherit the new default (AD-8 snapshot principle).

## Tasks / Subtasks

- [x] **Task 1 — Verify create-form inheritance (AC: 1)**
  - [x] `src/app/(admin)/admin/sessions/new/page.tsx` `handleEkskulChange` sets `form.setValue("fee", chosen.sessionFee)` on Activity select — the new-Session fee defaults from `Ekskul.sessionFee` (the `defaultFee`→`sessionFee` switch landed under Story 2.2's rename propagation). Admin can still override before submit.
- [x] **Task 2 — Verify override persistence (AC: 2)**
  - [x] `src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx` binds the `fee` field to `session.fee` (the stored value, not re-inherited) and PATCHes `/api/sessions/[id]`.
  - [x] `src/app/api/sessions/[id]/route.ts` PATCH is auth-gated (`auth()` → 401, `isAdminRole` → 403) and persists `fee` via `buildUpdateSessionSchema` → `prisma.activitySession.update`.
- [x] **Task 3 — Verify no retroactive rewrite (AC: 3)**
  - [x] Confirm no code path rewrites `ActivitySession.fee` from `Ekskul.sessionFee`: the Activity PATCH (`/api/ekskul/[id]`) updates only the `Ekskul` row; session fee is set at create and only changed by an explicit per-session edit.
- [x] **Task 4 — Verify (NFR-8)**
  - [x] `npm run lint` + `npm run build` green (covered by the Epic 2 build; no new source changed in this story).

## Dev Notes

### Why this story needs no new code
FR-8's three behaviors are already true in the codebase after Story 2.2:
1. **Inheritance** — `sessions/new` defaults the fee from the selected Activity. Story 2.2 renamed the source field from the old dual-purpose `defaultFee` to the dedicated `sessionFee`, so the new-Session default now correctly reads the per-session price (not the monthly dues).
2. **Override** — the Session model already carries its own `fee` column; the edit form loads the stored `session.fee` and the auth-gated PATCH persists whatever the admin sets, independent of the Activity.
3. **No retroactive rewrite** — a Session's `fee` is stored at creation. Editing an Activity's `sessionFee` touches only the `Ekskul` row (`/api/ekskul/[id]`); there is no job or query that back-writes session fees. This is the AD-8 snapshot principle, satisfied by construction.

This story is therefore a **verification pass** confirming the FR-8 contract holds end-to-end. Had the inheritance source still pointed at `monthlyFee`/the old field, this story would have carried the fix; Story 2.2 already made that switch.

### Scope boundary
- **In scope:** confirm inheritance + override + no-rewrite for the per-session fee.
- **NOT in scope:** per-session *billing* (charging a member the session fee) — that is Epic 3 (Story 3.5). This story is only about the admin-side fee value on the Session.

### References
- [Source: epics.md#Story 2.4], [epics.md#FR-8], [epics.md#AD-8]
- [Source: src/app/(admin)/admin/sessions/new/page.tsx:62-71] — create-form inheritance from `sessionFee`
- [Source: src/app/(admin)/admin/sessions/[id]/edit/edit-form.tsx:70,318-335] — edit form fee field bound to stored `session.fee`
- [Source: src/app/api/sessions/[id]/route.ts:50-87] — auth-gated PATCH persists `fee`

### Testing standards
No automated tests. Verify: create a Session → fee prefills from the Activity's `sessionFee`; edit a Session → change fee → persists; change the Activity's `sessionFee` → existing Sessions keep their stored fee. `npm run lint` + `npm run build` green.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- Verification-only. The `sessions/new` fee default reads `chosen.sessionFee` (switched from `defaultFee` under Story 2.2). Edit form + PATCH route persist per-session `fee`. Activity PATCH never rewrites session fees. `npm run lint` + `npm run build` green in the Epic 2 build.

### Completion Notes List

- **AC1 (inheritance):** satisfied — `sessions/new` sets `fee` from the Activity's `sessionFee` on select. Enabling change (source field `defaultFee`→`sessionFee`) landed under Story 2.2.
- **AC2 (override):** satisfied — the Session's own `fee` column + edit form (loads stored `session.fee`) + auth-gated `PATCH /api/sessions/[id]` persist an override independent of the Activity.
- **AC3 (no retroactive rewrite):** satisfied by construction — session `fee` is a stored snapshot; editing `Ekskul.sessionFee` updates only the Ekskul row, never existing sessions.
- **No code changes in this story** — it is the FR-8 verification pass; the one wiring change it depended on was made in Story 2.2's rename propagation.

### File List

- (verification only — no files modified in this story; see Story 2.2 for the `sessions/new` fee-source change)

## Change Log

| Date | Change |
|---|---|
| 2026-07-01 | Story 2.4 created + verified. FR-8 (Session inherits Activity `sessionFee`, override persists, no retroactive rewrite) confirmed satisfied by the existing session create/edit architecture plus Story 2.2's `defaultFee`→`sessionFee` switch. No new code required. |

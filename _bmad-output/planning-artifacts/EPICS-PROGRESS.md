# Epics & Stories — Progress Handoff

**Workflow:** BMad Method `bmad-create-epics-and-stories`
**Output file:** `_bmad-output/planning-artifacts/epics.md`
**Last updated:** 2026-06-30

## Where we are

| Step | State |
|---|---|
| step-01 validate prerequisites & extract requirements | ✅ done |
| step-02 design epic list | ✅ done (4 epics approved) |
| step-03 generate epics & stories | 🚧 in progress |
| step-04 final validation | ⬜ not started |

### step-03 detail (story generation)

| Epic | Stories | State |
|---|---|---|
| Epic 1 — Activity-Agnostic Rebrand & Identity (FR-1..5) | 1.1–1.4 | ✅ written |
| Epic 2 — Payment Foundation: Rename + Fee/Mode Config (FR-6..9) | 2.1–2.4 | ✅ written |
| Epic 3 — Member Payment-Mode Selection & Billing (FR-10..12) | — | ⬜ next |
| Epic 4 — UI/UX Refresh, Responsiveness & Settings IA (FR-13..15) | — | ⬜ pending |

## Next step

Resume `bmad-create-epics-and-stories` at **step-03**, generate stories for **Epic 3** (then Epic 4):

- **Epic 3** is the highest-risk track — member payment-mode selection + billing. Governed by AD-3..AD-7, AD-13, AD-14. Expect stories for: `Membership.paymentMode` (period-resolved, AD-7); `Payment` model extension `type`/`sessionId` + mode-partitioned uniqueness via raw SQL (AD-4/AD-5); monthly billing + migrate existing upsert (FR-11); per-session pre-pay-on-register atomic transaction (FR-12/AD-6/AD-14); member mode selector UI (FR-10/UX-DR10/UX-DR11).
- **Epic 4** — cross-cutting UI/UX refresh, responsiveness, Settings IA cleanup (FR-13..15, AD-11). Lands last.
- After both epics' stories are written → **step-04 final validation** (verify every FR + UX-DR covered, template compliance).

## Inputs (frontmatter of epics.md)

PRD + addendum + ARCHITECTURE-SPINE + UX DESIGN/EXPERIENCE + SPEC + project-context.md — all confirmed.

## How to resume

Run the `bmad-create-epics-and-stories` skill in a fresh context window; it reads `epics.md` frontmatter (`stepsCompleted`) and the appended Epic 1/2 sections to continue at Epic 3.

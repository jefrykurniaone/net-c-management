# The Applicant's waiting room and the Admin's queue

Type: prototype
Status: open
Parent: ../map.md
Blocked by: 05

## Question

05 made joining approval-gated, which creates two surfaces that do not exist
today: `/pending`, where an **Applicant** waits, and the queue where an **Admin**
admits or declines them. 05 fixed the *mechanism* — `admittedAt` nullable,
decline is `isActive = false`, queue is `admittedAt IS NULL AND isActive`. It
did not decide what either surface looks like or says.

What do these two screens do?

Sub-questions:

- **`/pending` has one job and no controls.** A stranger who has just handed
  over their name and phone is looking at a page that gives them nothing. What
  stops it reading as a dead end — an expected wait time, the Admin's WhatsApp
  (`PRODUCT.md:44`), the Activities they picked, sign-out? Does it show the
  community's real sessions, or is that exactly the tease that annoys?
- **The declined state renders on the same route.** `isActive = false` with
  `admittedAt` null is a different message from "not yet". How blunt is it, and
  does it offer any recourse — or is WhatsApp the recourse?
- **Where does the Admin's queue live?** A fifth tab under `/admin`, a band at
  the top of `/admin/members`, or a badge on the existing roster with a filter?
  `/admin/members` already lists users, sorts on `isActive`, and has a per-row
  action component — reuse or a new surface?
- **What does the Admin see to judge on?** Name, phone, email, when they asked,
  which Activities they picked. Is that the row, or is there a detail view? A
  volunteer organizer deciding on a phone deserves a one-glance row.
- **Both surfaces are enamel, not board.** 01 decision 4 confines painted board
  to the landing hero. Neither of these is a marketing surface — they are the
  app, and they follow `DESIGN.md` as-is. Confirm no exemption is wanted.
- **Two audiences, two form factors** (`PRODUCT.md:16`): `/pending` is a
  stranger on a phone; the queue is an organizer on a desktop who may be on a
  phone. Neither may break on the longer Indonesian string.

Use `/prototype` — "what does a waiting room that doesn't feel like a rejection
look like" is a question to answer by making something, not by arguing.

## Answer

<!-- resolved by the session that takes this ticket -->

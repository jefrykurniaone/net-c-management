# Spec: Dues Rate frozen per Billing Period — rate history, queued changes, member notice

| | |
|---|---|
| Spec | [#107](https://github.com/jefrykurniaone/net-c-management/issues/107) — `spec:dues-rate` |
| Run | `run:dues-rate` |
| Execution map | added when Stage 4 creates it |
| Tickets | added when Stage 3 creates them, as sub-issues of #107 |
| Version | v1 (2026-08-29) |
| Grilled from | [#62](https://github.com/jefrykurniaone/net-c-management/issues/62) — Dues are not frozen per Billing Period |
| Depends on | nothing open; mirrors the payment-mode switch rule (`pendingMode` / `pendingEffectiveFrom`) and reuses the email seam |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled from #62 on 2026-08-29. Depends on nothing open: the payment-mode resolution it mirrors (`pendingMode` / `pendingEffectiveFrom`) and the email seam both exist on `main`.

Repo copy: `docs/spec-dues-rate-v1.md`. Execution map and tickets: added below as they are created.

## Problem Statement

`CONTEXT.md` says a Billing Period that has arrived is settled and is never rewritten. For Dues, the product does not keep that promise.

An Activity holds one live monthly amount, and every monthly Payment copies that amount at the moment a member uploads a Proof. So when an Admin changes the Dues on the 15th, members who paid before the change paid one figure and members who pay after it pay another — two prices inside one Period, and nothing anywhere that says what the Period actually charged. An Admin looking at the Payments queue is warned "below Dues" against today's figure even for a January Proof that was correct in January. The admin dashboard's "total due" is headcount times today's figure, whatever the month.

Per-Session Fees do not have this problem: each Session carries its own Fee, copied from the Activity when the Session is posted, so the price is frozen per Session already. Dues are the one obligation still priced off a live field.

## Solution

Give every Activity a **Dues Rate** — the amount it charges for Dues in one Billing Period — kept as a history rather than a single field. A Period's rate is whichever rate was in force when that Period arrived, and once a Period has arrived its rate is frozen: nobody can edit or delete it.

An Admin who changes the Dues chooses the Period the new rate starts from — the next Period at the earliest, twelve Periods ahead at the latest. Until that Period arrives the change is *queued*: the Admin sees it beneath the field, can replace it or withdraw it, and members on Dues for that Activity are told about it on their dashboard and by email. When the Period arrives the queued rate becomes the rate, the notice disappears, and every read — the Proof upload, the Confirm dialog's low-amount warning, the dashboard totals, the Activities register — reads the rate of the Period it is about.

The live `monthlyFee` field goes away. One source of truth for the price of a Period, the same way the Session already owns its Fee.

## Goals and success criteria

Goals:

- Every monthly Payment is priced by the Dues Rate of the Period it pays for, whenever it is uploaded.
- An arrived Period's Dues Rate cannot be changed by anyone through any route.
- An Admin can queue a rate change against a chosen future Period, see it, replace it and withdraw it, and the affected members are told.
- Every read of the monthly amount in the product resolves through the Period, and the live field no longer exists.

Non-goals: any change to per-Session Fees, to payment-mode resolution or graduation, to Billing Period keys, or to how a Payment is confirmed or rejected.

Success criteria — the run is done when:

- `TC-DR-*` in `TESTING.md` has been executed and recorded, every P0 passing, in both locales.
- Uploading a Proof for the current Period, for a Period with a queued rate, and for a past Period each records the amount that Period's rate says — asserted from the database.
- Editing or deleting the rate of an arrived Period is refused at the route with 409, for an Admin and for the Owner.
- The migration seeds one rate per Activity equal to its `monthlyFee` at migration time; no existing Payment row changes; the `monthlyFee` column is gone after the last ticket and the build has no reference to it.
- The completion gate on the execution map passes on `main` after the last merge.

## User Stories

1. As a member on Dues, I want the amount I am asked to pay for a month to be the amount that month charged, so that paying on the 20th does not cost more than paying on the 5th.
2. As a member on Dues, I want to pay a past month at the rate that month had, so that catching up on arrears is not repriced at today's figure.
3. As a member on Dues, I want to pay a future month at the rate that month will have, so that pre-paying is not undercharged and then flagged.
4. As a member on Dues, I want the Proof upload form to show me the amount for the month I picked, so that I transfer the right figure before I take the screenshot.
5. As a member on Dues, I want to see on my dashboard that my Dues for an Activity are changing and from which month, so that the new figure is not a surprise at upload time.
6. As a member on Dues, I want an email when a Dues change is queued, replaced or withdrawn for my Activity, so that I hear about it even if I do not open the app that month.
7. As a member paying per Session, I want to hear nothing about Dues changes, so that I am not told about a price I do not pay.
8. As a member whose switch to Dues lands in a future month, I want to be told about a Dues change effective from that month, so that the price I will be on is the one I was told.
9. As an Admin, I want to set a new Dues Rate and choose the month it starts from, so that I can announce a change in advance rather than have it land mid-month.
10. As an Admin, I want the earliest start to be next month, so that I cannot reprice a month people have already paid into.
11. As an Admin, I want to see the queued change under the Dues field — the figure and the month — so that I know what is pending without opening a history.
12. As an Admin, I want to replace a queued change by saving again, so that correcting a typo is one save, not a delete and a re-add.
13. As an Admin, I want to withdraw a queued change before its month arrives, so that a decision the committee reversed does not land.
14. As an Admin, I want a refused edit of an arrived month's rate to tell me why, so that I learn the rule instead of assuming the form is broken.
15. As an Admin, I want the Confirm dialog's "below Dues" warning to compare against the rate of the month the Payment is for, so that a January Proof is judged by January's Dues.
16. As an Admin, I want the dashboard's total due to use this month's rate, so that a queued rise does not inflate the figure before it applies.
17. As an Admin, I want the Activities register to show the current Dues Rate and to sort by it, so that the register still answers "which Activity charges most".
18. As an Owner, I want the same rule to bind me as binds an Admin, so that immutability is a property of the Period and not of who is asking.
19. As an Admin, I want to know who set a rate and when, so that "who raised the Dues in March" has an answer in the record.
20. As a new Activity's Admin, I want the Activity to have a rate from creation, so that every month resolves without a special case.
21. As a member, I want everything above in my own language, so that a change to what I pay is never announced to me in the wrong one.
22. As a keyboard or screen-reader user, I want the month picker and the queued-change sentence reachable and announced, so that the disclosure is a disclosure for me too.

## Implementation Decisions

**Vocabulary.** *Dues Rate* — the amount an Activity charges for Dues in one Billing Period — enters `CONTEXT.md` under Money. *Dues* keeps its meaning as the member's obligation. The word "rate" appears in Admin-facing copy; member-facing copy keeps saying "Dues" with a figure and a month.

**Shape: a history, not a snapshot.** One rate row per (Activity, effective-from Billing Period), carrying the amount, the Admin who set it and when it was set. The rate for any Period is the row with the latest effective-from that is not after that Period. Every Activity has a beginning-of-time row — the same zero key `Membership.effectiveFrom` already uses — so every Period, however far back, resolves to something; the migration writes that row from each Activity's `monthlyFee` at migration time, and creating an Activity writes it thereafter. No cron and no per-month write: a Period arriving changes nothing in the database, only what the resolver returns. This is the shape payment-mode switching already has (`pendingMode` / `pendingEffectiveFrom`), chosen so Admins and code meet one idiom.

**Freeze rule.** A rate row whose effective-from Period has arrived is never updated or deleted. The route refuses with 409 and a reason, for every role including Owner. Immutability is a property of the Period.

**Queuing rule.** An Admin sets a new rate together with an effective-from Period: earliest the next Period, latest twelve Periods ahead; outside that range the route refuses. At most one queued (not-yet-arrived) row per Activity: saving again replaces it, and withdrawing deletes it. The current rate is never the thing being edited — only the future one.

**Resolution is one pure function**, taking the Activity's rate rows and a Billing Period, returning the amount. Every read goes through it; no other code compares Periods to rate rows.

**Reads that move off the live field**, each resolving against the Period it is about:

- Proof upload: the Period the member chose (any month from 2020 to one year ahead, as today). The amount stays server-authoritative; the client never sends it.
- Confirm dialog shortfall note: the Payment's own Period. Still warns, never blocks.
- Admin dashboard total due: the current Period.
- Member-facing copy — dashboard dues banner, payments page figures, session page and RSVP flow, profile, join-mode dialog, upload form, landing and public board: the current Period unless the surface is about a chosen Period.
- Activities register value and its sort: the current Period.
- The reserve route's bill behind a hold for a Monthly member: the Period of the Session being reserved. (Inspected at the grill: the `?? fee` there is a null guard on a missing Activity, not a monthly-for-Fee substitution — no defect to file.)

**Expand–contract.** Add the rows, the resolver and the migration with its seed first; move every read; drop `monthlyFee` last, with a build that has no reference to it. The minimum-fee gate keeps its meaning: a Period whose rate is below the minimum is a Period in which Dues cannot be paid, as today.

**Admin form.** The Activity form's Dues field gains a Period picker limited to the allowed range and defaulting to the next Period. Beneath the field, a sentence at Body size in Secondary Ink tied to the field: the current rate, and — when one is queued — the queued figure and its month, with a Withdraw action beside it. Per `DESIGN.md`, a condition beneath a control is disclosed at Body, never Caption. The Activities register prints the current rate and carries no marker for a queued change: a queued change is not a standing.

**Member notice.** The dashboard dues banner carries one sentence per Activity with a queued change, for members whose Payment Mode for the effective Period resolves to Monthly (a pending switch to Monthly that lands by then counts). The upload form states the rate for the chosen month. Nothing on the payments page.

**Email.** Three triggers — queued, replaced, withdrawn — to the same set of members, through the existing bilingual template layout, best-effort after the response and never thrown, like every template today. The withdrawn message names the figure that stays.

**Permissions** unchanged: the rate is edited through the Activity update path, Admin and Owner only.

**ADR 0002** records: history over snapshot; next Period as the earliest effective-from; one queued change; why the live field is removed rather than kept as a cache.

## Testing Decisions

A good test asserts what a member or an Admin can observe — the amount a Payment records, a 409 from the route, a sentence on a surface, an email queued — never how the rows are stored.

- **The resolver is pure and gets Vitest**, under the existing pure-logic tests: before the effective Period the old rate; at it and after it the new one; a Period before any row resolves to the beginning-of-time row; two rows never share an effective-from. Prior art: `member-standing.test.ts`, `session-lock.test.ts`.
- **Everything else is `TC-DR-*` in `TESTING.md`**, following the `TC-AR-*` conventions (P0/P1/P2, Positive/Negative/Edge, preconditions, numbered steps, expected result with HTTP status), executed and recorded in a dated run:
  - P0 — upload for the current Period, a Period with a queued rate, and a past Period each records that Period's rate, asserted from the database.
  - P0 — effective-from at the current or a past Period, and beyond twelve ahead, refused by the route.
  - P0 — editing or deleting an arrived rate refused, as Admin and as Owner.
  - P0 — migration: one seeded row per Activity equal to the old `monthlyFee`; existing Payments unchanged; the column absent after the contract step.
  - P1 — replace and withdraw a queued change, the disclosure following each; a new Activity has a rate from creation.
  - P1 — shortfall note against the Payment's Period across a rate change.
  - P1 — dashboard total due across a month rollover.
  - P1 — banner shown only to members resolving Monthly for the effective Period, absent for per-Session members, gone once the Period arrives.
  - P1 — email on each of the three triggers, none when email is unconfigured, in both locales.
  - P1 — member PATCH of a rate refused 403.
  - P1 — both locales; keyboard traversal and announcement of the picker and the disclosure.
  - P2 — Activities register value and sort by current rate.

## Out of Scope

- A schedule of several queued changes. One at a time; a second save replaces.
- Reconciling Payments recorded before a rate change. They stand as recorded; pending ones surface through the shortfall note against the new rate.
- Any change to the payments page.
- Backfilling ADRs for the payment-mode rules the code cites as AD-7, AD-8 and AD-13.
- Per-Session Fees, payment-mode resolution and graduation, Billing Period keys, Confirm/Reject behaviour, refunds or credits.

## Further Notes

Decision record from the grill, 2026-08-29, so none of it is relitigated at ticketing:

- Name: Dues Rate. Shape: rate history mirroring `pendingMode`. Edit: Admin chooses the effective-from Period, next to twelve ahead. `monthlyFee`: removed by expand–contract. Upload charges the rate of the Period paid for. Form: one field, picker, disclosure beneath. Run slug `dues-rate`, one spec. Tests: Vitest resolver plus `TC-DR-*`.
- Shortfall note compares against the Payment's Period. Dashboard total due resolves through the current Period. Reserve route re-inspected: its fallback is a null guard, nothing to file; it resolves against the Session's Period. ADR 0002 written in the schema ticket.
- One queued change at a time. Seed row at beginning-of-time. Rate rows record who and when. Register shows the current rate only. Members see queued changes on the dashboard banner and the upload form, Monthly-resolving members only. Email on queue, replace and withdraw. Sort by Dues kept.

Seams under test: the pure resolver (new, the only new seam); the Activity update route, the Proof upload route and the email transporter (existing). No new seam elsewhere.

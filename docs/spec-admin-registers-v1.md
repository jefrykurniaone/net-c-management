# Spec: admin registers — Payments queue and No-Show recording

| | |
|---|---|
| Spec | [#30](https://github.com/jefrykurniaone/net-c-management/issues/30) — `spec:admin-registers` |
| Run | `run:admin-registers` |
| Execution map | pending — filled in when the map issue is created |
| Version | v1 (spec revision 2, 2026-08-28) |
| Depends on | [#28](https://github.com/jefrykurniaone/net-c-management/issues/28) design system (closed), [#29](https://github.com/jefrykurniaone/net-c-management/issues/29) member surfaces (closed) |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Depends on #28 (closed) for the design system and on #29 (closed) for the member-side rendering of the Hollow mark. Both have landed; nothing blocks this spec.

Repo copy: `docs/spec-admin-registers-v1.md`. Execution map: see the `run:admin-registers` label.

Revision 2, 2026-08-28: amended after the grill that preceded ticketing. Stale references fixed, the decisions from that grill folded into the sections they belong to, and a decision record added at the end so none of them is relitigated.

## Problem Statement

The admin side is where the community's money actually gets decided, and it is the least designed part of the product.

1. **The Payments queue is not a queue.** It is a list. Payments awaiting a decision are not ordered first, so the Admin scans past Confirmed and Rejected rows to find the ones that need them. There is no Proof thumbnail column, so confirming a Payment means opening each Proof individually, deciding, coming back, and finding their place again. The single highest-frequency admin job — look at a bank transfer screenshot, decide, move on — has no affordance built for it.
2. **No-Show cannot be recorded at all.** The attendance vocabulary has three values, and the one meaning "released their Seat" is doing double duty for "did not turn up". An Admin who marks a member absent for not showing releases the Seat and files it as the member's own choice. The distinction the glossary draws — Opted Out is a decision, No-Show is the absence of one — is invisible in the data, so no Admin can act on the difference and nobody can count it.
3. **Admin surfaces are desktop work rendered in a mobile-first card idiom.** Sessions, members, activities and payments are dense, comparative, multi-column jobs, presented as stacked cards with the same coloured-swatch livery the design system bans. The Applicants surface, added after the first revision of this spec, is the same shape.
4. **Taking attendance is buried in the Session edit form.** Recording who turned up is a different job from changing a Session's time and venue, and today it lives inside the form for the latter, one write per click, with no way to save the whole list at once.

## Solution

Rebuild the admin surfaces in the Papan Jadwal world as what they are: a **register**, read at a desk, on a wide screen, by someone making decisions about money.

The Payments queue becomes a real queue — awaiting-decision first, with a Proof thumbnail in its own column so the Admin can decide most Payments without leaving the row, and confirm or reject from the row through a short confirmation step. The remaining surfaces become ruled registers: one row per thing, tabular figures down the money columns, standing as a mark in its own column, and every state identified by form before colour so a queue of forty rows is scannable at a glance. All of them compose one shared register component, so there is one table idiom in the product rather than six hand-rolled ones.

**No-Show becomes recordable.** A fourth attendance value is added, distinct from Opted Out, carrying the **Hollow** mark the system spec already shipped without a producer. It is recorded by an Admin explicitly and is never derived from a Session ending with rows still Registered — deriving it would brand a member a No-Show because an Admin forgot to take attendance, and "nobody decided" is precisely what the state means.

**Attendance gets its own register.** Each Session has an attendance register reached from the Sessions register, listing every Participant with a four-state control, saved as one write for the whole list.

## Goals and success criteria

Goals:

- An Admin clears a queue of forty Payments from one screen, deciding most of them from the thumbnail, with a confirmation step on every decision and a plain-language statement of the Seat consequence before a monthly Reject.
- An Admin records No-Show deliberately, and the record changes no money and no capacity.
- Every admin surface is a ruled register composed from one shared component, readable at 1440px and usable at 390px, in both locales, by keyboard.
- Owner immutability and Owner contact privacy are visible in the product rather than discovered by a refused edit.

Non-goals: any change to how money is resolved (payment mode, Billing Period, Dues amounts), any refund or penalty logic, any renaming of stored enum values, and any member surface.

Success criteria — the run is done when:

- The manual test suite for this spec (`TC-AR-*` in `TESTING.md`) has been executed and recorded, with every P0 case passing, on both locales and at both widths.
- Rejecting a monthly Payment still deletes only that member's Registered rows for the month, and a No-Show row survives it — asserted from the database, not the screen.
- Capacity figures on every Session are unchanged after No-Show rows exist.
- No admin surface renders a card shell, a coloured swatch or an accent line, and no admin string is English-only.
- The completion gate on the execution map passes on `main` after the last merge.

## User Stories

1. As an Admin, I want Payments awaiting a decision listed first, so that my queue is the top of the page rather than something I search for.
2. As an Admin, I want to see each Proof as a thumbnail in the row, so that I can decide most Payments without opening anything.
3. As an Admin, I want to open a Proof full-size when the thumbnail is not enough, so that I can read a blurry transfer reference.
4. As an Admin, I want to Confirm or Reject from the row, so that deciding forty Payments is forty decisions and not forty page loads.
5. As an Admin, I want the amount and the Billing Period on every Payment row in tabular figures, so that I can compare the Proof against what the row says without arithmetic.
6. As an Admin, I want the Billing Period on every monthly Payment, so that I do not confirm this month's Dues against last month's obligation.
7. As an Admin, I want to know which Activity's bank account a Payment was sent to, so that I can check it against the right statement.
8. As an Admin, I want a Rejected Payment struck through in the register, so that a decision I already made does not look like one I still owe.
9. As an Admin, I want to know what rejecting a monthly Payment will do to that member's Seats before I do it, so that I am not surprised by seats disappearing.
10. As an Admin, I want a confirmation step on every Confirm and every Reject, so that I cannot decide a member's money with one mis-click, and so that an amount that looks low is pointed out to me before I accept it.
11. As an Admin, I want to record that a Participant did not turn up, so that the community has a record distinct from members who withdrew properly.
12. As an Admin, I want No-Show to be visibly different from Opted Out, so that I am never blaming a member who told us in advance.
13. As an Admin, I want No-Show to be something I record deliberately, so that a Session I forgot to take attendance for does not silently accuse everyone who signed up.
14. As an Admin, I want to set attendance across the whole Participant list and save it once, so that taking attendance after a game does not take longer than the game and cannot half-save.
15. As an Admin, I want a No-Show record to leave the money alone, so that recording the truth is never also a billing decision.
16. As an Owner, I want No-Show counts visible per member, so that I can have a conversation with a repeat offender based on a record rather than a memory.
17. As an Admin, I want the Sessions register to show capacity and committed counts per Session, so that I can see which Sessions are at risk of not covering their cost.
18. As an Admin, I want the cost-sharing viability floor shown as committed-versus-needed, so that I can decide whether to cancel a Session before the day.
19. As an Admin, I want to post, edit, and cancel a Session from the register, so that the common jobs are where I am already looking.
20. As an Admin, I want a cancelled Session struck through everywhere, so that I do not re-open a decision I already made.
21. As an Admin, I want the Members register to show each member's Activities, payment mode, and standing, so that I can answer a member's question without opening four screens.
22. As an Admin, I want an Owner account to be visibly immutable, so that I do not waste time attempting an edit the system will refuse.
23. As an Admin, I want an Owner's contact details hidden from me, so that the privacy rule is enforced by the product rather than by my restraint.
24. As an Admin, I want the Activities register to show price, weekly slot, capacity, and destination bank account together, so that I can audit an Activity's setup in one read.
25. As an Admin editing an Activity, I want no colour picker, so that I am not asked to make a decision the design system has already made.
26. As an Admin, I want each Activity identified by its initial on a tile, so that the register is scannable without colour.
27. As an Admin, I want community Settings to look like the rest of the board, so that the white-label configuration screen is not the one page from the old product.
28. As an Admin, I want the export routes to keep working unchanged, so that whatever I do with the data outside the app does not break.
29. As an Admin on a wide screen, I want density rather than whitespace, so that I can see forty rows without scrolling.
30. As an Admin who occasionally works from a phone, I want the registers to collapse by axis into ruled rows, so that the screen is still usable in a pinch.
31. As an Indonesian-speaking Admin, I want every admin string in Indonesian, so that the management surfaces are not English-only.
32. As an Admin using a keyboard, I want to move through the queue and decide without a mouse, so that a long queue is fast.
33. As a member, I want an Admin's decision on my Payment to be reflected in my own view immediately, so that I am not left wondering whether they saw it.
34. As a developer, I want No-Show excluded from every place that treats a row as holding a Seat, so that adding a state does not quietly change capacity.
35. As a developer, I want No-Show preserved by the monthly-rejection cleanup the way the other historical states are, so that recording history does not make it deletable.
36. As an Admin, I want the Applicants surface to be a register like the others, so that Admit and Decline are not the one job left in the old idiom.
37. As an Admin, I want a Reject to require a reason, so that the member always learns why and I am never asked "what was wrong with it" later.
38. As an Admin, I want a Session's fee locked once anyone has paid or holds a Seat against it, so that the price on a Payment and the price on its Session can never disagree.
39. As an Admin, I want a Completed or Cancelled Session to be read-only apart from its notes, so that history is not rewritten by an accidental edit.
40. As an Admin, I want each Participant's attendance on a Session to be set from one register with one save, so that the list is either all saved or not saved at all.
41. As a developer, I want one shared register component that every admin surface composes, so that six tables cannot drift into six idioms.
42. As a developer, I want the Activity icon column removed, so that a field nothing writes and nothing renders stops being carried through every query.

## Implementation Decisions

Depends on the system spec (#28) for tokens, typography, the mark family, the mark resolver, and the livery. Depends on the member spec (#29) only for the member-visible rendering of the Hollow mark. Both have landed.

### No-Show: schema

- **A fourth attendance value is added** to the attendance status enum, via a numbered migration. `CLAUDE.md` governs: migrations, never a schema push.
- Its meaning is fixed by the glossary: held a Seat, did not withdraw, did not attend. It differs from Opted Out in exactly one way — nobody decided.
- **It does not hold a Seat.** The seat-holding set stays as it is, so capacity arithmetic is unchanged by definition rather than by adjustment. Every place that enumerates the seat-holding pair stays as it is; the new value simply is not in it.
- **It is preserved, not deleted, by the monthly-rejection cleanup — and this holds by construction.** The cleanup deletes only rows whose status is Registered; Present and Opted Out rows are never touched, and the new value falls on the same side without a code change. The requirement is therefore a test, not an edit: the regression case asserts from the database that a No-Show row survives a monthly Reject. The cleanup itself is not moved or refactored in this spec (see the decision record).
- **It counts as history in admin aggregates.** Any aggregate that currently counts the two historical states counts three.
- **Export is unchanged.** The Session export writes the stored status value as it is, so a No-Show row exports as its stored name alongside the others. The glossary rule that the stored "absent" value never surfaces as "Absent" is a rule about user-facing copy, not about machine-readable exports.
- No money logic changes. A per-Session Participant who no-shows has already paid; a Dues Participant who no-shows forfeits that Session the same way Opting Out forfeits it. There is no refund, no credit, and therefore no billing decision hiding inside this feature. That is deliberate and keeps the migration cheap.
- **An ADR records the decision.** Adding a fourth attendance value is hard to reverse, surprising next to a stored value that already reads as "absent", and the outcome of a real trade-off against renaming that value. The ADR is the first in the repository and is numbered from 0001. The decision-ID series cited in code comments (`AD-`, `FR-`, `NFR-`, `OBS-`, `UX-DR`, `BUG-`) refer to a requirements document that lives outside the repository; they are not ADRs, they are left as they are, and the ADR says so.
- The `CONTEXT.md` glossary entry for No-Show, which currently says "Not recorded anywhere yet", is updated when the value lands.

### No-Show: recording

- **Recorded explicitly by an Admin**, as a fourth option alongside the three existing attendance choices. The Admin's allowed set becomes Registered, Present, Opted Out and No-Show; the Maybe state stays excluded from what an Admin can set, as it is today.
- **Never derived** from "the Session ended and the row is still Registered". That inference blames the member for the Admin's omission, and the state's entire definition is that nobody decided. A Session with untaken attendance stays Registered and is an Admin problem, surfaced as such.
- **Attendance is taken on an attendance register of its own**, one per Session, reached from that Session's row in the Sessions register. It lists every Participant with a four-state control and a single Save. This replaces the attendance controls inside the Session edit form: editing a Session's time and venue and recording who turned up are different jobs, and the second lived inside the first only by accident.
- **Saving is one write for the whole list**, in one transaction, through a new bulk path that applies the same Admin check and the same allowed set as the existing single-row path. Rows the Admin did not touch are not written at all, so untaken attendance stays untaken and No-Show is never implied by a save. The existing "mark everyone Present" shortcut survives as a prefill that still needs Save. The single-row path is kept for one-off corrections.
- Renders as the **Hollow** mark — a dashed outline in the void colour, no fill: the shape of a tile that should have been filled. The system spec already ships this mark; this spec gives it its producer.
- The legacy enum member whose stored name reads as "absent" continues to mean Opted Out and continues to render as **Erased**. It is not renamed. Renaming a stored enum value used across attendance, payments, capacity, and export is a large, risky, purely cosmetic migration; the glossary and the copy carry the correct words instead. This is a decision, not an oversight.

### The Payments queue

- **Ordering is the feature.** Awaiting-decision Payments first, then the rest by recency. The current ordering is what makes the screen a list instead of a queue.
- **A Proof thumbnail column.** Proofs are public storage URLs today and stay that way; the thumbnail is produced by the framework's image optimiser against the storage host, at a fixed small size, so forty rows do not become forty full-size downloads and no new serving route or storage plan feature is introduced. The full-size Proof opens from the row when the thumbnail is not enough.
- **Amount and Billing Period on every row**, in tabular figures. The amount on a Payment is set by the server when the Payment is created — from the Session's fee for a per-Session Payment, from the Activity's Dues for a monthly one — and the member cannot type it. Amount claimed and amount owed are therefore the same figure by construction, and the queue shows one amount column rather than two identical ones. The Admin's comparison is between that figure and the bank screenshot.
- **Confirm and Reject act from the row, each through a confirmation step.** Both decisions open a short dialog. The Confirm dialog restates the amount and Period and, when the Payment's amount is below the current price for that Activity, says so in plain words — it warns, it never blocks, because Admins accept partials and cash top-ups today and blocking would push them to falsify the amount. The Reject dialog requires a reason, which the member sees, and for a monthly Payment states what will happen to the member's Seats before the Admin commits.
- Standing is a mark in its own column: Tape awaiting a decision, Ink Confirmed, Strike Rejected with the amount struck through.
- **Keyboard traversal is plain tab order.** Each row is focusable, the row's actions are reachable in order, and the Proof opens with Enter. No single-key shortcuts: a one-key Confirm on a money row is a mis-press waiting to happen, and tab order already meets "no mouse".

### Registers

- Admin surfaces are **desktop-first**, the inverse of the member side, because the work is comparative and multi-column. They are ruled registers: one row per thing, shared rules, tabular figures, no cards.
- **One shared register component is the seam**, built before any surface is rebuilt on it, the way the Slot Cell is the seam for a Session on the member side. It owns the ruled table, the tabular-figure columns, the mark column, the axis collapse below the breakpoint, and the empty state. Payments, Sessions, Members, Applicants, Activities and Settings all compose it. Six hand-rolled tables would drift apart the same way two card renderings would.
- The mobile card components currently used for these surfaces are replaced by axis collapse — ruled rows — inside that shared component, not retained as a parallel implementation. The shared card shell goes with them.
- The coloured accent on the mobile cards goes with them; it is the banned accent-line device.
- Capacity, committed counts, and the cost-sharing viability floor surface per Session in the Sessions register, reusing the existing quota helper rather than recomputing.
- **The Applicants surface is a register too.** It arrived after this spec's first revision and is included so that Admit and Decline are not the one job left in the old idiom. Its vocabulary is Admit / Decline, never Confirm / Reject.

### Sessions: locking

- **A Session's fee is frozen once money is behind it.** Per-Session prices are already per-Session: each Session carries its own fee, copied from the Activity when it is posted, so a later change to the Activity touches no existing Session. What is not yet enforced is that an Admin cannot edit that fee afterwards. From this spec: once a Session has any Payment or any held Seat, its fee is read-only, and its capacity cannot be lowered below the Seats already held.
- **A Completed or Cancelled Session is read-only** apart from its notes. History is not rewritten by an accidental edit.
- Both rules are enforced server-side and merely reflected in the register; a disabled control is a courtesy, the refusal is the rule.

### Members and Owner

- Owner immutability and Owner contact privacy are existing rules and are **enforced server-side already**; this spec makes them *visible* rather than implementing them. An immutable account looks immutable; hidden contact details are shown as withheld, not as blank.
- The Owner carries no capability an Admin lacks. It is an immutability and privacy marker, not a capability tier, and the register must not imply a hierarchy of power.
- The role treatment is the tracked-caps label from the system spec, not a mark. A role is a standing property of a person, not a state of a thing.
- **The Owner rules are written down.** A code comment points at an Owner-role immutability document that does not exist in the repository. The document is recreated at the path the comment names, with the rules re-derived from the code that enforces them: an Owner account is refused any modification by anyone; an Admin never sees an Owner's contact number; an Owner sees both Admins' and their own.
- **"Standing" on the Members register means the member's Dues state for the current Billing Period**, per monthly Membership: Ink when Confirmed, Tape when awaiting a decision, Blank when nothing has been sent. A per-Session Membership carries no standing mark, only its mode label — there is no monthly obligation to be in good or bad standing on.
- **No-Show counts live on the member's detail page**, not as a register column. The register already carries Activities, mode and standing; the count is a conversation aid, and the detail page is where that conversation is prepared.

### Activities

- **The colour picker is already gone.** The system spec owned the whole removal — the column, its type member, its validation rule, and the admin form control. This spec inherits that and only asserts that no admin surface renders a default or broken swatch in its place.
- **The Activity icon column is removed**, via a numbered migration. Nothing writes it — the Activity form has no icon control — and nothing paints it — the livery component accepts it and ignores it in favour of the initial tile. It is carried through queries and row types purely by inertia. The Activities form is being rebuilt in this spec anyway, so this is the cheapest moment to drop it.

### Constraints carried through

- All copy through the dictionary, both locales, no hardcoded strings. The admin dictionary is one flat block per locale; every ticket appends to it and none reorders it.
- WCAG 2.1 AA; state never carried by colour alone. A dense forty-row queue is where colour-only status hurts most.
- Every touched file clean in the editor diagnostics channel — TypeScript, ESLint, SonarLint — findings fixed, never suppressed.
- Prisma array filters take an explicitly typed array rather than a const assertion. The repository has already been bitten by this; a readonly array does not satisfy a Prisma `in` filter.

## Testing Decisions

Manual test cases only, as a new numbered suite in `TESTING.md` — the file where every existing suite lives (the design-system suite `TC-DS-*` and the member-surface suite `TC-MS-*`). No test framework is introduced. The new suite is `TC-AR-*` (admin registers), following the same conventions: P0/P1/P2, Positive/Negative/Edge, preconditions, numbered steps, expected result with HTTP status, and a recorded run at the end.

**What makes a good test here.** Test what the Admin can see and decide. "Payments awaiting a decision appear above decided ones" is a test. "The query orders by status" is an implementation detail that passes while the queue is still unusable.

**Prior art.** The existing admin sections of `TESTING.md` (session management, payment review, activity management, member management, community settings) are plain numbered steps without case ids and were explicitly not re-run by the member-surface run because they belong to this spec; they are the raw material for `TC-AR-*`. The member-surface case `TC-MS-017` already documents the rule this spec must not break: rejecting a monthly Payment deletes that member's Registered attendances for the month while Present and Opted Out rows survive. That case is **amended**, not just re-run, so that it also asserts a No-Show row survives.

**What gets covered.**

- **The enum change, as P0 cases**, because this is the only part of the redesign that can lose data:
  - recording a No-Show and confirming capacity is unchanged afterwards;
  - rejecting a monthly Payment and confirming No-Show rows survive while Registered rows for the month are removed;
  - admin aggregates counting all three historical states;
  - a No-Show record having no effect on any amount owed, Payment, or Seat.
- **No-Show is not derivable**: a Session whose end time has passed with rows still Registered stays Registered and surfaces as untaken attendance, not as No-Show. Negative case, and the one most likely to be "helpfully" implemented wrong.
- **Bulk save writes only touched rows**: a save with two rows changed leaves every other row's status and timestamps as they were.
- **Opted Out versus No-Show as distinct records and distinct marks**, reached through real flows: a member withdrawing, versus an Admin recording a no-show.
- Queue ordering with a mixed set of standings, including the boundary where nothing is awaiting a decision.
- Proof thumbnails: a valid image, a Payment with no Proof, a Proof that fails to load, and the queue's own load weight with a realistic number of rows.
- Confirm and Reject from the row, each through its dialog: the Confirm dialog warning on a low amount without blocking; the Reject dialog refusing an empty reason and naming the Seat consequence; the member's own view reflecting the decision.
- Session locking: a fee edit refused once a Payment or held Seat exists; a capacity edit refused below held Seats; a Completed Session refusing every edit but notes.
- Owner immutability and Owner contact privacy as an Admin sees them, and as an Owner sees themselves.
- The Activity form with no colour control and no icon control, and no default swatch rendered anywhere in its place.
- Export routes unchanged, including a session export containing all four attendance values.
- Both locales across every admin surface; keyboard traversal of the queue in tab order.
- Registers at 1440px and collapsed at 390px.

**Regression risk to watch explicitly.** Adding an enum member touches capacity, the rejection cleanup, aggregates, export, and the attendance write path. Every one of those is money- or history-critical. The existing sessions and payments suites should be re-run in full after the migration, not sampled.

## Out of Scope

- Every member surface. That is the member spec; this spec only makes the Hollow mark producible.
- The design system itself — tokens, typography, marks, the resolver, the livery. That is the system spec.
- **Renaming the legacy attendance enum member** that reads as "absent" but means Opted Out. Decided against above.
- Any change to payment-mode resolution, period keys, current-period immutability, mode graduation, seat locking, or monthly attendance synchronisation.
- **Freezing Dues per Billing Period.** Surfaced during the grill and captured as #62. It is a money rule that deserves its own spec; this spec's queue reads the amount already snapshotted on each Payment and needs nothing from it.
- **Moving the monthly-rejection cleanup out of its route handler** into the payments library, where the project guide says payment writes live. The drift is real, but that block is the likeliest place in the codebase to lose data, and moving it for tidiness inside a UI-heavy run is risk without payoff. Own chore, later.
- Automatic or scheduled No-Show detection. Explicitly rejected, not deferred by accident.
- Any refund, credit, or penalty attached to a No-Show. Recording the fact is the whole feature.
- The RSVP button's eleven props.
- Introducing a test framework.

## Further Notes

**No-Show is a genuinely new domain concept, not a rendering change.** `CONTEXT.md` records it as "not recorded anywhere yet", and that line becomes false when this spec lands — the glossary entry is updated as part of the enum ticket, alongside the ADR.

**The Activity icon question is closed.** Removed, in this spec, for the reasons in the Activities section.

**The two unresolved repository facts are resolved.** The decision-ID series in code comments point at a requirements document outside the repository; they stay, and the first ADR records that ADR numbering is independent of them. The missing Owner-role document is recreated from code.

**Vocabulary from `CONTEXT.md`**, restated because this spec is where the two easily-confused terms both become real:

- **Opted Out** — held a Seat and withdrew, releasing it. The member's own choice, never a judgement about them.
- **No-Show** — held a Seat, did not withdraw, did not attend. Differs from Opted Out in exactly one way: nobody decided.
- **Confirm / Reject** — the Admin's act of accepting or refusing a Payment after looking at its Proof. Not "approve", "validate", or "verify".
- **Admit / Decline** — the Admin's act on an Applicant. Never Confirm / Reject.
- **Owner** — an Admin whose account cannot be altered and whose contact details are hidden from other Admins. Carries no capability an Admin lacks.

**Prototype pointer.** `prototype/board-palette`, commit `4acbc06`, route `/prototype/board?variant=C` is the Ledger variant and is the closest existing render of what an admin register should look like. Throwaway code; do not promote it.

## Decision record

From the grill of 2026-08-28, with the reason for each, so none is reopened by an executor.

| Decision | Why |
|---|---|
| Dialog on both Confirm and Reject | A dialog is not a page load; a mis-click on money is. Confirm warns on a low amount and never blocks, because Admins accept partials in cash today. |
| Reject requires a reason | The member sees it, and `TC-MS-017` already expects a named reason. |
| One amount column, not claimed-versus-owed | The amount is server-set at creation, so the two figures are always equal. A second column would either duplicate or show a price change the Admin cannot act on. |
| Amount owed is the snapshot on the Payment, not the live price | Per-Session prices are already frozen per Session; monthly Payments snapshot the Dues at upload. Freezing Dues per Period is a separate rule, captured as #62. |
| Session fee locked once money is behind it; Completed and Cancelled read-only except notes | Closes the one remaining way a per-Session price can drift from money already sent. Cheap and server-enforced. |
| Bulk attendance is one transactional write, untouched rows never written | A client fan-out can half-save on a dropped connection; a transaction cannot. Not writing untouched rows is the "never derived" rule applied to the save. |
| Attendance register separate from the Session edit form | Different job, different moment. |
| One shared register component before any surface | Six tables drift the way two card renderings would; the Slot Cell precedent already exists. |
| Applicants included | Otherwise it is the one page left in the old idiom, the same argument as Settings. |
| Members "standing" = current Period Dues state per monthly Membership | Anything richer belongs on the detail page. |
| No-Show count on the detail page only | The register is already dense; the count serves a conversation, not a scan. |
| Thumbnails via the framework's image optimiser | No new route, no storage plan dependency, the service-role boundary does not move. |
| Keyboard is plain tab order, no single-key shortcuts | A one-key Confirm on a money row invites a mis-press. |
| Export keeps raw stored values | Stable machine values; the "never surfaces as Absent" rule is about copy. |
| Monthly-reject cleanup not moved | Preservation of No-Show holds by construction; moving money code for tidiness is risk without payoff. |
| ADR 0001 for No-Show; legacy decision-ID series left alone | They reference an external document; stripping them loses the pointer for anyone who has it. |
| Owner doc recreated at the cited path | Comment stays true; policy, not architecture, so an ADR is not warranted. |
| Activity icon removed | Never written, never painted; the form is open anyway. |
| Docs mirror for this spec only, no backfill | Backfilling #28 and #29 is history, not this run's work. |

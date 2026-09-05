# Spec mirror: members see only posted Sessions

Point-in-time copy of issue #325, written 2026-09-05, before any of its tickets ran.
Delivery run `sessions-by-activity`. Map: #336.
Its own run falsifies claims written here; whoever closes the run marks them in a Delivery record
section rather than editing this body. Citations address the code as it stood on 2026-09-05 and
are never renumbered.

---
## Problem statement

Member surfaces draw cards for sessions that do not exist. When an activity has a recurring weekday set, both the sessions page and the dashboard invent a card on every matching calendar day where no session row has been created, label it with the activity's name and its standing time, and mark it "an admin has not posted this session yet". Nothing can be done with such a card: it does not open, it cannot be reserved, and it has no seats.

Two things are wrong with it. The first is that it is noise — a member reading the page has to sort real dates from placeholders that look almost identical. The second is a defect: the rule that invents the placeholder is deliberately wider than the rule that creates real sessions, so an activity with a recurring weekday but not set up for monthly billing shows a phantom card on that weekday forever. Nothing will ever post it, and no amount of admin action makes the card go away.

## Solution

Members see sessions that exist, and nothing else. The invented placeholder is removed from both member surfaces. A day with nothing on it reads as having nothing on it; an activity with nothing scheduled reads as having nothing scheduled.

Nothing else about the surfaces changes. Every real session keeps its card, a cancelled session is still a real session and is still shown as one, and no number a member sees moves — the placeholder never carried seats, a quota, a fee or an attendance record, because there was no session behind it to carry them.

## Goals and non-goals

Goals: stop synthesising sessions that do not exist; apply this to every member surface that currently does it; remove the code that synthesises them rather than leaving it behind a switch; retire the copy that exists only to explain a placeholder.

Non-goals: any change to what a real session shows or does. Any change to admin surfaces, which never consumed the placeholder. Any change to how sessions are generated or posted. Any change to seats, quotas, dues, attendance or the payment hold.

## User stories

1. As a member, I want the sessions page to show only sessions that exist, so that I am not reading placeholders that look like dates I could turn up to.
2. As a member of an activity that is not currently running sessions, I want its section to say so plainly, rather than showing a card for a session nobody has posted.
3. As a member, I want a day with nothing on it to read as empty, so that "nothing here" and "something is here but you cannot use it" stop looking alike.
4. As an admin, I want the member view to reflect what I have actually posted, so that members do not ask about sessions I never scheduled.

## Implementation decisions

**"Unposted" is not a state a session can be in.** There is no draft status and no publish action anywhere in this product. The stored status values are scheduled, ongoing, completed and cancelled, and a cancelled session is a posted one. What the code calls an unposted slot is the *absence* of a row, synthesised at read time by matching an activity's recurring weekday against a calendar day with no session on it. Understanding this is what makes the change safe: removing it removes an invention, not a record.

**The synthesising function is deleted outright, not gated behind a caller flag.** After this work no caller wants it: both member surfaces stop drawing placeholders, and admin never consumed them. The day-kind field it feeds is already read by nothing in production code. A flag nobody sets is dead code with an on-switch, and the next reader cannot tell whether it is a feature or a leftover.

**The change applies to the sessions page and the dashboard together.** The dashboard runs the same day builder per activity and flattens placeholders into its activity cards. A placeholder is wrong there for exactly the reason it is wrong on the sessions page, and hiding it on one surface only would leave the defect visible on the other. The sessions page's layout change is a separate concern; this one is about what the data says, on both.

**Each surface's existing empty state absorbs the gap, and neither goes blank.** Where a placeholder was the only thing on a day, the day falls to the empty state the surface already draws. Where placeholders were the only cards for an activity, the activity's existing "nothing upcoming" sentence is what shows. Both already exist and are already translated; no new empty state is invented.

**One copy key dies with the placeholder; two related ones must survive.** The sentence explaining that an admin has not posted a session yet has no other use and goes. The neutral chip label it sat next to must stay: the public landing page reuses it for a different fact — an activity with no next scheduled date — and a test asserts it ships non-empty in both locales. A third key describing an empty day is already dead in the codebase, referenced by nothing; it is removed at the same time as an unrelated tidy, and that is stated plainly rather than smuggled in.

**Test cases go with the code they cover.** The day builder's suite has cases asserting that a recurring weekday with nothing posted is marked as a placeholder, that a placeholder disappears once a session exists, that a cancelled session counts as posted rather than as a placeholder, and that placeholders sort against posted sessions by time. Those assert behaviour that no longer exists and are deleted with the producer. The suite's remaining cases — every day of a range appearing once and in order, month and year boundaries, the stored UTC calendar day read as itself, an inverted range yielding nothing — are untouched and must still pass.

**A second, unrelated producer of the same chip stays.** A posted session whose seat count cannot be resolved also resolves to that neutral chip. That path is about a real session and is not what this work removes.

## Testing decisions

A good test here asserts what comes out of the day builder for a given set of activities and sessions — never what a component renders. The seam is the existing pure day-range builder, and it already has a suite; this work removes the cases that assert the invention and leaves the rest.

One case is worth adding rather than only deleting: an activity with a recurring weekday and no sessions in the range yields no entries for that activity, which is the defect above stated as a test.

No component test is added, consistent with this repository's deliberately narrow, pure-logic coverage. The two surfaces are proved by a runtime walk at merge.

The copy-key removals are covered by the existing structural test that asserts both locales carry the same key set.

## Success criteria

- A member viewing an activity with a recurring weekday and no posted sessions sees no card for it on either the sessions page or the dashboard.
- An activity with a recurring weekday that is not set up for monthly billing produces no card on any member surface, at any date.
- Every posted session, cancelled ones included, still appears with the same card it has today.
- Seats, quota, fee, dues coverage and attendance figures are identical before and after, for every session a member can see.
- The dashboard's counts of upcoming sessions and attendance are unchanged.
- Admin surfaces are unchanged.
- The neutral chip label still renders on the public landing page for an activity with no next date.
- The day builder's remaining test cases pass unchanged.

## Out of scope

Introducing a draft or unpublished session state. Any change to the recurring generator or to how an admin posts a session. Any admin-facing view of what has not been scheduled. The sessions page layout. Copy rewriting beyond the keys named above.

## Further notes

Facts established while grilling, true as of 2026-09-05, each an address at the time of writing: the synthesising function is `unpostedSlots` at `src/lib/board-days.ts:240-257`, with the day-kind derivation at `:268-271`; the stored status values are at `prisma/schema.prisma:21-26`; the width mismatch that causes the permanent phantom is `src/lib/recurring-sessions.ts:64` against `src/lib/board-days.ts:208-214`; the two callers of the day builder are `src/lib/sessions-board.ts:359` and `src/lib/dashboard-sessions.ts:195`; the dying copy key is `sessions.boardNotPosted` at `src/lib/i18n/dictionaries.ts:542` and `:1812`; the key that must survive is `chips.unposted` at `:1418` and `:2511`, asserted by `src/lib/__tests__/status-chip.test.ts:131-143` and reused by `src/components/landing/activities-band.tsx:153`; the already-dead key is `sessions.boardNothingOnDay` at `:541` and `:1811`; the affected test cases are in `src/lib/__tests__/board-days.test.ts` at `:89-102`, `:119-136`, `:138-149`, `:236-241`, `:243-249` and `:251-273`; the second chip producer is `src/lib/session-standing.ts:135`.

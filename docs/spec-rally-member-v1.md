# Spec: Rally member surfaces — week strip, session cards, dashboard and payments as cards

| | |
|---|---|
| Spec | [#144](https://github.com/jefrykurniaone/net-c-management/issues/144) — `spec:rally-member` |
| Run | `run:rally` |
| Execution map | [#175](https://github.com/jefrykurniaone/net-c-management/issues/175) |
| Tickets | #159–#163 — sub-issues of #144 |
| Version | v1 (2026-08-30) |
| Grilled from | the request to restyle the app after the Playbypoint case study |
| Depends on | [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) (foundation); renders `Activity.icon` from [#145](https://github.com/jefrykurniaone/net-c-management/issues/145) when present. Binding ADR: [0003](adr/0003-retire-papan-jadwal-for-rally.md) |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-08-30 as part of run `rally`. Depends on the foundation spec (`spec:rally-foundation`) for tokens, type roles, chips and pattern primitives. Reads `Activity.icon` if the admin spec has landed, and falls back to the initial tile if it has not.

Repo copy: `docs/spec-rally-member-v1.md` (PR #147). Execution map: #175. Tickets: #159–#163, linked below as sub-issues.

## Problem Statement

Member surfaces are built as one ruled column of day rows — the week read downward, every Session a fixed three-column row, every state a mark on the right edge. That was the notice board. The owner wants the reference's arrangement instead: cards. A week you can see across, Sessions as rounded cards under their day, a dashboard of stat cards and Activity cards, payments as a card list, a profile in cards. The information the member needs is unchanged — which day, which Activity, how many Seats, whether their money is behind their Seat — but it must be arranged as floating cards on a page ground, not as rows sharing rules.

## Solution

Rebuild every member surface as a card layout in the Rally look. The sessions surface becomes a **week strip**: seven day columns for the chosen week on a wide screen, each day's Sessions as cards under its heading and a dashed empty slot where nothing is posted; one column on a phone with the day headings in sequence. The dashboard becomes stat cards, a dues notice card, and one card per Activity carrying its upcoming Sessions. Session detail, the pay flow, the payments history and the profile are re-laid as cards. Every surface composes its own card markup (the owner chose this over a shared card component); the server-side resolvers that decide state and the available action remain shared and unchanged.

## Goals and success criteria

Goals:

- A member answers "when do I play this week and is my Seat safe" from the week strip in one look, on a phone and a laptop.
- Every member surface is a card layout on the Rally tokens with no row, rule or mark left.
- Nothing about Seats, holds, Payments or Dues behaves differently; only the drawing changes.

Non-goals: new member features, any change to reservation or payment rules, charts (the insights spec), navigation restructuring (top bar and bottom rail stay).

Success criteria — this spec is done when:

- The week strip renders seven columns at 1440×900 and one column at 390×844, with every day of the chosen week present, empty days as a dashed slot, Sessions as cards, and the same claim / withdraw actions the rows offered.
- Dashboard, session detail, pay, payments history and profile render as cards in both themes and both locales with no visual regression in the information shown.
- The existing member behavioural test cases pass unchanged (the `TC-MS-*` behavioural cases; the geometric ones are superseded by the foundation spec).
- The new `TC-MW-*` manual suite has been executed and recorded.

## User Stories

1. As a Member, I want to see the whole week as seven day columns, so that I can plan which days I play.
2. As a Member, I want each Session as a card showing time, Activity, venue and free Seats, so that I do not have to open it to decide.
3. As a Member, I want to claim a Seat from the card, so that the commonest thing I do takes one tap.
4. As a Member, I want to withdraw from a Session from the same card, so that releasing my Seat is as easy as taking it.
5. As a Member, I want to see a labelled chip when my Seat is held on unpaid money, with the deadline, so that I pay before I lose it.
6. As a Member, I want an empty day to show as an empty slot rather than vanish, so that I notice when nothing is posted.
7. As a Member on a phone, I want the week as a vertical list of days with their cards, so that I never scroll sideways.
8. As a Member, I want to move to the previous or next week and back to this week, so that I can see what is coming.
9. As a Member, I want to filter the strip by Activity, so that a member of one Activity sees only theirs.
10. As a Member, I want a full Session to show a "full" chip instead of a join action, so that I do not tap something that will fail.
11. As a Member, I want a cancelled Session to be visibly void on its card, so that I do not turn up.
12. As a Member, I want my dashboard to open with a few large figures (upcoming Sessions, attendance rate, dues status), so that I know where I stand.
13. As a Member, I want a clear card when my Dues are unpaid or a queued Dues change is coming, so that money surprises never happen.
14. As a Member, I want one card per Activity on the dashboard showing its next Sessions, so that I see each Activity's week at a glance.
15. As a Member, I want the Session detail page to show facts, players and my action as cards, so that a shared link opens on something readable.
16. As a Member, I want the pay flow to show the amount, bank account and proof upload as one clear card sequence, so that paying is unambiguous.
17. As a Member, I want my payments history as cards grouped by period with chips for status, so that I can find a rejected Payment fast.
18. As a Member, I want my profile — avatar, contact details, memberships and payment mode — as cards, so that editing one thing does not look like editing everything.
19. As a Member using a screen reader, I want each Session card announced with its day, time, Activity and status label, so that the card grid is navigable.
20. As an Indonesian-locale Member, I want every new string translated, so that nothing reads as English-only.

## Implementation Decisions

**Week strip.** Seven equal columns at the large breakpoint; below it, one column with each day heading followed by its cards, in date order. Day heading carries the weekday label and the date figure. Each day's cards stack in start-time order; a day with nothing posted shows one dashed empty slot with a neutral chip and no text beyond the label. The strip is built from the existing day-range function that yields one entry per day of the range and never skips a day; the week navigation and Activity filter are the existing controls restyled.

**Session card.** Contents, top to bottom: start–end time (Figure), Activity icon tile or initial tile with the Session title, venue line (Caption), then a footer row with the free-Seats figure ("n free of max" with a spoken form) or a chip, and the action. The chip and the action come from the existing shared resolvers — the state-to-chip resolver and the action resolver that decides claim / withdraw / nothing — so no card decides state or permission on its own. Precedence for the footer's single chip is the resolver's: cancelled overrides everything; the member's own Seat state next (held, registered, present, no-show); then lifecycle (ongoing, completed); then full; else the figure. The whole card opens the Session detail; the action is a sibling of that link, never nested inside it, so both are reachable by keyboard and screen readers announce two things.

**Own card per surface.** Dashboard Activity cards, the week strip, and the session detail header each draw their own Session card markup (the owner decided against a shared card component). They must all resolve state and action through the shared resolvers; the design document records the drift risk and the one rule that keeps the cards recognisable — same information order, same chip position (footer, leading edge), same action position (footer, trailing edge).

**Dashboard.** Stat cards (upcoming Sessions, attendance rate, Dues status) in a row; the dues notice card when relevant (unpaid Dues, outstanding per-Session bills, queued Dues change); then one card per Activity: header with icon tile, name and payment-mode chip, body with that Activity's next Sessions as compact cards. Empty states are cards with the neutral chip and one sentence.

**Session detail.** Header card (Activity, title, date and time, venue, status chip), facts card, players card (avatars and names with attendance chips), and the action card (claim, withdraw, pay, or the reason none applies), in that order. The share and WhatsApp actions stay.

**Pay flow.** Amount card (read-only, server-set), bank account card, proof upload card, and the submit action; hold countdown as a chip with the deadline.

**Payments history.** Cards grouped by Billing Period heading, each Payment a card with Activity, type (Dues or Fee), amount, date and status chip; filters as chips above.

**Profile.** Identity card (avatar, name, phone), memberships card (one row per Activity with payment mode and the pending-mode notice), and the account actions card.

**Navigation.** Top bar (logo, community name, links, theme toggle, avatar) and the mobile bottom rail are restyled onto the tokens — active item on a Lime tile — with no structural change.

**Strings.** New labels (empty slot, "n free of max", week navigation, card headings) go into the member block of the dictionary in both locales.

## Testing Decisions

A good test checks what the member can see and do, not how a card is composed.

- **Vitest:** the day-range builder still yields every day of a week for the strip's inputs (existing tests stay green); the state-to-chip resolver and the action resolver are exercised for every combination the week strip renders (cancelled, own hold, own Seat, full, open, closed window). Prior art: the existing board-days, status-mark and slot-action tests.
- **Manual `TC-MW-*` suite (new section):** week strip at 1440×900 and 390×844 in both themes and locales; empty day rendering; every chip state on a card; claim and withdraw from the card with the server's refusal paths (stale row, closed window, full); dashboard, session detail, pay, payments history, profile in both themes and locales; keyboard order on a card (link, then action); screen-reader announcement of a card.
- **Superseded:** `TC-MS-*` cases asserting column positions, rules or marks; behavioural `TC-MS-*` cases stay live and must pass.

## Out of Scope

- Any change to reservation, hold, payment or Dues rules; the resolvers are consumed, not edited.
- Charts and sparklines on the member dashboard (spec `rally-insights`).
- A month calendar view or a flat upcoming list (decided against in favour of the week strip).
- A shared Session card component (decided against by the owner).
- Sidebar navigation for members (decided against; top bar and bottom rail stay).
- The Activity icon picker itself (spec `rally-admin`); this spec only renders the icon when present.

## Further Notes

**Column width is the constraint to watch.** Seven columns at the largest container are roughly 150–170 px each. The card stacks its content vertically for that reason; a chip never sits beside a figure on one line inside the card, and the longest chip label in either locale is the width to budget for.

**Empty days stay visible on purpose.** Skipping them turns the week into a short list and hides the fact that nothing is posted — the one thing an Admin most needs members to notice.

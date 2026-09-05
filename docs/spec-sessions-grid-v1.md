# Spec mirror: member sessions grouped by activity

Point-in-time copy of issue #324, written 2026-09-05, before any of its tickets ran.
Delivery run `sessions-by-activity`. Map: #336.
Its own run falsifies claims written here; whoever closes the run marks them in a Delivery record
section rather than editing this body. Citations address the code as it stood on 2026-09-05 and
are never renumbered.

## Delivery record — 2026-09-05, marked at the close of run `sessions-by-activity`

Run `sessions-by-activity` closed on 2026-09-05. The body below is unchanged and stays unchanged; this section marks the claims delivery falsified or settled. Nothing below is deleted, and no `path:line` citation has been renumbered.

Delivered by #328 (the grouping module, merged `c516919`), #329 (the glossary, merged `a964b9d`), #332 (the card and ADR-0018, merged `8eff6e6`) and #333 (the page rewrite, merged `af75bd9`).

| Claim in the body | State at close |
|---|---|
| "Section ordering: soonest upcoming session ascending, joined activities before others" | **Delivered with joined-before-others demoted to a tie-break.** `src/lib/sessions-by-activity.ts` orders sections by soonest upcoming session ascending and uses joined-before-unjoined only to break a same-day tie. Read as a primary key it would contradict this body's own reading at lines 16 and 31, where the thing happening next is at the top of the page; a joined activity meeting next week would then outrank an unjoined one meeting today. Activities with no upcoming session still sort last. |
| "A section with more than six upcoming sessions shows six and a link to the rest" | **Not exercised at runtime, and this is the one success criterion the walk could not settle.** No activity in the dev database has more than three upcoming sessions, and the run created no fixture to manufacture one. It is covered instead by #328's own cases (`caps a section at six cards and reports the true total`, `does not cap or truncate when a single Activity is selected`), and the page routes `isTruncated` to the see-all link at `?activityId=`, where `isSingleActivitySelected` lifts the cap. The wiring is proved; a member seeing seven dates is not. |
| "Week navigation and the `week` query parameter are removed entirely… No email, no landing page and no test reads it" | **Confirmed, and the enumerated reader list was complete.** `week-strip.tsx`, `week-strip-view.ts`, `week-session-card.tsx` and `board-week-nav.tsx` are deleted with nothing importing them; `resolveWeekStart`, `weekKeys`, `buildBoardDays`, `mondayOf` and `wibDayStartFromKey` are out of `src/lib/sessions-board.ts`, which now reads `date: { gte: today }`. `/sessions?view=all&week=2026-01-05` renders text-identical markup to `/sessions?view=all`, and no `week=` link exists anywhere on the page. |
| "The grid class string matches the existing precedent" | **Confirmed character for character** against `src/app/(admin)/admin/dashboard-activity-cards.tsx:86`: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`, with `loading.tsx` mirroring it. |
| "The card conventions record is amended, not silently broken" | **Confirmed.** `docs/adr/0018-session-cards-outside-a-week.md` supersedes exactly two parts of ADR 0014 — the stacking convention justified by the 174px week-strip day column, and the paragraph requiring the strip to draw every day including empty ones — and restates what still binds. `docs/adr/0014` shows an empty diff; it was never opened for edit. |
| "The existing day-range builder is kept, not deleted" | **Confirmed, and it is now the dashboard's alone.** It kept the timezone rules of ADR-0007 and #334 later narrowed it in the sibling spec; `src/lib/dashboard-sessions.ts` is its one production caller. |
| "The glossary contradiction is resolved" | **Confirmed by rewording rather than by a new term.** The `CONTEXT.md` Activity entry now reads "weekly schedule"; the Seat entry still bans "slot" as a synonym, and "slot" survives in that file only inside the ban. |

**Success criteria, verified at merge on `main` rather than taken from the tickets.** Playwright MCP against the dev server, signed in at `/auth/dev` as a member joined to more than one activity.

- Section order on `/sessions?view=all`: Badminton (soonest 5 September, 3 upcoming), Futsal (7 September, 2 upcoming), then Basket and Tennis at 0 upcoming, last, each drawing the empty sentence and no cards. Cards inside a section read in date order.
- `getComputedStyle(grid).gridTemplateColumns` gave three tracks at 1280px, two at 768px and one at 390px, measured rather than eyeballed.
- At 390px `document.documentElement.scrollWidth` is 390 and no element exceeds the viewport.
- Seats agree across surfaces: the first Badminton card reads `18 free of 20` and its detail page reads `Players 2/20`.
- Zero console errors on reload. One transient `504` on `/_next/image` for the community logo on a cold load did not reproduce and the object returns `200` on a direct fetch; environmental, not this run.

**Two calls this body did not name, both accepted at verification.** `titleBySession` is handed to the section alongside the cards, because the card from #332 carries no title of its own while ADR-0018 requires the title in the accessible name and `ActivitySection.cards` is `readonly`. `StripNotice` died with `week-strip.tsx` and was redrawn inline as `BoardNotice`; without it a member who has joined nothing gets a blank page in the Mine view, which no criterion here asks for.

**Two things left standing, deliberately.** The card reuses the dictionary keys `weekSeatsFigure`, `weekSeatHeld`, `weekHoldPayBy`, `weekCardAria` and `boardSeatsAria`, whose names still say "week" although the surface is no longer one; renaming them was outside every ticket's write surface and outside the run's scope note on dictionary keys. And four comments in files no ticket owned still cite what this run deleted — filed as **#343** rather than fixed opportunistically, per the run's own rule that a defect outside a ticket's surface becomes its own item.

---
## Problem statement

A member opening `/sessions` sees a seven-day strip: one column per day of one week, every session that week scattered across those columns, and prev/this/next pills to walk to another week. In a community running two or three activities the strip reads fine. In a community running many, it does not — the columns fill with cards from unrelated activities, the same activity's sessions sit far apart in different columns, and a member who cares about one activity has to scan all seven columns to find its next date. The week is also the wrong unit for the question a member is actually asking. They do not want to know what happens on Thursday; they want to know when their activity next meets, and whether there is still a seat.

## Solution

`/sessions` stops being a week and becomes a list of activities. Each activity gets its own section, and inside that section its upcoming sessions are laid out as cards, three across on a desktop, two on a tablet, one on a phone. Sections are ordered by whichever activity meets soonest, so the thing happening next is at the top of the page. Cards inside a section run in date order, left to right, so the next session for that activity is the first card.

The week navigation disappears with the week. The page shows what is coming up, not a window a member has to steer. The two controls that still mean something — the "mine or all" view and the per-activity filter chips — stay, and the chips become the way a member in many activities jumps straight to one.

A member in one activity sees one section and its next few dates. A member in nine sees nine headed sections in order of urgency, rather than nine activities' worth of cards interleaved across seven columns.

## Goals and non-goals

Goals: replace the week strip on `/sessions` with per-activity sections of session cards; order sections by their soonest upcoming session; order cards within a section by date; keep the page readable for a community with many activities; keep the existing view toggle and activity filter working; remove the week navigation and every dependency on it; leave one live layout on the member sessions surface rather than two.

Non-goals: the member dashboard's layout, which already sections by activity and is not changed here. A history or past-sessions surface. Any change to what a session card lets a member do — claiming, withdrawing, paying and the payment hold all behave exactly as they do today. Any change to capacity, dues or attendance figures.

## User stories

1. As a member of several activities, I want each activity's sessions grouped together, so that I can find my activity's next date without scanning a week grid.
2. As a member, I want the activity meeting soonest at the top of the page, so that the first thing I read is the thing happening next.
3. As a member, I want an activity's sessions in date order left to right, so that its next session is always the first card in its section.
4. As a member of one activity in a community that runs many, I want to filter to just mine, so that the page shows only what concerns me.
5. As a member, I want to see how many upcoming sessions an activity has without counting cards, so that I know at a glance whether it is busy or quiet.
6. As a member of an activity with more upcoming sessions than fit comfortably, I want a way to see all of them, so that a cap on the page does not hide dates from me.
7. As a member of an activity with nothing scheduled, I want its section to still appear, so that I can tell the activity exists and simply has no dates yet rather than wondering whether I have been removed from it.
8. As a member on a phone, I want the sections to stack into a single readable column, so that the page works without horizontal scrolling.
9. As a member, I want each card to tell me its date, time, venue, how full it is and what I can do about it, so that I can decide without opening it.

## Implementation decisions

**Sections are activities; cards are sessions.** The page renders one section per activity in scope, and the three-column grid sits inside a section, holding that activity's session cards. This is the reading of "three-column layout grouped by activity" the user settled: the alternative, one column per activity, breaks down the moment a community has more than three.

**Section ordering: soonest upcoming session ascending, joined activities before others.** An activity with no upcoming session sorts last. Ordering by the activity's own next date is what makes "ordered by upcoming sessions" true at the section level, and it means the page reorders itself as the week progresses without anyone configuring anything.

**Card ordering: date ascending, filling the grid left to right and wrapping.** Within a section the date is the only thing that varies between cards, so it is what orders them and what leads each card.

**Cap of six cards per section, with a link to the rest.** Six is two full rows on a desktop; beyond that a section reintroduces the clutter this work exists to remove. The link points at `/sessions?activityId=<id>`, the filter that already exists, and selecting a single activity lifts the cap — with one section on the page there is no clutter pressure to cap against. No new route is added for this.

**The grid class string matches the existing precedent.** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` is already how this repository lays out a card-per-entity grid, in the admin dashboard's activity cards. Reusing it keeps one grid idiom rather than inventing a second.

**Range: every future session.** With the week gone there is no window to navigate, so the page loads all sessions from today forward. This is bounded in practice: the recurring generator only ever creates rows for the current calendar month and the month-end cron produces the next, so the database holds roughly one to two months ahead. A fixed window would add a hidden rule and would silently drop a one-off session an admin scheduled further out.

**Week navigation and the `week` query parameter are removed entirely**, along with the view-model and components that exist only to serve them. Its blast radius is small and self-contained: the sessions page builds the hrefs, the nav component renders them, the filter re-appends the parameter, and the board library resolves and computes the week keys. No email, no landing page and no test reads it.

**A new pure module owns the grouping.** Turning board data into ordered sections of ordered cards is decided in one server-side module with no rendering in it, mirroring how the existing day-range builder is a pure module tested on its own. This is the seam the ordering rules, the cap and the empty case are tested at.

**The existing day-range builder is kept, not deleted.** It no longer feeds this page, but the member dashboard still consumes it through its own view module, and it carries the repository's timezone-correctness rules for reading a stored UTC calendar day. Deleting it to serve a page it no longer feeds would take the dashboard down with it.

**Card contents.** Date and weekday lead, then the time range, the venue, how full the session is, one status chip, and the seat action. The activity name is deliberately absent: the section header above already names it, and repeating it on every card wastes the width the wider cell was meant to buy.

**Section header contents.** The activity's icon tile, its name, and a count of its upcoming sessions. No standing-schedule line: the posted sessions are the truth, and an activity with nothing scheduled gets a plain empty sentence rather than a promise about which weekday it usually meets.

**The card conventions record is amended, not silently broken.** The accepted architecture decision on member session cards justifies several of its rules by the width of a week-strip day column and by the week strip's duty to draw every day including empty ones. Both premises are removed by this work. A new record supersedes those parts and restates what still holds: state and permitted action are resolved server-side before any component is reached, one chip at the footer's leading edge, and the action is a sibling of the card link rather than a child of it.

**The glossary contradiction is resolved.** The domain glossary bans "slot" as a synonym for Seat while itself using it for an activity's weekly time, and the code uses it for a third thing. This work settles the word rather than leaving three meanings in circulation.

## Testing decisions

A good test here asserts on ordering and shape, from outside: given sessions and activities in, which sections come back, in what order, with which cards in which order, and what the cap did. It never asserts on markup.

The new grouping module is the seam, and it is the only new one. It is unit tested the way the existing day-range builder is: pure input, pure output, no Prisma, no rendering. Cases: sections ordered by soonest session; joined activities ahead of others; an activity with no upcoming sessions sorted last; cards in date order within a section; the cap applied at six with the overflow signalled; the cap not applied when a single activity is selected; a stored UTC calendar day read as itself regardless of host timezone, consistent with the existing timezone decision record.

No new component or page test. This repository's coverage is deliberately narrow — pure logic only, with pages and components uncovered by design — and adding a component test here would be the first of its kind rather than following prior art. The layout itself is proved by a runtime walk of the page at merge.

The existing day-range builder's tests are untouched by this spec.

## Success criteria

- Opening `/sessions` as a member shows one section per activity in scope, each headed by the activity's icon tile, name and upcoming count.
- Section order matches soonest-upcoming-session ascending, with joined activities before others and activities with no upcoming session last.
- Within a section, cards read left to right in date order.
- At a desktop width the grid is three cards across; at a tablet width two; at a phone width one; the page never scrolls horizontally.
- A section with more than six upcoming sessions shows six and a link to the rest; following that link shows that activity alone with every session.
- An activity with no upcoming sessions still appears, last, with an empty sentence and no cards.
- No week navigation control appears anywhere, and a request carrying a `week` query parameter renders the same page as one without it.
- The "mine or all" view and the activity filter chips still change what the page shows.
- A session card still lets a member claim, withdraw or pay exactly as it does today.
- The seats shown on a card match the seats shown on that session's detail page.

## Out of scope

The member dashboard's layout. Any past-sessions or attendance-history surface for members — after this work, nothing in the member interface links to a past session, and that is accepted here rather than fixed. A per-activity member route. Any change to reservation, payment-hold or capacity behaviour. Admin surfaces. The public landing page.

## Further notes

Facts established while grilling, true as of 2026-09-05, each an address at the time of writing rather than a permanent line number: the week strip's grid is at `src/components/sessions/week-strip.tsx:107`; the admin grid precedent is `src/app/(admin)/admin/dashboard-activity-cards.tsx:86`; the `week` parameter's full set of readers is `src/app/(main)/sessions/page.tsx:50-54,90-98,125,149-163,200`, `src/components/sessions/board-week-nav.tsx:20-51`, `src/components/activity/sessions-filter.tsx:124-125,133,144` and `src/lib/sessions-board.ts:88-95,116-125,286-295`; `src/lib/sessions-board.ts` has no test coverage; the generator's horizon is stated at `src/lib/recurring-sessions.ts:62-113`; there is no per-activity member route and no per-activity colour field, only a curated icon key.

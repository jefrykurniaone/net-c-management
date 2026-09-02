# Spec: followups charts — insights chart primitives, row keys, legend and empty copy

| | |
|---|---|
| Spec | [#228](https://github.com/jefrykurniaone/net-c-management/issues/228) — `spec:followups-charts` |
| Run | `run:followups` |
| Execution map | [#233](https://github.com/jefrykurniaone/net-c-management/issues/233) |
| Tickets | #215, #214, #224, #222, #216 — sub-issues of #228 |
| Version | v1 (2026-09-02) |
| Grilled from | the triage of the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers` |
| Depends on | nothing in this run. Completes the chart layer built by [#146](https://github.com/jefrykurniaone/net-c-management/issues/146) (`docs/spec-rally-insights-v1.md`); vocabulary from `CONTEXT.md` |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-09-02 as part of run `followups`, the run that clears the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers`. This spec owns the five that sit in the **insights chart layer** — the shared chart wrapper, the shared legend, the week-window helper, and the one empty-state sentence all four charts share.

Repo copy: `docs/spec-followups-charts-v1.md`. Execution map: to follow. Tickets: linked below as sub-issues.

## Problem Statement

The four insights charts shipped in run `rally` are correct about their numbers. The shared layer beneath them has four defects and one duplication, and each of them reaches every chart that is written next.

- The accessible text list under every chart keys its rows on the row's **own label**. For the first two charts a label was a Billing Period or a week, unique by construction. The money-by-Activity donut is the first caller whose labels come from user data, and `Activity.name` carries no unique constraint — two Activities may share a name, and an Admin may name one of them `Total`. React renders duplicate keys wrong on re-order: the list can show one Activity twice, or show a stale amount against the wrong name.
- The shared legend never wraps. One legend item per Activity already crowds the row at 390px with four Activities, and a community with six or more pushes its own legend off the card edge instead of onto a second line. The tooltip beside it in the same file does wrap, so this reads as an oversight. The donut needed a per-Activity colour key, could not use the component, and drew its own — so the shared legend primitive is now unused by the one chart that most needed it, and the next chart author walks into the same wall.
- The one chart that does use the shared legend renders its two items in a **different order depending on locale**. The colour-to-label pairing stays correct in both, but a bilingual user switching language sees the two entries swap places, on the one chart that has a two-item legend.
- All four charts show the same empty message, "No data for this period yet." Two of those charts cover a rolling **eight-week window**, not a Billing Period. A member who has not attended yet is told there is no data "for this period" under a card whose own caption reads "The last eight weeks". `CONTEXT.md` makes Billing Period a domain term, and this is the one place the app uses the word loosely.
- The Monday-of-this-week rule is written twice: once privately inside the `server-only`, Prisma-bound sessions board, and once inside the pure eight-week window builder the charts run on. The two agree today. They are free to drift, and a third caller is one ticket away.

## Solution

The shared chart layer is made safe for the charts that have not been written yet.

Rows carry a stable identity instead of borrowing their label. The legend wraps like the tooltip beside it, takes its items explicitly rather than introspecting a payload contract that the charting library no longer guarantees, and the donut adopts it and drops its local key. The one shared empty sentence becomes four, so a chart that measures weeks says weeks. And the Monday rule lives in the pure module both sides can import, with the server-only copy deleted.

## Goals

- No shared chart primitive can render the wrong row, in the wrong order, or off the edge of its card, because of data an Admin typed.
- The empty state of every chart names the window that chart actually covers, in the vocabulary `CONTEXT.md` fixes.
- One Monday-of-week rule, in the module that has no server dependency, imported by both callers.

## Non-goals

- Any change to what the charts compute. Every figure and every colour pairing is already correct and stays correct.
- Any new chart, any new series, any date-range control, and charts anywhere but the two dashboards.
- Replacing the charting library or changing its version.

## Constraints and trade-offs, with the reasons

- **The pure week module stays pure.** `chart-weeks.ts` has no `server-only` import and no Prisma import precisely so a member-side loader can import it without dragging an admin read along. The duplication is resolved in one direction only: the server-only board imports the pure module. The reverse would poison six importers.
- **The legend takes its items explicitly.** The charting library no longer passes a payload to a legend's content in every configuration, so a legend that reads series names out of that payload can render blank. Introspecting a contract the library does not promise is what makes both the blank-legend risk and the locale-dependent ordering possible; passing the items removes both at once.
- **A stable key is added beside the label, not instead of it.** Every existing caller keeps working; the donut supplies the Activity id it already has, and the summary row a constant. Charts whose labels genuinely are unique need no change.
- **Four empty messages, not one parameterised sentence.** The two window kinds read differently in both locales, and the member-facing one is written in a neutral register — never a reproach on a member's first-ever view of their own dashboard. That is a copy decision per chart, not a substitution into a template.
- **Appending to the dictionary, never reordering it.** Every new key goes at the end of the `insights` block in both `en` and `id`, as that block's own comment requires.

## Success criteria

- Two Activities named identically, and an Activity named `Total`, both render correctly in the donut's text list, with the right amount against each name, before and after a re-order.
- At 390px a legend with one item per Activity wraps onto as many lines as it needs and never overflows its card, at six Activities and at four.
- The Dues chart's legend renders its two items in the same order in `en` and in `id`.
- Each of the four charts' empty states names its own window; no chart that measures eight weeks says "period".
- `grep` finds exactly one Monday-of-week implementation in `src/`, and the sessions board's tests still pass against it.

## User Stories

1. As an Admin whose community runs two Activities with the same name, I want the money-by-Activity text list to show each of them once with its own amount, so that I do not read one Activity's money against another's name.
2. As an Admin, I want to be able to name an Activity `Total` without breaking the chart that summarises my Activities, so that a legal name is not a trap.
3. As an Admin using a screen reader, I want the chart's text list to be a faithful reading of the chart, so that the accessible path is not the wrong one.
4. As an Admin of a community with six Activities, I want the chart legend to wrap onto a second line on my phone, so that I can see which colour is which Activity.
5. As a developer writing the next chart, I want to use the shared legend rather than draw my own, so that two chart legends do not diverge.
6. As a bilingual user, I want the legend to read in the same order in both languages, so that switching language does not look like the chart changed.
7. As a member who has not attended a Session yet, I want the empty attendance chart to tell me what window it covers, so that "this period" does not describe eight weeks.
8. As a member seeing my own dashboard for the first time, I want the empty state to be neutral, so that a chart with nothing in it does not read as a reproach.
9. As an Admin, I want the Dues chart's empty state to keep saying Period, because for that chart the unit genuinely is a Billing Period.
10. As a developer, I want one Monday-of-week rule in the codebase, so that a change to how a week starts cannot move the charts and leave the board behind.
11. As a developer, I want the week rule to live in a module a member-side loader can import, so that fixing the duplication does not pull a server-only read into a client path.

## Implementation Decisions

- The chart figure's value type gains an optional stable identifier; the values list prefers it and falls back to the label, so existing callers are unchanged. The donut supplies the Activity id per row and a constant for its summary row. The drawn ring is untouched — it keys on the slice index.
- The shared legend row wraps, the way the tooltip content in the same component already does.
- The legend's items are given to it explicitly, ordered by series, rather than read out of whatever the charting library hands the content component. That single change fixes both the locale-dependent order and the blank-legend risk. The installed library version is checked before the change is designed, not assumed.
- The donut adopts the shared legend and deletes its local colour key, so the shared primitive has a consumer again.
- The `insights` dictionary block gains one empty message per chart kind in both locales, appended at the end of the block. The Dues chart and the donut keep Period wording; the two eight-week charts get week-window wording, member-facing copy in a neutral register.
- The `server-only` sessions board imports the pure module's Monday rule and deletes its private copy. The pure module keeps no dependency it did not already have.
- Every user-facing string goes through the dictionary in both locales. No hardcoded copy.

## Testing Decisions

- A good test here asserts **rendered output for a given series**, not the internals of the charting library. The seam is the view resolver that turns rows into a chart's props, and the rendered text list.
- The duplicate-label case is pinned directly: a series with two identically named rows produces two distinct rows in the values list, with the right value against each.
- The empty-message cases are pinned at the view resolvers, one per chart, asserting the chart's own key rather than the shared one.
- The Monday rule keeps the tests it already has in the pure module; the board's existing tests are the regression guard for the deletion, and must pass unchanged.
- Contrast, wrapping and overflow at 390px are runtime checks, recorded once by the run's single `TESTING.md` ticket rather than per ticket.

## Out of Scope

- Any change to the numbers, the palette, the ring geometry or the axis formatting of any chart.
- Adopting the shared legend in charts that carry a single series and therefore do not need one.
- A new chart, a second dashboard region, or a chart on any surface other than the two dashboards.
- Upgrading, replacing or patching the charting library.
- The retired-alias sweep and the design-token gate, which belong to a different spec in this run.

## Further Notes

All five issues were filed by the orchestrator or the reviewers of run `rally` wave 6, deliberately rather than fixed in place, because each of them lives in a file the finding ticket did not own. That protocol is why they are all still exactly as described, verified against `main` on 2026-09-02.

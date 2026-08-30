# Spec: Rally insights — dues, money by Activity, fill rate and attendance charts

| | |
|---|---|
| Spec | [#146](https://github.com/jefrykurniaone/net-c-management/issues/146) — `spec:rally-insights` |
| Run | `run:rally` |
| Execution map | [#175](https://github.com/jefrykurniaone/net-c-management/issues/175) |
| Tickets | #169–#173 — sub-issues of #146 |
| Version | v1 (2026-08-30) |
| Grilled from | the request to restyle the app after the Playbypoint case study |
| Depends on | [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) (foundation), [#144](https://github.com/jefrykurniaone/net-c-management/issues/144) (member dashboard card), [#145](https://github.com/jefrykurniaone/net-c-management/issues/145) (admin dashboard region). Binding ADRs: [0002](adr/0002-dues-rate-history.md), [0003](adr/0003-retire-papan-jadwal-for-rally.md) |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-08-30 as part of run `rally`. Depends on the foundation spec (`spec:rally-foundation`) for tokens and the chart palette, on the admin spec (`spec:rally-admin`) for the dashboard region the admin charts fill, and on the member spec (`spec:rally-member`) for the dashboard card the member sparkline sits in.

Repo copy: `docs/spec-rally-insights-v1.md` (PR #147). Execution map: #175. Tickets: #169–#173, linked below as sub-issues.

## Problem Statement

Both dashboards show figures for now — how many, how much, this week, this Period — and nothing about direction. An Admin cannot see whether Dues collection is improving across Periods, which Activity the money comes from, or whether Sessions are filling better or worse; a Member cannot see their own attendance as a trend. The reference dashboard carries exactly these: a trend line, a distribution donut, a stat with its change. The product has every number needed already in the database; it has no charts and no chart library.

## Solution

Add four charts, each backed by its own pure data resolver so the arithmetic is testable without a browser, drawn with the shadcn chart component over Recharts in the Rally palette:

- **Admin — Dues collected vs owed, last six Billing Periods** (grouped bars). Owed for a Period is the sum, over Memberships on Monthly mode in that Period, of that Period's frozen Dues Rate; collected is the sum of Confirmed Dues Payments for that Period. Per-Session Fees are in neither.
- **Admin — This Period's money by Activity** (donut). Confirmed Payments this Period, Dues and Fees together, grouped by Activity, with the total in the centre.
- **Admin — Seats filled, last eight weeks** (line). Per week, the sum of Registered and Present rows divided by the sum of capacity across that week's Sessions, as a percentage; cancelled Sessions excluded.
- **Member — Own attendance, last eight weeks** (sparkline). Count of the member's own Present rows per week.

Pending Payments never count anywhere; a hold is not money.

## Goals and success criteria

Goals:

- An Admin sees collection direction, money source and fill rate without exporting anything.
- A Member sees their own attendance as a trend.
- Every chart's arithmetic is a pure function with unit tests, and every chart degrades to an honest empty state.

Non-goals: exports, date-range pickers, per-member Admin analytics, forecasting, any change to how money is resolved.

Success criteria — this spec is done when:

- The three admin charts render on the admin dashboard and the member sparkline on the member dashboard, in both themes and both locales, at 1440×900 and 390×844.
- Each resolver has unit tests covering the empty case, a single-Period or single-week case, the exclusion of Pending and Rejected Payments and cancelled Sessions, and the Dues Rate frozen per Period.
- Every chart carries an accessible text summary of its values and an empty state with the neutral chip and one sentence when there is no data.
- The new `TC-IN-*` manual suite has been executed and recorded.

## User Stories

1. As an Admin, I want to see Dues collected against Dues owed for the last six Periods, so that I know whether collection is improving.
2. As an Admin, I want to see this Period's money split by Activity, so that I know which Activity carries the community.
3. As an Admin, I want to see how full Sessions have been over the last eight weeks, so that I can adjust capacity or posting.
4. As an Admin, I want each chart to say its numbers in text as well as shape, so that I can quote them and so that a screen reader can read them.
5. As an Admin, I want a Period with no data to show as zero rather than vanish, so that a gap is visible.
6. As an Admin, I want the owed figure to use the Dues Rate that was in force in each Period, so that a rate change does not rewrite history.
7. As an Admin, I want Pending and Rejected Payments excluded from every collected figure, so that the chart shows money, not hopes.
8. As a Member, I want a small chart of my own attendance over the last eight weeks, so that I can see whether I am playing more or less.
9. As a Member, I want the sparkline to show nothing alarming when I have not played, so that an empty chart is not a reproach.
10. As an Admin on a phone, I want charts that fit the width and stay legible, so that I can glance at them from the court.
11. As an Indonesian-locale Admin, I want axes, legends and summaries translated and Rupiah formatted correctly, so that the charts read naturally.
12. As a developer, I want each chart's numbers produced by one pure function, so that a wrong figure is caught by a unit test and not by an Admin.

## Implementation Decisions

**Library.** The shadcn chart component (Recharts underneath), added through the shadcn CLI so the wrapper follows the project's component conventions; the one new runtime dependency is Recharts. Charts render client-side from server-computed series; no data fetching in the browser.

**Resolvers.** One pure function per chart taking plain records (Payments, Memberships, Dues Rates, Sessions, Attendances, and a "now") and returning a series; a thin server-side loader per dashboard queries the database for the window and hands the records to the resolver. The owed calculation reuses the existing Dues Rate resolution (the rate in force for a Period; a Period with no covering rate is skipped and logged, never treated as free) and the existing payment-mode resolution for which Memberships are Monthly in that Period. Week boundaries follow the product's existing week convention; Billing Periods are calendar months.

**Series definitions.**
- Collected vs owed: six Periods ending with the current one; per Period two values in Rupiah; owed excludes Activities with no covering rate for that Period; collected counts Confirmed Payments of type Dues with that Period's month and year.
- Money by Activity: Confirmed Payments whose Period is the current one (Dues) or whose Session date falls in the current Period (Fees), grouped by Activity name; total in the centre; Activities with zero excluded from the donut but listed in the text summary as zero.
- Seats filled: eight weeks ending with the current one; per week, Registered plus Present rows over the sum of `maxPlayers` of non-cancelled Sessions in that week; a week with no Sessions shows as no-data, not as zero percent.
- Own attendance: eight weeks ending with the current one; per week, the member's Present rows.

**Palette.** Chart series colours come from the foundation's chart tokens (PBP Green, Purple, Orange, Dark Red, Black Green / off-white) — colour is free for charts by decision. The donut uses the Orange-to-Dark-Red range from the reference for Activity segments when there are two or three, and the full chart palette beyond that.

**Accessibility.** Each chart is a figure with a caption and a visually hidden (or toggled) text list of its values; tooltips are supplementary. Empty state is the neutral chip plus one sentence in the chart's place.

**Placement.** Admin: the region the admin spec reserved between the stat row and the Activity cards — collected vs owed wide, donut and fill line side by side. Member: inside the dashboard's stats area as a small card with the current-week figure and the sparkline.

**Strings.** Chart titles, axis labels, legends, summaries and empty sentences in both locales, in a new insights block of the dictionary.

## Testing Decisions

A good test asserts the numbers a resolver returns for a known set of records.

- **Vitest, per resolver:** empty input → empty or zero series of the right length; one Period / week; Pending and Rejected excluded; cancelled Sessions excluded; a Dues Rate change between Periods yields different owed figures in the two Periods; a Membership switching mode mid-window counts only in its Monthly Periods; Fees never in the Dues chart; a week with no Sessions is no-data. Prior art: the dues-rate and payment resolver tests, which already build plain-record fixtures and assert money arithmetic.
- **Manual `TC-IN-*` suite (new section):** each chart on seeded data in both themes, locales and viewports; text summary matches the drawn values; empty states; tooltip and keyboard focus.
- **Not unit-tested:** Recharts rendering itself.

## Out of Scope

- Date-range selection, exports, drill-down to rows.
- Per-member analytics for Admins; forecasting.
- Any change to how Dues, Fees, holds or attendance are resolved — resolvers are consumed, not edited.
- Charts on any surface other than the two dashboards.

## Further Notes

**Why a separate spec.** The chart data touches money arithmetic (owed per Period, collected per Activity) and deserves its own review boundary and its own unit tests rather than riding inside a restyle ticket.

**Why owed skips a Period with no rate.** A Period with no covering Dues Rate is a broken invariant, not a free month; the dashboard already skips and logs it, and the chart does the same so the two never disagree.

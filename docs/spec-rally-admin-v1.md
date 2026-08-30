# Spec: Rally admin surfaces — shell, dashboard cards, tables in cards, Activity icon

| | |
|---|---|
| Spec | [#145](https://github.com/jefrykurniaone/net-c-management/issues/145) — `spec:rally-admin` |
| Run | `run:rally` |
| Execution map | filled in at Stage 4 of the pipeline |
| Tickets | filled in at Stage 3 of the pipeline |
| Version | v1 (2026-08-30) |
| Grilled from | the request to restyle the app after the Playbypoint case study |
| Depends on | [#142](https://github.com/jefrykurniaone/net-c-management/issues/142) (foundation). Binding ADR: [0003](adr/0003-retire-papan-jadwal-for-rally.md). Reverses #65 (`Activity.icon` dropped) as a new decision |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-08-30 as part of run `rally`. Depends on the foundation spec (`spec:rally-foundation`) for tokens, type roles, chips and primitives. Reverses ticket #65 (which dropped `Activity.icon` as never rendered) as a new decision: the field returns with a renderer.

Repo copy: `docs/spec-rally-admin-v1.md`. Execution map and tickets are linked below once they exist.

## Problem Statement

The admin side was rebuilt as ruled registers — dense tables read at a desk — and that job has not changed: the Payments queue is forty Proof rows decided one after another, and Members, Sessions, Activities and Applicants are sort-and-compare lists. What the owner wants changed is the room those tables sit in: a sidebar and a dashboard in the Rally look, tables inside rounded cards instead of a lattice, chips instead of marks, stat cards with big figures, and page titles in condensed caps. Separately, Activities have no visual identity at all since their colour and icon fields were removed, and the reference's category rows carry icon tiles.

## Solution

Restyle the admin shell and every admin surface onto Rally, keeping the tables. The existing sidebar and mobile sheet are restyled (Lime active item, Display wordmark treatment for the community name); the dashboard becomes a grid of stat cards, an attention card and Activity cards (leaving room for the insights spec's charts); each of the five registers and the attendance register keeps its columns, sort and pagination but sits inside one card with a card header carrying the title, count and the primary action; every form and dialog is restyled. `Activity.icon` returns as a nullable field holding a key from a curated set of about sixteen icons, picked from a grid in the Activity form, and rendered as a Lime icon tile wherever an Activity is named; an Activity without an icon shows its initial on the same tile.

## Goals and success criteria

Goals:

- An Admin clears the Payments queue exactly as before — thumbnail, decide, next — in a room that looks like the rest of the product.
- Every admin surface is on the Rally tokens with no rule, tile or mark left, readable at 1440 px and usable at 390 px.
- Activities carry a chosen icon across every surface that names them.

Non-goals: any change to money, capacity or attendance rules; column changes to any register; charts (the insights spec); Owner-rule changes.

Success criteria — this spec is done when:

- Every admin surface renders in both themes and both locales with tables inside cards, chips for every state, and the Display page title.
- The Activity form offers the icon grid, saves the choice, and the icon renders on the Activities register, the Session cards and rows, the public Activity cards, and the member dashboard; an Activity without an icon renders its initial tile everywhere.
- The `TC-AR-*` behavioural cases pass unchanged; the geometric ones are superseded.
- The new `TC-AD-*` manual suite has been executed and recorded.

## User Stories

1. As an Admin, I want a sidebar that carries the community's name and logo and highlights where I am, so that the admin area feels like our club's back office.
2. As an Admin, I want the dashboard to open with large figures — active members, Sessions this week, pending Payments, collected this Period against owed — so that I see the state of the community in one look.
3. As an Admin, I want a "needs attention" card listing pending Payments and under-booked Sessions, so that I know what to do first.
4. As an Admin, I want one card per Activity on the dashboard with members, attendance rate, Sessions per week and Dues collected, so that I can compare Activities.
5. As an Admin, I want the Payments queue as a table inside a card, awaiting-decision first, with Proof thumbnails and confirm / reject from the row, so that clearing the queue is as fast as it is today.
6. As an Admin, I want the Members, Sessions, Activities and Applicants registers as sortable, paginated tables inside cards, so that comparing forty rows stays possible.
7. As an Admin, I want each register's card header to carry its title, the row count and the primary action (post a Session, add an Activity), so that the action is where I look first.
8. As an Admin, I want every state in the registers as a labelled chip, so that a scan of forty rows works before I read.
9. As an Admin, I want the attendance register for a Session as a card with the four-state control per Participant and one save action, so that recording attendance stays one write.
10. As an Admin, I want forms and dialogs — Session, Activity, Settings, confirm and reject — in the new look, so that a decision on money looks as serious as it is.
11. As an Admin, I want to pick an icon for each Activity from a small grid, so that Activities are recognisable at a glance.
12. As an Admin, I want an Activity without an icon to show its initial, so that a new Activity never looks broken.
13. As an Admin, I want to clear an icon back to none, so that a wrong pick is one click from gone.
14. As an Admin on a phone, I want the registers to collapse without becoming unreadable, so that I can confirm a Payment from the court.
15. As an Owner, I want my own row and contact details treated exactly as before, so that the restyle changes no rule.
16. As an Admin using a keyboard, I want every register action and every icon in the grid reachable with a visible focus ring, so that I can work without a pointer.
17. As an Indonesian-locale Admin, I want every new label translated, so that the back office is never English-only.

## Implementation Decisions

**Shell.** Existing desktop sidebar and mobile sheet restyled: dark (Black Green) sidebar in both themes with off-white labels, active item on a Lime tile with Black Green text, community logo and name at the top in the Rally mark treatment, theme toggle and sign-out at the bottom. Content area on the page ground with a Display page title and an optional action row under it. No structural change.

**Dashboard.** Stat card row (active members, Sessions this week, pending Payments, collected this Period of owed — the figures the page already computes), attention card, then the Activity cards grid. A reserved region between the stat row and the Activity cards is left for the insights spec's charts; until that lands the region does not render.

**Tables in cards.** The shared register component keeps its contract (columns as data, rows as records, five column kinds, sort and pagination) and is restyled: the table sits inside a card with a header row (title, count, primary action); column heads in Label type; standing column renders the status chip; actions column on the trailing edge; empty state is one row spanning the columns with the neutral chip and one sentence. Below the medium breakpoint each row becomes a stacked block inside the card with the column label before each value (the existing one-DOM approach), never an unruled list. Payments queue ordering (awaiting first), thumbnails and row actions are unchanged.

**Forms and dialogs.** Restyled onto the primitives: 8 px controls, 12 px dialogs, primary action in PBP Green, destructive in Dark Red, read-only fields on the beige ground. Confirm and Reject dialogs keep their content and rules (low-amount warning, reason required).

**Activity icon.** A nullable string column on Activity holding an icon key, added by migration. The key set is a curated list of about sixteen icons from the icon library already in use, defined once in code with a display name in both locales; the API accepts only keys in that set and strips unknown values from older clients rather than refusing the request (the established retirement pattern in reverse — an unknown key is not an error). The Activity form shows the grid with the current pick highlighted and a "none" option. Rendering: one Activity-tile component that takes the Activity's name and icon key and draws a Lime tile with the icon, or the initial when the key is null; used by the Activities register, Session rows and cards, the public Activity cards and the member dashboard. The public landing cache is invalidated when an Activity's icon changes.

**Strings.** New labels (icon picker heading, icon display names, card headers) in the admin block of the dictionary in both locales.

## Testing Decisions

A good test checks what an Admin sees and can do, and what the API accepts.

- **Vitest:** the icon key validation accepts every key in the set, strips an unknown key, and accepts null; the Activity request schema still accepts a payload without the field. Prior art: the activity-validation tests, including the "removed field is stripped" cases from the colour retirement.
- **Manual `TC-AD-*` suite (new section):** each admin surface at 1440×900 and 390×844 in both themes and locales; Payments queue ordering and row actions unchanged; icon pick, clear and render on every consuming surface; initial fallback; keyboard reachability of the icon grid and row actions; Owner row rules unchanged.
- **Superseded:** `TC-AR-*` cases asserting rules, tiles or marks; behavioural `TC-AR-*` cases stay live and must pass.

## Out of Scope

- Column, sort or filter changes to any register.
- Charts on the dashboard (spec `rally-insights`); this spec only reserves the region.
- Uploaded icon images or free-text icon names (decided: curated set).
- Any money, capacity, attendance or Owner rule.
- Restructuring navigation.

## Further Notes

**Why tables stayed.** The owner chose card grids for member surfaces and tables-in-cards for admin registers. A card grid of forty Payments loses sort, aligned amounts and the one-glance queue; the reference's own dashboard mockups are widgets containing tables and figures.

**Why the icon field returns.** It was removed because nothing rendered it. It now has a renderer on five surfaces and a curated set that guarantees legibility on both themes — the two objections that removed it no longer apply. The reversal is recorded as a new decision, not a revert.

**Migration order.** Adding a nullable column is safe to deploy in either order; the ticket still follows the repo's Prisma Migrate rule and commits the migration folder with the schema change.

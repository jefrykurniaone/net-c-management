# Spec: followups money — admin dashboard figures resolve from the rows that record them

| | |
|---|---|
| Spec | [#227](https://github.com/jefrykurniaone/net-c-management/issues/227) — `spec:followups-money` |
| Run | `run:followups` |
| Execution map | [#233](https://github.com/jefrykurniaone/net-c-management/issues/233) |
| Tickets | #203, #189, #204 — sub-issues of #227 |
| Version | v1 (2026-09-02) |
| Grilled from | the triage of the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers` |
| Depends on | nothing in this run. Binding ADR: [0002](adr/0002-dues-rate-history.md) — both the precedent ADR 0004 follows and the reason a chart may not invent a mode history |

This is a verbatim copy of the tracker issue at the time of ticketing. The issue is the live record; this file is the durable one. Below the rule is the issue body.

---

Grilled on 2026-09-02 as part of run `followups`, the run that clears the nineteen issues left open by runs `rally`, `dues-rate` and `admin-registers`. This spec owns the three of them that are about a **money or capacity figure that does not match the rows behind it**.

Repo copy: `docs/spec-followups-money-v1.md`. Execution map: to follow. Tickets: linked below as sub-issues.

## Problem Statement

An Admin opens `/admin` and reads three figures off the dashboard. Two of them are wrong, and a third cannot be right for any week the community actually grows into.

- **Dues collected** sums every Confirmed Payment in the current Billing Period, including per-Session **Fees**. A Fee is not Dues. The figure therefore reports more Dues collected than the community collected.
- **Total owed** multiplies the Period's Dues Rate by every active Membership, including Memberships on **Per-Session** and Memberships that have not chosen a Payment Mode at all. Neither owes Dues. The figure therefore reports more owed than is owed.
- **Sessions this week** counts the length of a page of at most six rows. A week holding seven Sessions reports six, and the same capped page feeds every Activity card's per-week figure.

Both money errors flatter the community's collection rate, and they are wrong independently: correcting one does not correct the other. Since #170 shipped, the same page carries a chart computing the same two quantities correctly, so an Admin now sees a tile and a chart that disagree about the same Period.

Behind all three sits a fourth problem that this spec deliberately does **not** fix in code. `Membership` records a standing Payment Mode plus one queued switch, not a history. Once a queued switch lands, the mode that came before it is gone, so a settled Billing Period cannot be priced from the rows — and today it is answered wrongly rather than refused. That is a schema change with a backfill that can rewrite history in the same direction as the bug, and it wants a decision recorded before any code.

## Solution

The dashboard's figures are computed the way the rest of the product computes them: through the resolvers that already answer these questions, and from a query shaped like the question being asked.

- Dues collected counts only `MONTHLY` Payments, matching the per-Activity query directly beneath it in the same file, which was already corrected this way.
- Total owed counts a Membership only when `resolvePaymentMode` resolves it to `MONTHLY` for the Period being priced, exactly as `monthlyMemberCount` in `src/lib/dues-collection.ts` already does for the chart.
- Sessions this week is a `count`, not the length of a page. The page that remains is bounded on purpose or not at all, and says which in a comment.

And the Membership mode history gets an **Architecture Decision Record**, proposed in this run and accepted by the owner, in the shape ADR 0002 gave the Dues Rate — so the implementation run that follows starts from a settled backfill rule instead of inventing one.

## Goals

- The two money figures on the admin dashboard equal the corresponding bars of the Dues collected vs owed chart, on the same seed, in the same Period.
- No capacity or count figure on the dashboard is derived from the length of a paginated read.
- The shape of a Membership Payment Mode history is decided and written down, with its backfill rule stated, before anyone writes the migration.

## Non-goals

- Building the Membership mode history. This run writes the ADR and stops.
- Any change to how a Payment is created, confirmed or rejected, or to what a Participant is charged.
- Any new figure, tile, chart or date-range control on either dashboard.

## Constraints and trade-offs, with the reasons

- **A figure may not invent a mode history the schema does not record.** Where the rows cannot answer what mode a Membership was on in a settled Period, the answer stays the documented limit that `src/lib/dues-collection.ts` already carries and its tests already pin. Guessing at a past selection is exactly the class of error `docs/adr/0002-dues-rate-history.md` was written to prevent for Dues Rates. This is why the ADR comes before the code.
- **The correct arithmetic already exists.** `monthlyMemberCount` and `owedForPeriod` in `src/lib/dues-collection.ts` are the working reference, tested. The dashboard is brought onto them rather than growing a second implementation of the same rule — two implementations of one money rule is how the tile and the chart came to disagree in the first place.
- **One extra query is acceptable; a wrong count is not.** Production caps the pool at one connection per serverless function, so a second query is not free. A `count` alongside the existing `findMany` is one cheap query and it is the honest figure.
- **The ADR is proposed, not accepted, by an agent.** The three open questions it settles — what the backfill asserts about Memberships whose earlier modes are already lost, whether deactivation gets a recorded end, and whether the queued switch becomes the act of writing the next row — are owner decisions. The ticket writes the ADR with a recommendation and the alternatives, and it lands with `Status: Proposed`.

## Success criteria

- On the dev seed, the tile's `collected` and `totalDue` for the current Period equal the Dues collected vs owed chart's bars for that Period, read from the chart's accessible text list.
- A week seeded with seven non-cancelled Sessions reports seven, and every Activity card's per-week figure matches its own Sessions.
- Vitest covers both money exclusions — a Confirmed `SESSION` Payment is not collected Dues, and a `PER_SESSION` or unresolved Membership is not owed Dues — at the seam `src/lib/__tests__/dues-collection.test.ts` already covers.
- `docs/adr/0004-*` exists, names its three decisions, and is referenced from `src/lib/dues-collection.ts`'s limit comment.

## User Stories

1. As an Admin, I want the Dues collected figure to count only Dues, so that a Fee someone paid for one Session does not read as a month of Dues someone else owes.
2. As an Admin, I want the total owed figure to count only the Participants who owe Dues, so that the collection rate is not flattered by Per-Session members who owe nothing monthly.
3. As an Admin, I want the tile and the chart on the same page to agree about the same Period, so that I do not have to decide which of my own dashboards to believe.
4. As an Admin, I want the Sessions-this-week count to report every Session in the week, so that a busy week does not silently report as a quiet one.
5. As an Admin, I want each Activity card's weekly figure to count that Activity's own Sessions, so that a card is not capped by a page size that belongs to a panel which no longer exists.
6. As an Admin running two Activities twice a week, I want the dashboard to stay correct as the community grows, so that the figures do not quietly stop being true at seven Sessions.
7. As the Owner, I want a written decision about how a Membership's Payment Mode history will be recorded, so that the settled-Period figures can be made right without anyone guessing at what a member used to pay.
8. As the Owner, I want the backfill rule stated before the migration is written, so that filling in the past does not overwrite it in the same direction as the bug.
9. As a developer, I want the money rules to have exactly one implementation, so that a later change to how Dues are resolved cannot move the chart and leave the tile behind.
10. As a developer, I want a test that fails when a Fee is counted as Dues, so that the same defect cannot return through a different query.

## Implementation Decisions

- The admin dashboard's collected aggregate gains the same `type` filter its neighbouring per-Activity aggregate already carries. The two queries answer the same question about the same Period and are kept in step.
- The owed total resolves each Membership's Payment Mode for the Period being priced through the existing `resolvePaymentMode` seam before counting it. `monthlyMemberCount` is the reference implementation; the dashboard consumes the rule rather than restating it.
- The Sessions-this-week figure comes from a `count` scoped by the same date window and the same not-cancelled status as the list. Whatever page the list keeps is bounded deliberately, with a comment saying what bounds it, or is unbounded.
- The per-Activity weekly figures are derived from the same honest source as the headline count, not from a capped page.
- The Membership mode history ADR follows the structure of `docs/adr/0002-dues-rate-history.md`: one row per (Membership, effective-from Billing Period), resolution by the greatest effective-from not after the Period asked about, a beginning-of-time row, and a uniqueness constraint on the pair. It records a recommendation and the rejected alternatives for each of the three open questions, and it is written as `Status: Proposed`.
- No schema change, no migration and no backfill lands in this run.

## Testing Decisions

- A good test here asserts an **amount or a count for a Period**, never the shape of a query. The seam is the exported function that answers the question, not the Prisma call inside it.
- The money rules are tested where they already are: `src/lib/__tests__/dues-collection.test.ts` is the prior art, and it already pins the known limits so they stay known rather than becoming surprise regressions.
- The dashboard's own aggregation gains coverage at the highest seam that does not need a database: the pure function that turns member counts and rates into a total.
- The week count is pinned by a case that puts seven Sessions in one week and asserts seven — the number the old page size made unreachable.
- The recorded verification for this spec belongs to the run's single `TESTING.md` ticket, not to each ticket separately.

## Out of Scope

- Any change to `Membership`, to `prisma/schema.prisma`, or to `resolvePaymentMode`'s signature.
- Recording when a Membership was deactivated, and pricing departed members for the Periods they were present in. The ADR decides whether this happens; it does not happen here.
- Date-range selection, exports, drill-down, per-member analytics or forecasting on either dashboard.
- Any change to the charts themselves. They are the reference the tile is brought onto, and they are already correct.
- Reseeding or migrating production data.

## Further Notes

The wave-5 pinned check of map #175 — "the bar chart's current-Period figures equal the stat card's on the dev seed" — was written on the assumption that the tile was already right. It could not hold, and it is carried into this run as the acceptance criterion of the tile ticket instead.

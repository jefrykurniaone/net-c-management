/**
 * The reserved region between the admin dashboard's stat row / attention card
 * and its Activity cards grid (docs/spec-rally-admin-v1.md, Implementation
 * Decisions → Dashboard). #170 and #171 (spec `rally-insights`, run `rally`)
 * fill it with the Dues-collected-vs-owed bar chart, the money-by-Activity
 * donut and the seats-filled line chart; until either lands this is the whole
 * seam and it renders nothing, so today's dashboard is unaffected by the empty
 * slot.
 *
 * Consuming ticket: replace the `return null` below with the chart grid. The
 * call site is `<DashboardInsightsSlot />` in
 * `src/app/(admin)/admin/page.tsx`, between `DashboardAttentionCard` and
 * `DashboardActivityCards` — keep the component's name and that position so
 * this stays the one place a chart ticket needs to find.
 */
export function DashboardInsightsSlot() {
    return null;
}

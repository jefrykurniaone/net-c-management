import { DuesCollectionChart } from '@/components/charts/dues-collection-chart';
import { buildDuesCollectionView } from '@/lib/dues-collection-view';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { loadDuesCollectionSeries } from '@/lib/insights-data';

/**
 * The reserved region between the admin dashboard's stat row / attention card
 * and its Activity cards grid (docs/spec-rally-admin-v1.md, Implementation
 * Decisions → Dashboard).
 *
 * #170 fills the wide first row with the Dues collected-vs-owed bars. #171
 * (spec `rally-insights`, run `rally`) adds a second row of two — the
 * money-by-Activity donut and the seats-filled line — beside this one, loading
 * them the same way: a `load…` in `src/lib/insights-data.ts`, a `build…View`
 * beside it, and a client chart handed the finished view. The call site is
 * `<DashboardInsightsSlot />` in `src/app/(admin)/admin/page.tsx`, between
 * `DashboardAttentionCard` and `DashboardActivityCards` — keep the component's
 * name and that position so this stays the one place a chart ticket needs to
 * find.
 *
 * The dictionary is read here and never handed on: the charts are client
 * components, and passing `t` across that boundary would serialise every string
 * in the app into the page. They receive their own finished strings instead.
 */
export async function DashboardInsightsSlot({
    now,
    t,
}: Readonly<{ now: Date; t: Dictionary }>) {
    const duesSeries = await loadDuesCollectionSeries(now);

    return (
        <div className='grid gap-4'>
            <DuesCollectionChart view={buildDuesCollectionView(duesSeries, t)} />
        </div>
    );
}

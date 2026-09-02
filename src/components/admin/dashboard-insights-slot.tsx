import { DuesCollectionChart } from '@/components/charts/dues-collection-chart';
import { MoneyByActivityChart } from '@/components/charts/money-by-activity-chart';
import { SeatsFilledChart } from '@/components/charts/seats-filled-chart';
import { buildDuesCollectionView } from '@/lib/dues-collection-view';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
    loadDuesCollectionSeries,
    loadMoneyByActivitySeries,
    loadSeatsFilledSeries,
} from '@/lib/insights-data';
import { buildMoneyByActivityView } from '@/lib/money-by-activity-view';
import { buildSeatsFilledView } from '@/lib/seats-filled-view';

/**
 * The reserved region between the admin dashboard's stat row / attention card
 * and its Activity cards grid (docs/spec-rally-admin-v1.md, Implementation
 * Decisions → Dashboard).
 *
 * Two rows, per the insights spec's Placement: #170's Dues collected-vs-owed
 * bars run the full width, because six grouped pairs need it; #171's
 * money-by-Activity donut and Seats-filled line sit side by side beneath, and
 * stack under `lg` so each keeps its width on a phone. The next chart ticket
 * loads its series the same way — a `load…` in `src/lib/insights-data.ts`, a
 * `build…View` beside it, and a client chart handed the finished view. The call
 * site is `<DashboardInsightsSlot />` in `src/app/(admin)/admin/page.tsx`,
 * between `DashboardAttentionCard` and `DashboardActivityCards` — keep the
 * component's name and that position so this stays the one place a chart ticket
 * needs to find.
 *
 * The three reads are issued together because they share no data, not as a
 * latency claim: production caps the connection pool at one per function
 * (`src/lib/prisma.ts`), so the queries still queue there. Chaining them would
 * encode a dependency that does not exist.
 *
 * The dictionary is read here and never handed on: the charts are client
 * components, and passing `t` across that boundary would serialise every string
 * in the app into the page. They receive their own finished strings instead.
 */
export async function DashboardInsightsSlot({
    now,
    t,
}: Readonly<{ now: Date; t: Dictionary }>) {
    const [duesSeries, moneySeries, fillSeries] = await Promise.all([
        loadDuesCollectionSeries(now),
        loadMoneyByActivitySeries(now),
        loadSeatsFilledSeries(now),
    ]);

    return (
        <div className='grid gap-4'>
            <DuesCollectionChart view={buildDuesCollectionView(duesSeries, t)} />
            <div className='grid gap-4 lg:grid-cols-2'>
                <MoneyByActivityChart
                    view={buildMoneyByActivityView(moneySeries, t)}
                />
                <SeatsFilledChart view={buildSeatsFilledView(fillSeries, t)} />
            </div>
        </div>
    );
}

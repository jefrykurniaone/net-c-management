import { AttendanceSparklineChart } from '@/components/charts/attendance-sparkline-chart';
import { loadAttendanceSparklineSeries } from '@/lib/attendance-sparkline-data';
import { buildAttendanceSparklineView } from '@/lib/attendance-sparkline-view';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The member dashboard's own attendance sparkline (#172, spec
 * `docs/spec-rally-insights-v1.md`) — the one card the insights spec reserves
 * for the member surface. Mirrors the admin's
 * `src/components/admin/dashboard-insights-slot.tsx`: a `load…` in its own
 * module, a `build…View` beside it, and the client chart handed the finished
 * view.
 *
 * Kept as its own small async server component, called from
 * `src/app/(main)/dashboard/page.tsx` beside its existing `Promise.all`
 * rather than added into it, so that page's own read list — already seven
 * Prisma calls plus two loaders — does not grow, and the page file (already
 * close to the repo's 300-line cap) gains one import and one call site
 * instead of a `Promise.all` entry, a destructure, a view-build line and
 * their imports.
 */
export async function AttendanceSparklineCard({
    userId,
    now,
    t,
}: Readonly<{ userId: string; now: Date; t: Dictionary }>) {
    const series = await loadAttendanceSparklineSeries(userId, now);
    return <AttendanceSparklineChart view={buildAttendanceSparklineView(series, t)} />;
}

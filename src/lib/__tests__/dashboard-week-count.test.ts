import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadDashboardData } from '@/app/(admin)/admin/dashboard-data';
import { prisma } from '@/lib/prisma';

/**
 * The admin dashboard's "Sessions this week" tile and each Activity card's
 * weekly figure, pinned against the defect ticket #189 found: both were read
 * off a `findMany` capped at `take: 6`, a page size left behind by a removed
 * panel (#165). A week holding seven or more Sessions silently read as six.
 *
 * The fix separates the honest count (`prisma.activitySession.count`) from
 * the query still read for per-Activity aggregation — now narrowed to the one
 * field (`activityId`) that aggregation reads — so both figures below assert
 * against seven Sessions in one week, a count neither figure could have
 * reported correctly under the old `take: 6`.
 */

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: { count: vi.fn() },
        payment: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
        activity: { findMany: vi.fn() },
        activitySession: { count: vi.fn(), findMany: vi.fn() },
        attendance: { findMany: vi.fn() },
    },
}));

type SessionWeeklyRow = Awaited<ReturnType<typeof prisma.activitySession.findMany>>[number];
type ActivityFindManyResult = Awaited<ReturnType<typeof prisma.activity.findMany>>;

/** Thursday inside the ISO week 2026-08-31..2026-09-06. */
const NOW = new Date('2026-09-03T00:00:00.000Z');

const ACTIVITY_ID = 'act-1';

/** One Activity row, shaped to satisfy both `getActivities()` and the
 * dues-oriented `select` — the test shares one mock across both calls. */
const ACTIVITY_ROW = {
    id: ACTIVITY_ID,
    name: 'Padel',
    isActive: true,
    allowsMonthly: true,
    allowsPerSession: false,
    duesRates: [],
    memberships: [],
} as unknown as ActivityFindManyResult[number];

/** What the per-Activity `weeklyCounts` grouping actually reads: `activityId`
 * alone, per the `select: { activityId: true }` on that query. */
function weeklyRow(activityId: string): SessionWeeklyRow {
    return { activityId } as unknown as SessionWeeklyRow;
}

const SEVEN_SESSIONS_THIS_WEEK: SessionWeeklyRow[] = Array.from({ length: 7 }, () =>
    weeklyRow(ACTIVITY_ID),
);

describe('loadDashboardData - Sessions this week count (#189)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.user.count).mockResolvedValue(0);
        vi.mocked(prisma.payment.count).mockResolvedValue(0);
        vi.mocked(prisma.payment.aggregate).mockResolvedValue({
            _sum: { amount: null },
        } as Awaited<ReturnType<typeof prisma.payment.aggregate>>);
        vi.mocked(prisma.payment.groupBy).mockResolvedValue(
            [] as Awaited<ReturnType<typeof prisma.payment.groupBy>>,
        );
        vi.mocked(prisma.activity.findMany).mockResolvedValue([ACTIVITY_ROW]);
        vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
    });

    it('reports seven on the tile when the week holds seven non-cancelled Sessions', async () => {
        vi.mocked(prisma.activitySession.count).mockResolvedValue(7);
        // Two `activitySession.findMany` calls happen: the weekly-aggregation
        // query, then the under-booked query. Neither matters to this case.
        vi.mocked(prisma.activitySession.findMany).mockResolvedValue([]);

        const data = await loadDashboardData(NOW);

        expect(data.sessionsThisWeekCount).toBe(7);
    });

    it("counts an Activity's own seven weekly Sessions uncapped on its card", async () => {
        vi.mocked(prisma.activitySession.count).mockResolvedValue(7);
        // Call order matches `Promise.all`'s array order: the weekly-aggregation
        // query first (the seven rows this case pins), the under-booked query
        // second (empty — its own shape is out of scope here).
        vi.mocked(prisma.activitySession.findMany)
            .mockResolvedValueOnce(SEVEN_SESSIONS_THIS_WEEK)
            .mockResolvedValueOnce([]);

        const data = await loadDashboardData(NOW);

        const card = data.activityCards.find((c) => c.id === ACTIVITY_ID);
        expect(card?.sessionsPerWeek).toBe(7);
    });
});

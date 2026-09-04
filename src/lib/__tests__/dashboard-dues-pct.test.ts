import { PaymentMode } from '@prisma/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActivityCardData } from '@/app/(admin)/admin/dashboard-data';
import { loadDashboardData } from '@/app/(admin)/admin/dashboard-data';
import { BEGINNING_OF_TIME } from '@/lib/billing-period';
import type { MembershipMode } from '@/lib/payment-mode';
import { prisma } from '@/lib/prisma';

/**
 * What an Activity card claims about Dues, asserted as arithmetic.
 *
 * The defect (#273) was a ratio whose two halves answered different questions:
 * `confirmed` counted Confirmed `MONTHLY` Payments for the Period, and the
 * denominator was the Activity's whole roster, resolved through nothing. An
 * Activity carrying Per-Session or unchosen Memberships therefore read as
 * under-collecting for members who owe no Dues, and the `Math.min` cap on the
 * percentage hid it rather than fixing it — which is why every case below
 * asserts a percentage, never the shape of a query.
 *
 * The rule they pin is the one the "Dues collected" tile already prices
 * `totalDue` by (#203): only a Membership `resolvePaymentMode` resolves to
 * `MONTHLY` for the Period being read owes Dues in it. `members` stays what its
 * label says — the roster headcount — so both figures are asserted together
 * wherever they differ.
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

type ActivityFindManyResult = Awaited<ReturnType<typeof prisma.activity.findMany>>;
type PaymentGroupByResult = Awaited<ReturnType<typeof prisma.payment.groupBy>>;

/** A Thursday well inside September 2026, so no timezone shifts the Period. */
const NOW = new Date('2026-09-03T00:00:00.000Z');

/** The Period `NOW` falls in, and the one after it, as stored YYYYMM keys. */
const SEPTEMBER = 202609;
const OCTOBER = 202610;

const ACTIVITY_ID = 'act-1';
const RATE_75K = { amount: 75_000, effectiveFrom: BEGINNING_OF_TIME };

/** A Membership standing on Monthly since forever, with nothing queued. */
function membership(overrides: Partial<MembershipMode> = {}): MembershipMode {
    return {
        paymentMode: PaymentMode.MONTHLY,
        effectiveFrom: BEGINNING_OF_TIME,
        pendingMode: null,
        pendingEffectiveFrom: null,
        ...overrides,
    };
}

/**
 * One Activity offering both modes — the seed's shape, and the only one where a
 * Membership can resolve to no mode at all. Shaped to satisfy `getActivities()`
 * and the dues-oriented `select` at once, as `dashboard-week-count.test.ts` does.
 */
function activityRow(
    memberships: readonly MembershipMode[],
): ActivityFindManyResult[number] {
    return {
        id: ACTIVITY_ID,
        name: 'Badminton',
        isActive: true,
        allowsMonthly: true,
        allowsPerSession: true,
        duesRates: [RATE_75K],
        memberships,
    } as unknown as ActivityFindManyResult[number];
}

/** The card the dashboard builds for one roster and one count of Confirmed Dues. */
async function cardFor(
    memberships: readonly MembershipMode[],
    confirmedDues: number,
): Promise<ActivityCardData> {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([activityRow(memberships)]);
    vi.mocked(prisma.payment.groupBy).mockResolvedValue([
        { activityId: ACTIVITY_ID, _count: confirmedDues },
    ] as unknown as PaymentGroupByResult);
    const data = await loadDashboardData(NOW);
    const card = data.activityCards.find((c) => c.id === ACTIVITY_ID);
    if (card === undefined) {
        throw new Error('the dashboard built no card for the Activity under test');
    }
    return card;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.payment.count).mockResolvedValue(0);
    vi.mocked(prisma.payment.aggregate).mockResolvedValue({
        _sum: { amount: null },
    } as Awaited<ReturnType<typeof prisma.payment.aggregate>>);
    vi.mocked(prisma.activitySession.count).mockResolvedValue(0);
    vi.mocked(prisma.activitySession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
});

describe('an Activity card, Dues paid over the Memberships that owe Dues', () => {
    it.each([
        {
            beside: 'a Per-Session Membership, whose Seats are funded by Fees',
            other: membership({ paymentMode: PaymentMode.PER_SESSION }),
            duesMembers: 1,
            duesPct: 100,
        },
        {
            beside: 'a Membership that has chosen no mode where both are offered',
            other: membership({ paymentMode: null }),
            duesMembers: 1,
            duesPct: 100,
        },
        {
            beside: 'a Membership whose switch away arrived this Period',
            other: membership({
                pendingMode: PaymentMode.PER_SESSION,
                pendingEffectiveFrom: SEPTEMBER,
            }),
            duesMembers: 1,
            duesPct: 100,
        },
        {
            beside: 'a Membership whose switch away only lands next Period',
            other: membership({
                pendingMode: PaymentMode.PER_SESSION,
                pendingEffectiveFrom: OCTOBER,
            }),
            duesMembers: 2,
            duesPct: 50,
        },
    ])(
        'one Monthly member has paid, beside $beside',
        async ({ other, duesMembers, duesPct }) => {
            const card = await cardFor([membership(), other], 1);

            expect(card.duesMembers).toBe(duesMembers);
            expect(card.duesPct).toBe(duesPct);
            expect(card.confirmed).toBe(1);
            expect(card.members).toBe(2);
        },
    );

    it('reports 0 of 0 where no Membership owes Dues, however many Payments landed', async () => {
        const perSession = membership({ paymentMode: PaymentMode.PER_SESSION });

        const card = await cardFor([perSession, perSession], 2);

        expect(card.duesMembers).toBe(0);
        expect(card.confirmed).toBe(0);
        expect(card.duesPct).toBe(0);
        expect(card.members).toBe(2);
    });

    it('never reads above 100% when a Payment outlives the Membership that made it', async () => {
        const card = await cardFor([membership()], 3);

        expect(card.confirmed).toBe(1);
        expect(card.duesPct).toBe(100);
    });
});

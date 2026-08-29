import 'server-only';
import type { Activity, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { BillingPeriod } from '@/lib/billing-period';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';

/**
 * The Activities register's read: one row per Activity, each carrying its Dues
 * Rate history so the Dues column can print what **this** Billing Period
 * charges rather than a live field.
 *
 * Sorting by Dues cannot be an `orderBy`. The current rate is not a column — it
 * is the row with the greatest effective-from that is not after this Period, so
 * ranking Activities by it means resolving each one first. That path therefore
 * reads every matching Activity, resolves, sorts, and takes the page in memory;
 * every other sort keeps its `orderBy` and its `LIMIT`. An Activities register
 * is tens of rows, not thousands, and the alternative — a cached "current rate"
 * column — is the cache ADR 0002 rejected, because its value must change on a
 * Period boundary that no write passes through.
 */

/** The `sortBy` the Dues column emits. */
export const ACTIVITY_DUES_SORT_KEY = 'dues';

/** The rate columns the register resolves through. */
const DUES_RATE_SELECT = { amount: true, effectiveFrom: true } as const;

const DUES_RATE_INCLUDE = {
    duesRates: { select: DUES_RATE_SELECT },
} as const;

/** An Activity with the rate rows every Dues read on this surface goes through. */
export type ActivityRegisterRow = Activity & {
    duesRates: DuesRateRow[];
};

type SortDir = 'asc' | 'desc';

type RegisterQuery = Readonly<{
    where: Prisma.ActivityWhereInput;
    sortBy: string;
    sortDir: SortDir;
    skip: number | undefined;
    take: number | undefined;
    period: BillingPeriod;
}>;

/**
 * An inactive Activity sinks to the bottom of the name sort, the standing sort
 * puts it where the direction asks, and `name` breaks every tie. Unchanged from
 * before Dues moved off the `monthlyFee` column — including that the **Dues**
 * sort never routes through here and so, like the old `monthlyFee` branch,
 * ranks active and inactive Activities together.
 */
function buildActivityOrderBy(
    sortBy: string,
    dir: SortDir,
): Prisma.ActivityOrderByWithRelationInput[] {
    if (sortBy === 'status') {
        return [{ isActive: dir === 'asc' ? 'desc' : 'asc' }, { name: 'asc' }];
    }
    return [{ isActive: 'desc' }, { name: dir }];
}

/**
 * An Activity no rate row covers sorts below every real amount, including 0.
 * That is a broken invariant rather than a free Activity, and the cell says so
 * in words — but it still has to land somewhere in an ordered list.
 */
const NO_RATE_SORT_VALUE = -1;

function byCurrentRate(period: BillingPeriod, dir: SortDir) {
    return (a: ActivityRegisterRow, b: ActivityRegisterRow): number => {
        const left = resolveDuesRate(a.duesRates, period) ?? NO_RATE_SORT_VALUE;
        const right = resolveDuesRate(b.duesRates, period) ?? NO_RATE_SORT_VALUE;
        if (left !== right) {
            return dir === 'asc' ? left - right : right - left;
        }
        return a.name.localeCompare(b.name);
    };
}

async function fetchSortedByCurrentRate(
    query: RegisterQuery,
): Promise<ActivityRegisterRow[]> {
    const rows = await prisma.activity.findMany({
        where: query.where,
        include: DUES_RATE_INCLUDE,
    });
    rows.sort(byCurrentRate(query.period, query.sortDir));
    const from = query.skip ?? 0;
    const to = query.take === undefined ? undefined : from + query.take;
    return rows.slice(from, to);
}

function fetchPage(query: RegisterQuery): Promise<ActivityRegisterRow[]> {
    if (query.sortBy === ACTIVITY_DUES_SORT_KEY) {
        return fetchSortedByCurrentRate(query);
    }
    return prisma.activity.findMany({
        where: query.where,
        orderBy: buildActivityOrderBy(query.sortBy, query.sortDir),
        skip: query.skip,
        take: query.take,
        include: DUES_RATE_INCLUDE,
    });
}

/** The page of rows the register draws, and the total the pagination counts. */
export async function fetchActivityRegister(
    query: RegisterQuery,
): Promise<{ rows: ActivityRegisterRow[]; total: number }> {
    const [rows, total] = await Promise.all([
        fetchPage(query),
        prisma.activity.count({ where: query.where }),
    ]);
    return { rows, total };
}

import 'server-only';
import { currentPeriod, toPeriodKey, type BillingPeriod } from './billing-period';
import { chartWeeks, type ChartWeek } from './chart-weeks';
import {
    duesChartPeriods,
    resolveDuesCollectionSeries,
    type DuesChartActivity,
    type DuesCollectionSeries,
} from './dues-collection';
import { skippedDuesRateLog } from './dues-collection-view';
import {
    resolveMoneyByActivitySeries,
    type MoneyByActivitySeries,
} from './money-by-activity';
import { unplacedFeeLog } from './money-by-activity-view';
import { prisma } from './prisma';
import {
    resolveSeatsFilledSeries,
    type SeatsFilledSeries,
} from './seats-filled';
import { wibDayStart } from './wib';

/**
 * The admin dashboard's insight charts, read from the database (#170).
 *
 * Thin by design: each loader queries the window its chart is about and hands
 * plain rows to the pure resolver that does the arithmetic. Nothing here adds,
 * multiplies or excludes a Payment — every money rule lives in
 * `src/lib/dues-collection.ts`, where a unit test can reach it. #171's donut and
 * fill-rate line land beside these as their own `fetch…Rows` / `load…` pair.
 *
 * **This module writes nothing.** Charts read.
 */

/**
 * Active Activities with their Dues Rate history and their live Memberships,
 * plus every Payment carrying one of the six Periods' month/year.
 *
 * The Payment query narrows by the Period window and by nothing else. It could
 * have filtered `status` and `type` in SQL and returned less, and deliberately
 * does not: which Payments count is a money rule, and a money rule enforced
 * only in a `where` clause is a rule no test runs. The resolver applies it to
 * every row it is given, so the path the tests cover is the path production
 * takes.
 *
 * Rate rows are read as rows, never as a figure — `resolveDuesRate` says which
 * of them prices a Period (`docs/adr/0002-dues-rate-history.md`) — and no order
 * is assumed of them.
 */
async function fetchDuesChartRows(periods: readonly BillingPeriod[]) {
    const [activities, payments] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            select: {
                id: true,
                allowsMonthly: true,
                allowsPerSession: true,
                duesRates: { select: { amount: true, effectiveFrom: true } },
                memberships: {
                    where: { isActive: true },
                    select: {
                        paymentMode: true,
                        effectiveFrom: true,
                        pendingMode: true,
                        pendingEffectiveFrom: true,
                        joinedAt: true,
                    },
                },
            },
        }),
        prisma.payment.findMany({
            where: {
                OR: periods.map((period) => ({
                    month: period.month,
                    year: period.year,
                })),
            },
            select: {
                amount: true,
                month: true,
                year: true,
                status: true,
                type: true,
            },
        }),
    ]);

    return { activities, payments };
}

type DuesChartRows = Awaited<ReturnType<typeof fetchDuesChartRows>>;

/**
 * One Activity row as the resolver reads it. The only derivation is
 * `joinedPeriodKey`: `joinedAt` is an instant and the resolver compares
 * Periods, and `currentPeriod` is the one function that turns one into the
 * other.
 */
function toChartActivity(row: DuesChartRows['activities'][number]): DuesChartActivity {
    return {
        id: row.id,
        allowsMonthly: row.allowsMonthly,
        allowsPerSession: row.allowsPerSession,
        duesRates: row.duesRates,
        memberships: row.memberships.map((membership) => {
            const joined = currentPeriod(membership.joinedAt);
            return {
                paymentMode: membership.paymentMode,
                effectiveFrom: membership.effectiveFrom,
                pendingMode: membership.pendingMode,
                pendingEffectiveFrom: membership.pendingEffectiveFrom,
                joinedPeriodKey: toPeriodKey(joined.month, joined.year),
            };
        }),
    };
}

/**
 * Every Activity the series could not price, said out loud.
 *
 * The dashboard's stat tile already logs the same broken invariant for the
 * current Period (`dashboard-dues-total.ts`); the chart says it for each of the
 * six, so the two surfaces never disagree about which Activity is missing a
 * rate.
 */
function reportSkippedRates(series: DuesCollectionSeries): void {
    for (const skip of series.skipped) {
        console.error(skippedDuesRateLog(skip.activityId, skip.periodKey));
    }
}

/** Dues collected against Dues owed for the six Periods ending with `now`. */
export async function loadDuesCollectionSeries(
    now: Date,
): Promise<DuesCollectionSeries> {
    const rows = await fetchDuesChartRows(duesChartPeriods(now));
    const series = resolveDuesCollectionSeries({
        activities: rows.activities.map(toChartActivity),
        payments: rows.payments,
        now,
    });
    reportSkippedRates(series);
    return series;
}

/**
 * Every Payment that either names this Period or hangs off a Session inside it,
 * plus the active Activities the ring lists at zero (#171).
 *
 * **Two windows, unioned in SQL, and neither is a money rule.** A Dues row is
 * found by the Period it names; a Fee is found through its Session's date,
 * because that is what places a Fee (see `money-by-activity.ts`). Narrowing on
 * the Fee's own `month`/`year` instead would trust a derived copy of the very
 * date the rule is about. Status and type are again deliberately not filtered:
 * which Payments count is a money rule, and a money rule enforced only in a
 * `where` clause is a rule no test runs.
 *
 * The Session's date arrives through the relation rather than a second query:
 * one round trip, one column, and a `null` handed straight to the resolver for
 * a Fee that names no Session — the case it decides explicitly — instead of a
 * lookup miss that would be indistinguishable from a row this loader forgot.
 *
 * The Activity name rides on the Payment as well as on the Activity list, so an
 * Activity deactivated since it took money still has a label and its money
 * still reaches the total.
 */
async function fetchMoneyChartRows(period: BillingPeriod) {
    const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
    const periodEnd = new Date(Date.UTC(period.year, period.month, 1));
    const [activities, payments] = await Promise.all([
        prisma.activity.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        }),
        prisma.payment.findMany({
            where: {
                OR: [
                    { month: period.month, year: period.year },
                    { session: { date: { gte: periodStart, lt: periodEnd } } },
                ],
            },
            select: {
                id: true,
                activityId: true,
                amount: true,
                month: true,
                year: true,
                status: true,
                type: true,
                activity: { select: { name: true } },
                session: { select: { date: true } },
            },
        }),
    ]);

    return { activities, payments };
}

type MoneyChartRows = Awaited<ReturnType<typeof fetchMoneyChartRows>>;

/**
 * A stored Session date, guaranteed to be UTC midnight of its WIB calendar day
 * — which is what both resolvers document as their input and what the schema
 * requires (`ActivitySession.date`, lines 259-262).
 *
 * `wibDayStart` is the identity on a correct row and corrective on a legacy one:
 * a `T17:00:00Z` instant, the shape #197 found and fixed, names WIB midnight of
 * the *following* day, and left raw it would bill a Fee to the wrong Period and
 * count a Session in the wrong week. Normalising at the read boundary means
 * neither resolver has to know that history. It cannot recover a legacy row the
 * query's own bounds excluded — one falling on the first day of a window — and
 * the bounds are deliberately not widened by a day for a shape the schema
 * forbids.
 */
function toWibDay(date: Date): Date {
    return wibDayStart(date);
}

/**
 * One Payment row as the resolver reads it. Flattened field by field rather
 * than spread, so the two derivations are the only difference and both are
 * visible: the Activity's name off its relation, and the Session's date — or
 * `null`, which is the resolver's `unplaced` case and not an accident.
 */
function toChartPayment(row: MoneyChartRows['payments'][number]) {
    return {
        id: row.id,
        activityId: row.activityId,
        activityName: row.activity.name,
        amount: row.amount,
        month: row.month,
        year: row.year,
        status: row.status,
        type: row.type,
        sessionDate: row.session ? toWibDay(row.session.date) : null,
    };
}

/** Every Fee the series could not place, said out loud. */
function reportUnplacedFees(series: MoneyByActivitySeries): void {
    for (const fee of series.unplacedFees) {
        console.error(unplacedFeeLog(fee.paymentId, fee.activityId));
    }
}

/** This Period's Confirmed money, Dues and Fees together, per Activity. */
export async function loadMoneyByActivitySeries(
    now: Date,
): Promise<MoneyByActivitySeries> {
    const rows = await fetchMoneyChartRows(currentPeriod(now));
    const series = resolveMoneyByActivitySeries({
        activities: rows.activities,
        payments: rows.payments.map(toChartPayment),
        now,
    });
    reportUnplacedFees(series);
    return series;
}

/**
 * Every Session in the eight-week window with its Attendance rows (#171).
 *
 * `date` is the only narrow: the Session's own status and each Attendance row's
 * status come back untouched, because "cancelled Sessions do not count" and
 * "only Registered and Present hold a Seat" are the two rules this chart *is*,
 * and both belong in the resolver a unit test can reach. The rows arrive nested
 * so one round trip serves both the denominator and the numerator.
 *
 * The window runs to the end of the current week, not to today, so a Session
 * already posted for later this week is in the denominator — the fill rate of a
 * week in progress, which is what the caption tells the reader it is.
 *
 * **No hold sweep.** `releaseExpiredHolds` writes, and charts read.
 * `seats-filled.ts` records what that costs.
 */
async function fetchFillChartRows(weeks: readonly ChartWeek[]) {
    return prisma.activitySession.findMany({
        where: {
            date: {
                gte: weeks[0].start,
                lt: weeks[weeks.length - 1].end,
            },
        },
        select: {
            id: true,
            date: true,
            maxPlayers: true,
            status: true,
            attendances: { select: { status: true } },
        },
    });
}

/** Seats held over capacity for the eight weeks ending with `now`. */
export async function loadSeatsFilledSeries(
    now: Date,
): Promise<SeatsFilledSeries> {
    const rows = await fetchFillChartRows(chartWeeks(now));
    return resolveSeatsFilledSeries({
        sessions: rows.map(({ id, date, maxPlayers, status }) => ({
            id,
            date: toWibDay(date),
            maxPlayers,
            status,
        })),
        attendances: rows.flatMap((row) =>
            row.attendances.map((attendance) => ({
                sessionId: row.id,
                status: attendance.status,
            })),
        ),
        now,
    });
}

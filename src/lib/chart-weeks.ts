import { wibDayStart } from './wib';

/**
 * The week window every weekly trend chart in the insights spec runs on: eight
 * weeks ending with the one containing `now`, each opening on a Monday
 * (`docs/spec-rally-insights-v1.md`, Series definitions).
 *
 * **It exists because two charts need the same eight weeks.** #171's Seats
 * filled line and #172's member attendance sparkline are the same window read
 * two ways, and a second copy of "the last eight weeks, Monday-start" is a
 * second place for the boundary to be wrong. `duesChartPeriods` in
 * `dues-collection.ts` is the precedent, and this is its weekly sibling.
 *
 * **Pure, and free of `server-only`** — no clock (`now` is a parameter), no
 * database, no dictionary. It sits here rather than beside either loader so a
 * member-side module can import it without pulling an admin read in with it.
 *
 * **Every edge is the WIB calendar day**, never a raw UTC or server-local one.
 * A Session is stored as UTC midnight of its WIB day
 * (`ActivitySession.date`, and #197), so a week edge built with `Date.UTC` and
 * read with the `getUTC*` accessors lines up with the stored dates exactly;
 * a locale-aware formatter or `getDay()` would shift the Monday by whatever
 * zone the server happens to run in.
 *
 * The Monday rule lives here, in {@link mondayOf}, and nowhere else.
 * `src/lib/sessions-board.ts` is `server-only` and Prisma-bound, so it cannot
 * be the shared home for a pure rule; instead it imports {@link mondayOf} from
 * here, which is why this module must stay free of `server-only` and Prisma.
 */

/**
 * How many weeks a weekly trend covers, ending with the current one. Eight, per
 * the spec: two months of direction, and eight ticks still read at 390px.
 */
export const CHART_WEEKS = 8;

const DAYS_IN_WEEK = 7;
/** Days back from a Sunday to reach its Monday — `getUTCDay()` is Sunday-0. */
const SUNDAY_SHIFT = DAYS_IN_WEEK - 1;
const DAY_KEY_LENGTH = 'YYYY-MM-DD'.length;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = DAYS_IN_WEEK * MS_PER_DAY;

/** One week of a trend: the Monday it opens on and the Monday it stops before. */
export interface ChartWeek {
    /** UTC midnight of the Monday that opens the week. */
    readonly start: Date;
    /**
     * UTC midnight of the *next* Monday — the exclusive end, so it is directly
     * usable as a `lt` bound and no caller has to add a day itself.
     */
    readonly end: Date;
    /** `YYYY-MM-DD` of {@link start}: a stable React key and axis identity. */
    readonly key: string;
}

/** `delta` days from `day`, on the UTC calendar the stored dates live on. */
function addDays(day: Date, delta: number): Date {
    return new Date(
        Date.UTC(
            day.getUTCFullYear(),
            day.getUTCMonth(),
            day.getUTCDate() + delta,
        ),
    );
}

/** The Monday of the week containing `day`. Monday because a week starts there. */
export function mondayOf(day: Date): Date {
    const back = (day.getUTCDay() + SUNDAY_SHIFT) % DAYS_IN_WEEK;
    return addDays(day, -back);
}

/**
 * The {@link CHART_WEEKS} weeks a trend covers, oldest first, ending with the
 * week containing `now`.
 *
 * The last week is deliberately the *whole* current week, not the part of it
 * that has happened: a chart that stopped at today would compare seven days of
 * history against two days of this week and read as a collapse. A caller
 * reporting on the current week says so instead.
 */
export function chartWeeks(now: Date): ChartWeek[] {
    const thisMonday = mondayOf(wibDayStart(now));
    const weeks: ChartWeek[] = [];
    for (let back = CHART_WEEKS - 1; back >= 0; back -= 1) {
        const start = addDays(thisMonday, -back * DAYS_IN_WEEK);
        weeks.push({
            start,
            end: addDays(start, DAYS_IN_WEEK),
            key: start.toISOString().slice(0, DAY_KEY_LENGTH),
        });
    }
    return weeks;
}

/**
 * Which of `weeks` holds `day`, or `-1` when the day falls outside the window.
 *
 * `day` must already be a WIB calendar day at UTC midnight — a stored
 * `ActivitySession.date`, or an instant put through `wibDayStart` first. The
 * weeks are contiguous and UTC-midnight aligned, so the index is one division
 * rather than a scan, and `-1` is returned rather than a clamped index so a
 * caller can never silently credit a Session to a week it is not in.
 */
export function weekIndexOfDay(
    weeks: readonly ChartWeek[],
    day: Date,
): number {
    if (weeks.length === 0) {
        return -1;
    }
    const offset = day.getTime() - weeks[0].start.getTime();
    if (offset < 0) {
        return -1;
    }
    const index = Math.floor(offset / MS_PER_WEEK);
    return index < weeks.length ? index : -1;
}

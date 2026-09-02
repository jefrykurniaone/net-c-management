import 'server-only';
import {
    resolveAttendanceSparklineSeries,
    type AttendanceSparklineSeries,
} from './attendance-sparkline';
import { chartWeeks, type ChartWeek } from './chart-weeks';
import { prisma } from './prisma';
import { wibDayStart } from './wib';

/**
 * The member dashboard's own attendance sparkline, read from the database
 * (#172). Its own module rather than an addition to `src/lib/insights-data.ts`
 * (#171's file, out of scope here) — thin in the same shape: a private
 * `fetch…Rows` scoped to the window, and one exported `load…Series` handing
 * plain rows to the pure resolver that does the counting.
 *
 * **Every status is fetched, none filtered in SQL.** Which Attendance rows
 * count as "played" is `attendance-sparkline.ts`'s `PRESENT`-only rule, and a
 * rule enforced only in a `where` clause is a rule no unit test reaches — the
 * same reasoning `insights-data.ts` states for its own Payment and Session
 * reads. `userId` and the date window are the only narrows: scoping which
 * rows exist to read is not a domain rule, it is the loader's one job.
 *
 * **This module writes nothing.** Charts read.
 */
async function fetchAttendanceSparklineRows(
    userId: string,
    weeks: readonly ChartWeek[],
) {
    return prisma.attendance.findMany({
        where: {
            userId,
            session: {
                date: {
                    gte: weeks[0].start,
                    lt: weeks[weeks.length - 1].end,
                },
            },
        },
        select: {
            status: true,
            session: { select: { date: true } },
        },
    });
}

/** The member's own attendance sparkline for the eight weeks ending with `now`. */
export async function loadAttendanceSparklineSeries(
    userId: string,
    now: Date,
): Promise<AttendanceSparklineSeries> {
    const weeks = chartWeeks(now);
    const rows = await fetchAttendanceSparklineRows(userId, weeks);
    return resolveAttendanceSparklineSeries({
        attendances: rows.map((row) => ({
            // `session.date` is UTC midnight of its WIB day already
            // (`ActivitySession.date`, #197); `wibDayStart` is the identity on
            // a correct row and corrective on a legacy one, as
            // `insights-data.ts`'s `toWibDay` documents for the admin charts.
            date: wibDayStart(row.session.date),
            status: row.status,
        })),
        now,
    });
}

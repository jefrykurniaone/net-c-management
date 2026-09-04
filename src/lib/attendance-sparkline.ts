import { AttendanceStatus } from '@prisma/client';
import { chartWeeks, weekIndexOfDay, type ChartWeek } from './chart-weeks';

/**
 * The member dashboard's own attendance sparkline, week by week (#172, spec
 * `docs/spec-rally-insights-v1.md`).
 *
 * **The figure, exactly.** For each of the eight weeks in `chartWeeks(now)`:
 * the count of the member's own `PRESENT` Attendance rows whose Session falls
 * in that week. The question this chart answers is "did I play", never "was a
 * Seat held" — that is `src/lib/seats-filled.ts`'s question, over every
 * member's Seats rather than this member's Present rows alone, which is why
 * `REGISTERED` (a held Seat, no attendance yet), `MAYBE`, `ABSENT` (Opted Out)
 * and `NO_SHOW` all leave a row out of the count here.
 *
 * **Status is filtered here, not in the loader's query**
 * (`docs/adr/0005-pure-rule-modules.md`): `src/lib/attendance-sparkline-data.ts`
 * fetches every status for the window and lets this module decide.
 *
 * **Every week is a real number, never a gap.** Unlike the Seats-filled line,
 * there is no "nothing posted" state to distinguish here: a week the member
 * did not play is `0`, a real count, because the eight-week window is always
 * eight real weeks and a member's own quiet week is exactly what this chart
 * exists to show. `resolveAttendanceSparklineSeries` never returns `null` —
 * the acceptance criterion "empty history -> eight zeros" is this, literally.
 * Whether an *entirely* empty eight-week history still draws that flat zero
 * line, or shows the neutral empty state instead, is a card-level decision
 * made in `src/lib/attendance-sparkline-view.ts`, not here.
 *
 * A pure rule module (`docs/adr/0005-pure-rule-modules.md`). Which `userId` the
 * rows belong to is never a concept it holds — the loader scopes the query to
 * one member before a row ever reaches here, so a scoping mistake shows up as a
 * wrong loader test, not as arithmetic this module could paper over.
 */

/** One Attendance row as this chart reads it, with its status left in to be judged. */
export interface AttendanceSparklineRow {
    /** UTC midnight of the Session's WIB calendar day. */
    readonly date: Date;
    readonly status: AttendanceStatus;
}

export interface AttendanceSparklineInput {
    readonly attendances: readonly AttendanceSparklineRow[];
    readonly now: Date;
}

/** One week's point on the line: the week and how many Present rows landed in it. */
export interface AttendanceSparklinePoint {
    readonly week: ChartWeek;
    readonly count: number;
}

export interface AttendanceSparklineSeries {
    /** Exactly `CHART_WEEKS` points, oldest first. */
    readonly points: readonly AttendanceSparklinePoint[];
}

function emptyTallies(weekCount: number): number[] {
    return Array.from({ length: weekCount }, () => 0);
}

/**
 * The whole series: eight weeks of the member's own Present count, oldest
 * first. A row outside the window, or naming a status other than `PRESENT`,
 * is dropped rather than counted into an edge week — `weekIndexOfDay` already
 * refuses to clamp.
 */
export function resolveAttendanceSparklineSeries(
    input: AttendanceSparklineInput,
): AttendanceSparklineSeries {
    const weeks = chartWeeks(input.now);
    const tallies = emptyTallies(weeks.length);
    for (const row of input.attendances) {
        if (row.status !== AttendanceStatus.PRESENT) {
            continue;
        }
        const index = weekIndexOfDay(weeks, row.date);
        if (index >= 0) {
            tallies[index] += 1;
        }
    }
    return {
        points: weeks.map((week, index) => ({ week, count: tallies[index] })),
    };
}

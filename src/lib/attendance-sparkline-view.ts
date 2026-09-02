import type {
    AttendanceSparklinePoint,
    AttendanceSparklineSeries,
} from './attendance-sparkline';
import type { ChartWeek } from './chart-weeks';
import type { Dictionary } from './i18n/dictionaries';

/**
 * The member's attendance sparkline in their own words (#172): the eight
 * points, the current week's headline count, and the text list that carries
 * the same figures to anyone who cannot see the line.
 *
 * Purely presentational over `src/lib/attendance-sparkline.ts`, in the shape
 * `seats-filled-view.ts` established: nothing here counts a Present row or
 * reads a clock, it turns one finished series into sentences.
 *
 * **The empty-history decision.** The resolver always returns eight real
 * numbers, never a gap — but eight weeks of zero is a member who has not
 * played at all, and the ticket's "never a reproach" rule means that case
 * gets #169's neutral chip and one sentence in the chart's place, not a flat
 * line sitting at zero for two months. `hasPlayed` is the gate: any week with
 * a Present row keeps every week in `values` (the quiet ones included, same
 * as the fill line does for a week that ran and took no Seats), and only a
 * member with none at all sees the empty state.
 */

/** Jan/Feb/Mar in English, Jan/Feb/Mei in Indonesian — the axis abbreviation. */
const MONTH_ABBREVIATION_LENGTH = 3;

/** One point on the sparkline. */
export interface AttendanceSparklineDot {
    readonly label: string;
    readonly count: number;
    /**
     * The same figure as text — `"2 Present"`. Formatted here because the
     * chart wrapper's contract is that every displayed value arrives finished
     * (#169).
     */
    readonly display: string;
}

/** One row of the figure's text list — the accessibility contract of #169. */
export interface AttendanceSparklineValueRow {
    readonly label: string;
    readonly value: string;
}

/** Everything the card draws, decided here and nowhere else. */
export interface AttendanceSparklineView {
    readonly title: string;
    readonly caption: string;
    /** The current week's Present count — the last point, restated for the headline. */
    readonly headlineCount: number;
    readonly headlineLabel: string;
    /** Empty when there is nothing to draw, which tips the figure into its empty state. */
    readonly dots: readonly AttendanceSparklineDot[];
    readonly values: readonly AttendanceSparklineValueRow[];
    /** The series' name, for the tooltip row and the chart config. */
    readonly seriesLabel: string;
    readonly valuesToggleLabel: string;
    readonly valuesListLabel: string;
    readonly emptyChipLabel: string;
    readonly emptyMessage: string;
}

/** `{token}` substitution, one occurrence per token. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
    return Object.entries(values).reduce(
        (text, [token, value]) => text.replace(`{${token}}`, value),
        template,
    );
}

/**
 * The Monday's calendar parts, read with the `getUTC*` accessors because the
 * week edge is UTC midnight of a WIB day. Both locales get all three tokens
 * and order them in their own template — English puts the month first,
 * Indonesian the day.
 */
function weekDateTokens(
    week: ChartWeek,
    t: Dictionary,
    isAbbreviated: boolean,
): Record<string, string> {
    const month = t.months[week.start.getUTCMonth() + 1];
    return {
        month: isAbbreviated
            ? month.slice(0, MONTH_ABBREVIATION_LENGTH)
            : month,
        day: String(week.start.getUTCDate()),
        year: String(week.start.getUTCFullYear()),
    };
}

function toDot(point: AttendanceSparklinePoint, t: Dictionary): AttendanceSparklineDot {
    return {
        label: fill(t.insights.attendanceAxisDate, weekDateTokens(point.week, t, true)),
        count: point.count,
        display: fill(t.insights.attendanceValueRow, { n: String(point.count) }),
    };
}

function toValueRow(
    point: AttendanceSparklinePoint,
    t: Dictionary,
): AttendanceSparklineValueRow {
    return {
        label: fill(t.insights.attendanceWeekLabel, weekDateTokens(point.week, t, false)),
        value: fill(t.insights.attendanceValueRow, { n: String(point.count) }),
    };
}

/**
 * Whether the member played at all in the window — the empty-state gate.
 * See the module doc for why this differs from the fill line's `hasSessions`.
 */
function hasPlayed(series: AttendanceSparklineSeries): boolean {
    return series.points.some((point) => point.count > 0);
}

/** Read one finished series into the card that draws it. */
export function buildAttendanceSparklineView(
    series: AttendanceSparklineSeries,
    t: Dictionary,
): AttendanceSparklineView {
    const drawn = hasPlayed(series) ? series.points : [];
    return {
        title: t.insights.attendanceTitle,
        caption: t.insights.attendanceCaption,
        headlineCount: series.points.at(-1)?.count ?? 0,
        headlineLabel: t.insights.attendanceHeadlineLabel,
        dots: drawn.map((point) => toDot(point, t)),
        values: drawn.map((point) => toValueRow(point, t)),
        seriesLabel: t.insights.attendanceSeriesLabel,
        valuesToggleLabel: t.insights.valuesToggle,
        valuesListLabel: t.insights.valuesListLabel,
        emptyChipLabel: t.insights.emptyChip,
        emptyMessage: t.insights.emptyMessage,
    };
}

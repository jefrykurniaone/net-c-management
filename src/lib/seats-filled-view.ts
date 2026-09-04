import type { ChartWeek } from './chart-weeks';
import type { Dictionary } from './i18n/dictionaries';
import type { SeatsFilledPoint, SeatsFilledSeries } from './seats-filled';

/**
 * The Seats-filled line in the Admin's own words: the eight points, the axis
 * they hang on, and the text list that carries the same figures to anyone who
 * cannot see them.
 *
 * A view module over `src/lib/seats-filled.ts` (`docs/adr/0006-view-modules.md`).
 * Its one computed figure is the axis ceiling, which that record allows because
 * the resolver reports a week above 100 rather than clamping it and the axis has
 * to hold what it reports.
 */

/** The axis reaches at least a whole week, whatever the series says. */
const FULL_PERCENT = 100;
/** Axis ceilings land on a round ten, so the ticks read as percentages. */
const AXIS_STEP = 10;
/** Jan/Feb/Mar in English, Jan/Feb/Mei in Indonesian — the axis abbreviation. */
const MONTH_ABBREVIATION_LENGTH = 3;

/** One point on the line. `null` is a gap in the line, never a zero. */
export interface SeatsFilledDot {
    readonly label: string;
    readonly percent: number | null;
    /**
     * The same figure as text — `"60%"`, or the no-Sessions sentence over a
     * gap. Formatted here because the chart wrapper's contract is that every
     * displayed value arrives finished (#169), and because a tooltip over a gap
     * would otherwise be a blank row.
     */
    readonly display: string;
}

/** One row of the figure's text list — the accessibility contract of #169. */
export interface SeatsFilledValueRow {
    readonly label: string;
    readonly value: string;
}

/** Everything the line draws, decided here and nowhere else. */
export interface SeatsFilledChartView {
    readonly title: string;
    readonly caption: string;
    /** Empty when there is nothing to draw, which tips the figure into its empty state. */
    readonly dots: readonly SeatsFilledDot[];
    readonly values: readonly SeatsFilledValueRow[];
    /** The series' name, for the tooltip row and the chart config. */
    readonly seriesLabel: string;
    /** The Y axis ceiling — at least 100, higher when a week ran over. */
    readonly axisMax: number;
    /** `'{n}%'` — the axis tick. */
    readonly axisPercentTemplate: string;
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
 * week edge is UTC midnight of a WIB day. Both locales get all three tokens and
 * order them in their own template — English puts the month first, Indonesian
 * the day.
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

/**
 * Why a week has no percentage, in words.
 *
 * Two different absences, and they must not share a sentence: no Sessions at
 * all, or Sessions that offered no Seats. Branching on `sessionCount` rather
 * than on `percent === null` is what keeps a week that *did* run from being
 * reported as one that did not — the text list is this chart's guarantee, and a
 * guarantee that lies in an edge case is not one. The second case is out of
 * reach through the app today (`maxPlayers` is validated at a minimum of two),
 * which is exactly why it would otherwise go unnoticed.
 */
function noFigureText(point: SeatsFilledPoint, t: Dictionary): string {
    return point.sessionCount === 0
        ? t.insights.fillNoSessions
        : t.insights.fillNoCapacity;
}

function toDot(point: SeatsFilledPoint, t: Dictionary): SeatsFilledDot {
    return {
        label: fill(t.insights.fillAxisDate, weekDateTokens(point.week, t, true)),
        percent: point.percent,
        display:
            point.percent === null
                ? noFigureText(point, t)
                : fill(t.insights.fillAxisPercent, {
                      n: String(point.percent),
                  }),
    };
}

/**
 * One week as a sentence.
 *
 * A no-data week says so in words rather than showing "0%", which is the same
 * distinction the line draws as a gap — the text list is the guarantee that the
 * gap is read as "no Sessions" and not as a rendering accident. A week that
 * did run carries the exact Seats and capacity beside the percentage, so the
 * rounded figure on the line is never the only number available.
 */
function toValueRow(
    point: SeatsFilledPoint,
    t: Dictionary,
): SeatsFilledValueRow {
    const label = fill(
        t.insights.fillWeekLabel,
        weekDateTokens(point.week, t, false),
    );
    if (point.percent === null) {
        return { label, value: noFigureText(point, t) };
    }
    return {
        label,
        value: fill(t.insights.fillValueRow, {
            percent: String(point.percent),
            seats: String(point.seats),
            capacity: String(point.capacity),
        }),
    };
}

/**
 * Whether the window says anything at all.
 *
 * One quiet week among weeks that ran is a real statement and stays a gap in
 * the line. Eight weeks with no Session in any of them is a different one: this
 * community has posted nothing in two months, and eight gaps is not a chart.
 * That is when the figure shows its empty state instead.
 */
function hasSessions(series: SeatsFilledSeries): boolean {
    return series.points.some((point) => point.sessionCount > 0);
}

/**
 * The Y axis ceiling: a whole week, or the next round ten above whatever the
 * busiest week reached.
 *
 * Fixing it at 100 would clip the one point an Admin most needs to see, since
 * the resolver reports an over-committed week rather than clamping it. Letting
 * Recharts pick from the data instead would stretch a quiet two months across
 * the full height and read as a healthy chart.
 */
function axisMax(series: SeatsFilledSeries): number {
    const reached = series.points.reduce(
        (highest, point) => Math.max(highest, point.percent ?? 0),
        FULL_PERCENT,
    );
    return Math.ceil(reached / AXIS_STEP) * AXIS_STEP;
}

/**
 * Read one finished series into the figure that draws it.
 *
 * The caption names the window, the two exclusions and the one thing an Admin
 * could otherwise misread — that the last point is a week still filling, not a
 * week that ended badly.
 */
export function buildSeatsFilledView(
    series: SeatsFilledSeries,
    t: Dictionary,
): SeatsFilledChartView {
    const drawn = hasSessions(series) ? series.points : [];
    return {
        title: t.insights.fillTitle,
        caption: t.insights.fillCaption,
        dots: drawn.map((point) => toDot(point, t)),
        values: drawn.map((point) => toValueRow(point, t)),
        seriesLabel: t.insights.fillSeriesLabel,
        axisMax: axisMax(series),
        axisPercentTemplate: t.insights.fillAxisPercent,
        valuesToggleLabel: t.insights.valuesToggle,
        valuesListLabel: t.insights.valuesListLabel,
        emptyChipLabel: t.insights.emptyChip,
        emptyMessage: t.insights.fillEmptyMessage,
    };
}

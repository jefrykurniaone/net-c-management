import { fromPeriodKey, type BillingPeriod } from './billing-period';
import type { DuesCollectionSeries, DuesPeriodPoint } from './dues-collection';
import type { Dictionary } from './i18n/dictionaries';

/**
 * The Dues collected-vs-owed chart in the Admin's own words: the bars, the
 * legend, and the text list that carries the same numbers to anyone who cannot
 * see them.
 *
 * Purely presentational over `src/lib/dues-collection.ts`, in the shape
 * `dues-rate-view.ts` established over the Dues Rate resolver: nothing here
 * decides what is owed or collected, prices a Period or reads a clock — it
 * turns one finished series into sentences. That is what makes the drawn bars
 * and the text list impossible to disagree: both are built from the same
 * `points`, in the same order, in one pass.
 *
 * It runs on the server. The chart component is handed the finished view and
 * never sees the dictionary, so an English and an Indonesian dashboard ship the
 * same component and different strings.
 */

/** Rupiah, written the way every other surface in this app writes it. */
export function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * The axis tick shortens a month name to its first three characters, which are
 * the conventional abbreviation in both locales — Jan/Feb/Mar/Apr/May/Jun in
 * English, Jan/Feb/Mar/Apr/Mei/Jun in Indonesian. The year is left off the axis
 * because six Periods span at most two calendar years and the full
 * "January 2027" is one line down in the text list, which is what a reader
 * quoting a figure reads anyway.
 */
const MONTH_ABBREVIATION_LENGTH = 3;

/** One grouped pair of bars: the two Rupiah figures under one axis tick. */
export interface DuesCollectionBar {
    readonly label: string;
    readonly collected: number;
    readonly owed: number;
}

/** One row of the figure's text list — the accessibility contract of #169. */
export interface DuesCollectionValueRow {
    readonly label: string;
    readonly value: string;
}

/** Everything the chart draws, decided here and nowhere else. */
export interface DuesCollectionChartView {
    readonly title: string;
    readonly caption: string;
    /** Empty when there is nothing to draw, which is what tips the figure into its empty state. */
    readonly bars: readonly DuesCollectionBar[];
    readonly values: readonly DuesCollectionValueRow[];
    readonly collectedLabel: string;
    readonly owedLabel: string;
    readonly valuesToggleLabel: string;
    readonly valuesListLabel: string;
    readonly emptyChipLabel: string;
    readonly emptyMessage: string;
    /** `'{n}M'` / `'{n}jt'` — the axis tick for a figure in millions. */
    readonly axisMillionTemplate: string;
    /** `'{n}K'` / `'{n}rb'` — the axis tick for a figure in thousands. */
    readonly axisThousandTemplate: string;
}

/** `{token}` substitution, one occurrence per token. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
    return Object.entries(values).reduce(
        (text, [token, value]) => text.replace(`{${token}}`, value),
        template,
    );
}

/** "September 2026" — a Billing Period as an Admin reads it. */
function periodLabel(period: BillingPeriod, t: Dictionary): string {
    return `${t.months[period.month]} ${period.year}`;
}

function toBar(point: DuesPeriodPoint, t: Dictionary): DuesCollectionBar {
    return {
        label: t.months[point.period.month].slice(0, MONTH_ABBREVIATION_LENGTH),
        collected: point.collected,
        owed: point.owed,
    };
}

function toValueRow(point: DuesPeriodPoint, t: Dictionary): DuesCollectionValueRow {
    return {
        label: periodLabel(point.period, t),
        value: fill(t.insights.duesValueRow, {
            collected: rupiah(point.collected),
            owed: rupiah(point.owed),
        }),
    };
}

/**
 * Whether the series says anything at all.
 *
 * A Period that is zero among Periods that are not stays a drawn zero — a gap
 * in collection has to be visible as a gap. Six zeroes together are a different
 * statement: no Activity charges Dues yet and nothing has been paid, and six
 * flat bars would dress that up as a chart. That is when the figure shows its
 * empty state instead.
 */
function hasFigures(series: DuesCollectionSeries): boolean {
    return series.points.some(
        (point) => point.owed > 0 || point.collected > 0,
    );
}

/**
 * Read one finished series into the figure that draws it.
 *
 * The caption names the window and says what is left out, because the one thing
 * an Admin could read wrongly here is thinking the Fees their members pay per
 * Session are somewhere in these bars. They are in neither.
 */
export function buildDuesCollectionView(
    series: DuesCollectionSeries,
    t: Dictionary,
): DuesCollectionChartView {
    const drawn = hasFigures(series) ? series.points : [];
    return {
        title: t.insights.duesTitle,
        caption: t.insights.duesCaption,
        bars: drawn.map((point) => toBar(point, t)),
        values: drawn.map((point) => toValueRow(point, t)),
        collectedLabel: t.insights.duesCollected,
        owedLabel: t.insights.duesOwed,
        valuesToggleLabel: t.insights.valuesToggle,
        valuesListLabel: t.insights.valuesListLabel,
        emptyChipLabel: t.insights.emptyChip,
        emptyMessage: t.insights.duesEmptyMessage,
        axisMillionTemplate: t.insights.duesAxisMillion,
        axisThousandTemplate: t.insights.duesAxisThousand,
    };
}

/**
 * The one sentence a skipped rate deserves in the server log, built here so the
 * loader carries no string of its own. Not user-facing: an Activity with no
 * covering rate is a broken invariant an engineer fixes, not a state a member
 * is shown.
 */
export function skippedDuesRateLog(activityId: string, periodKey: number): string {
    const { month, year } = fromPeriodKey(periodKey);
    return `[admin insights] no Dues Rate covers ${year}-${month} for Activity ${activityId}; left out of Dues owed`;
}

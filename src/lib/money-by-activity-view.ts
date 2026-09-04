import type { BillingPeriod } from './billing-period';
import { chartColor } from './chart-tokens';
import { rupiah } from './dues-collection-view';
import type { Dictionary } from './i18n/dictionaries';
import type { ActivityMoneySlice, MoneyByActivitySeries } from './money-by-activity';

/**
 * The money-by-Activity donut in the Admin's own words: the ring, the total in
 * its centre, the colour key, and the text list that carries the same figures
 * to anyone who cannot see them.
 *
 * Purely presentational over `src/lib/money-by-activity.ts`, in the shape
 * `dues-collection-view.ts` established: nothing here decides what counts,
 * places a Payment in a Period or reads a clock — it turns one finished series
 * into sentences. Both the ring and the list are built from the same `slices`
 * in the same order in one pass, which is what makes them impossible to
 * disagree.
 *
 * It runs on the server. The chart component is handed the finished view and
 * never sees the dictionary, so an English and an Indonesian dashboard ship the
 * same component and different strings.
 */

/**
 * The first colour of the warm range — `--chart-3`, Orange — as an index into
 * `CHART_COLORS`. The spec draws a small ring from the reference's
 * Orange-to-Dark-Red range rather than from the head of the palette
 * (`docs/spec-rally-insights-v1.md`, Palette).
 */
const WARM_RANGE_START = 2;

/**
 * How many segments the warm range covers. Three: Orange (`--chart-3`), Dark
 * Red (`--chart-4`) and the token immediately after it (`--chart-5`).
 *
 * The range's two named endpoints are Orange and Dark Red, and the token layer
 * holds no third hue between them. A chart may not invent one — an interpolated
 * value would be a fixed hex that cannot follow the theme, and the token layer
 * belongs to `DESIGN.md` (#152), not to a chart. So a three-segment ring takes
 * the two endpoints plus the next token along, which keeps a small ring off the
 * green and the purple the reference's warm ring never uses and keeps every
 * segment on a token whose 3:1 contrast against the card `design-tokens.test.ts`
 * already asserts.
 */
const WARM_RANGE_SEGMENTS = 3;

/**
 * The text list's summary row identity (#214). `Activity.name` carries no
 * unique constraint (`prisma/schema.prisma`, `model Activity` — only `slug` is
 * `@unique`), so
 * an Admin can name an Activity "Total" — this constant keeps the summary row
 * distinct from that Activity's own row regardless.
 */
const TOTAL_ROW_ID = 'total';

/** One drawn arc of the ring. Zero Activities never reach here. */
export interface MoneySegment {
    /** The Activity id — a stable React key, never displayed. */
    readonly key: string;
    readonly label: string;
    readonly amount: number;
    /** A `var(--color-chart-N)` reference, so both themes stay correct. */
    readonly color: string;
}

/** One row of the figure's text list — the accessibility contract of #169. */
export interface MoneyValueRow {
    readonly label: string;
    readonly value: string;
    /** Stable row identity (#214) — the Activity id, or {@link TOTAL_ROW_ID}. */
    readonly id: string;
}

/** Everything the donut draws, decided here and nowhere else. */
export interface MoneyByActivityChartView {
    readonly title: string;
    readonly caption: string;
    /** The drawn ring: Activities with money, largest first. */
    readonly segments: readonly MoneySegment[];
    /**
     * Every Activity including the ones at zero, then the total. Empty when
     * there is nothing to draw, which is what tips the figure into its empty
     * state.
     */
    readonly values: readonly MoneyValueRow[];
    /** The word under the centre figure, and the colour key's accessible name. */
    readonly totalLabel: string;
    readonly totalValue: string;
    readonly keyLabel: string;
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

/** "September 2026" — a Billing Period as an Admin reads it. */
function periodLabel(period: BillingPeriod, t: Dictionary): string {
    return `${t.months[period.month]} ${period.year}`;
}

/**
 * The colour of the `index`th arc of a ring of `segmentCount`.
 *
 * Two or three Activities take the warm range, which is what the reference
 * donut looks like and what the spec asks for. Beyond three the range runs out
 * and the full palette takes over from its head, cycling through
 * {@link chartColor} — five distinct hues before any repeat, which is more
 * Activities than a legible donut holds anyway. A single Activity takes the
 * range's first colour by the same rule, so the one case the spec does not name
 * needs no branch of its own.
 */
function segmentColor(index: number, segmentCount: number): string {
    if (segmentCount <= WARM_RANGE_SEGMENTS) {
        return chartColor(WARM_RANGE_START + index);
    }
    return chartColor(index);
}

/** The Activities with money, in series order, coloured by how many there are. */
function toSegments(slices: readonly ActivityMoneySlice[]): MoneySegment[] {
    const earning = slices.filter((slice) => slice.amount > 0);
    return earning.map((slice, index) => ({
        key: slice.activityId,
        label: slice.activityName,
        amount: slice.amount,
        color: segmentColor(index, earning.length),
    }));
}

/**
 * Whether the Period says anything at all.
 *
 * One Activity at zero among Activities that are not is a real statement and
 * stays in the list. Every Activity at zero is a different one: no money has
 * been confirmed this Period, and a ring of nothing dressed up as a chart says
 * less than the empty state does. `dues-collection-view.ts` draws the same line
 * for six flat Periods.
 */
function hasMoney(series: MoneyByActivitySeries): boolean {
    return series.total > 0;
}

/**
 * Read one finished series into the figure that draws it.
 *
 * **Zero Activities are filtered here and not in the resolver**, which is the
 * decision worth naming: the series is the record and carries every Activity,
 * so the text list can say "this one brought in nothing" — a fact an Admin
 * wants — while the ring, where a zero-width arc is invisible noise and would
 * still consume a colour, draws only the Activities with money. Filtering in
 * the resolver instead would delete the fact rather than choose not to draw it.
 *
 * The total is carried through from the series, never re-summed here, so the
 * centre figure and the list's last row cannot drift from the arcs.
 */
export function buildMoneyByActivityView(
    series: MoneyByActivitySeries,
    t: Dictionary,
): MoneyByActivityChartView {
    const drawn = hasMoney(series);
    const rows = drawn
        ? series.slices.map((slice) => ({
              id: slice.activityId,
              label: slice.activityName,
              value: rupiah(slice.amount),
          }))
        : [];

    return {
        title: t.insights.moneyTitle,
        caption: fill(t.insights.moneyCaption, {
            period: periodLabel(series.period, t),
        }),
        segments: drawn ? toSegments(series.slices) : [],
        values: drawn
            ? [
                  ...rows,
                  {
                      id: TOTAL_ROW_ID,
                      label: t.insights.moneyTotal,
                      value: rupiah(series.total),
                  },
              ]
            : [],
        totalLabel: t.insights.moneyTotal,
        totalValue: rupiah(series.total),
        keyLabel: t.insights.moneyKeyLabel,
        valuesToggleLabel: t.insights.valuesToggle,
        valuesListLabel: t.insights.valuesListLabel,
        emptyChipLabel: t.insights.emptyChip,
        emptyMessage: t.insights.moneyEmptyMessage,
    };
}

/**
 * The one sentence a Fee with no Session deserves in the server log, built here
 * so the loader carries no string of its own. Not user-facing: the schema
 * restricts a Session from being deleted out from under a Payment, so a Fee
 * naming none is a broken invariant an engineer fixes, not a state a member is
 * shown.
 */
export function unplacedFeeLog(paymentId: string, activityId: string): string {
    return `[admin insights] Payment ${paymentId} on Activity ${activityId} is a Fee naming no Session; left out of this Period's money by Activity`;
}

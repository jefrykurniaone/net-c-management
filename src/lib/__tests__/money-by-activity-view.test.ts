import { describe, expect, it } from 'vitest';
import { CHART_COLORS } from '../chart-tokens';
import { rupiah } from '../dues-collection-view';
import { getDictionary, LOCALES } from '../i18n/dictionaries';
import type {
    ActivityMoneySlice,
    MoneyByActivitySeries,
} from '../money-by-activity';
import {
    buildMoneyByActivityView,
    unplacedFeeLog,
} from '../money-by-activity-view';

/**
 * The figure's text list is the accessibility contract (#169, DESIGN.md): a
 * chart is never the only representation of its numbers. For a donut that means
 * two things this file pins — the list carries every Activity including the ones
 * the ring drops, and the centre figure is the same number as the list's last
 * row.
 */

const ORANGE = CHART_COLORS[2];
const DARK_RED = CHART_COLORS[3];
const BLACK_GREEN = CHART_COLORS[4];

function slice(
    activityId: string,
    activityName: string,
    amount: number,
): ActivityMoneySlice {
    return { activityId, activityName, amount };
}

function seriesOf(
    slices: readonly ActivityMoneySlice[],
    month = 10,
): MoneyByActivitySeries {
    return {
        period: { month, year: 2026 },
        slices,
        total: slices.reduce((sum, each) => sum + each.amount, 0),
        unplacedFees: [],
    };
}

const TWO_EARNING = seriesOf([
    slice('badminton', 'Badminton', 900_000),
    slice('futsal', 'Futsal', 400_000),
    slice('archery', 'Archery', 0),
]);

describe('the drawn ring and the text list', () => {
    it('drops an Activity at zero from the ring and keeps it in the list', () => {
        const view = buildMoneyByActivityView(TWO_EARNING, getDictionary('en'));

        expect(view.segments.map((segment) => segment.label)).toEqual([
            'Badminton',
            'Futsal',
        ]);
        expect(view.values.map((row) => row.label)).toEqual([
            'Badminton',
            'Futsal',
            'Archery',
            'Total',
        ]);
    });

    it('lists the zero Activity as zero rather than as nothing', () => {
        const view = buildMoneyByActivityView(TWO_EARNING, getDictionary('en'));

        expect(view.values[2]).toEqual({ label: 'Archery', value: 'Rp 0' });
    });

    it.each(LOCALES)('ends the list with the centre total in %s', (locale) => {
        const t = getDictionary(locale);
        const view = buildMoneyByActivityView(TWO_EARNING, t);

        expect(view.values.at(-1)).toEqual({
            label: t.insights.moneyTotal,
            value: rupiah(1_300_000),
        });
        expect(view.totalValue).toBe(rupiah(1_300_000));
    });

    it.each(LOCALES)('carries each arc as Rupiah in %s', (locale) => {
        const view = buildMoneyByActivityView(TWO_EARNING, getDictionary(locale));

        view.segments.forEach((segment, index) => {
            expect(view.values[index]).toEqual({
                label: segment.label,
                value: rupiah(segment.amount),
            });
        });
    });

    it('names the Period in the caption, in each locale', () => {
        expect(
            buildMoneyByActivityView(TWO_EARNING, getDictionary('en')).caption,
        ).toContain('October 2026');
        expect(
            buildMoneyByActivityView(TWO_EARNING, getDictionary('id')).caption,
        ).toContain('Oktober 2026');
    });
});

describe('the segment colours', () => {
    function colorsFor(count: number): string[] {
        const slices = Array.from({ length: count }, (_unused, index) =>
            slice(`a${index}`, `Activity ${index}`, (count - index) * 100_000),
        );
        return buildMoneyByActivityView(
            seriesOf(slices),
            getDictionary('en'),
        ).segments.map((segment) => segment.color);
    }

    it('draws one Activity in Orange, the warm range opening colour', () => {
        expect(colorsFor(1)).toEqual([ORANGE]);
    });

    it('draws two across the Orange-to-Dark-Red range', () => {
        expect(colorsFor(2)).toEqual([ORANGE, DARK_RED]);
    });

    it('draws three from the range plus the token after Dark Red', () => {
        expect(colorsFor(3)).toEqual([ORANGE, DARK_RED, BLACK_GREEN]);
    });

    it('falls back to the full palette from four Activities', () => {
        expect(colorsFor(4)).toEqual([
            CHART_COLORS[0],
            CHART_COLORS[1],
            CHART_COLORS[2],
            CHART_COLORS[3],
        ]);
    });

    it('cycles the palette past its fifth colour', () => {
        expect(colorsFor(6)).toEqual([...CHART_COLORS, CHART_COLORS[0]]);
    });

    it('colours by the arcs drawn, not by the Activities counted', () => {
        // Two earning Activities and one at zero is a two-segment ring, so it
        // takes the two-colour range and not the three-colour one.
        expect(
            buildMoneyByActivityView(
                TWO_EARNING,
                getDictionary('en'),
            ).segments.map((segment) => segment.color),
        ).toEqual([ORANGE, DARK_RED]);
    });
});

describe('a Period with no confirmed money', () => {
    const nothingYet = seriesOf([
        slice('badminton', 'Badminton', 0),
        slice('futsal', 'Futsal', 0),
    ]);

    it.each(LOCALES)('draws no ring and no list rows in %s', (locale) => {
        const t = getDictionary(locale);
        const view = buildMoneyByActivityView(nothingYet, t);

        expect(view.segments).toEqual([]);
        expect(view.values).toEqual([]);
        expect(view.emptyChipLabel).toBe(t.insights.emptyChip);
        expect(view.emptyMessage).toBe(t.insights.emptyMessage);
    });

    it('still draws when one Activity has money', () => {
        const view = buildMoneyByActivityView(
            seriesOf([
                slice('badminton', 'Badminton', 75_000),
                slice('futsal', 'Futsal', 0),
            ]),
            getDictionary('en'),
        );

        expect(view.segments).toHaveLength(1);
        expect(view.values).toHaveLength(3);
    });
});

describe('the unplaced-Fee log line', () => {
    it('names the Payment and the Activity a Session is missing for', () => {
        expect(unplacedFeeLog('pay_123', 'futsal')).toBe(
            '[admin insights] Payment pay_123 on Activity futsal is a Fee naming no Session; left out of this Period\'s money by Activity',
        );
    });
});

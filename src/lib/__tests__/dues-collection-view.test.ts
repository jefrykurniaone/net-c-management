import { describe, expect, it } from 'vitest';
import { toPeriodKey } from '../billing-period';
import type { DuesCollectionSeries, DuesPeriodPoint } from '../dues-collection';
import {
    buildDuesCollectionView,
    duesLegendItems,
    rupiah,
    skippedDuesRateLog,
} from '../dues-collection-view';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The figure's text list is the accessibility contract (#169, DESIGN.md): a
 * chart is never the only representation of its numbers. So the assertion that
 * matters most here is that the list and the bars are the same numbers in the
 * same order — they are built from one `points` array in one pass, and these
 * cases are what keeps that true.
 */

function point(month: number, collected: number, owed: number): DuesPeriodPoint {
    return {
        period: { month, year: 2026 },
        periodKey: toPeriodKey(month, 2026),
        collected,
        owed,
    };
}

const SIX_PERIODS: DuesCollectionSeries = {
    points: [
        point(3, 300_000, 450_000),
        point(4, 0, 450_000),
        point(5, 375_000, 450_000),
        point(6, 450_000, 450_000),
        point(7, 400_000, 525_000),
        point(8, 1_125_000, 2_040_000),
    ],
    skipped: [],
};

const NOTHING_YET: DuesCollectionSeries = {
    points: SIX_PERIODS.points.map((each) => point(each.period.month, 0, 0)),
    skipped: [],
};

describe('the drawn bars and the text list', () => {
    it.each(LOCALES)('carry the same figures in the same order in %s', (locale) => {
        const view = buildDuesCollectionView(SIX_PERIODS, getDictionary(locale));

        expect(view.bars).toHaveLength(SIX_PERIODS.points.length);
        expect(view.values).toHaveLength(view.bars.length);
        view.bars.forEach((bar, index) => {
            expect(view.values[index].value).toContain(rupiah(bar.collected));
            expect(view.values[index].value).toContain(rupiah(bar.owed));
        });
    });

    it('keeps a Period with nothing collected as a drawn zero', () => {
        const view = buildDuesCollectionView(SIX_PERIODS, getDictionary('en'));
        expect(view.bars[1]).toEqual({ label: 'Apr', collected: 0, owed: 450_000 });
        expect(view.values[1]).toEqual({
            label: 'April 2026',
            value: 'Collected Rp 0, owed Rp 450.000',
        });
    });

    it('names each Period in full in the list and in three letters on the axis', () => {
        const en = buildDuesCollectionView(SIX_PERIODS, getDictionary('en'));
        const id = buildDuesCollectionView(SIX_PERIODS, getDictionary('id'));

        expect(en.bars.map((bar) => bar.label)).toEqual([
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
        ]);
        expect(id.bars.map((bar) => bar.label)).toEqual([
            'Mar',
            'Apr',
            'Mei',
            'Jun',
            'Jul',
            'Agu',
        ]);
        expect(en.values[5].label).toBe('August 2026');
        expect(id.values[5].label).toBe('Agustus 2026');
    });

    it('writes Rupiah the way every other surface writes it, in both locales', () => {
        for (const locale of LOCALES) {
            const view = buildDuesCollectionView(SIX_PERIODS, getDictionary(locale));
            expect(view.values[5].value).toContain('Rp 2.040.000');
        }
    });
});

describe('a community with nothing to show', () => {
    it.each(LOCALES)('draws no bars and no list rows in %s', (locale) => {
        const t = getDictionary(locale);
        const view = buildDuesCollectionView(NOTHING_YET, t);

        expect(view.bars).toEqual([]);
        expect(view.values).toEqual([]);
        expect(view.emptyChipLabel).toBe(t.insights.emptyChip);
        expect(view.emptyMessage).toBe(t.insights.duesEmptyMessage);
    });

    it('still draws when a single Period has a figure', () => {
        const oneFigure: DuesCollectionSeries = {
            points: [...NOTHING_YET.points.slice(0, 5), point(8, 0, 75_000)],
            skipped: [],
        };
        expect(buildDuesCollectionView(oneFigure, getDictionary('en')).bars).toHaveLength(
            6,
        );
    });
});

describe('the legend order (#224)', () => {
    it.each(LOCALES)(
        'reads Collected before Owed in %s, regardless of which translated name is longer',
        (locale) => {
            const t = getDictionary(locale);
            const view = buildDuesCollectionView(SIX_PERIODS, t);
            const items = duesLegendItems(view);

            expect(items.map((item) => item.key)).toEqual(['collected', 'owed']);
            expect(items[0].label).toBe(t.insights.duesCollected);
            expect(items[1].label).toBe(t.insights.duesOwed);
        },
    );

    it('pairs the green swatch with Collected and the purple swatch with Owed in every locale', () => {
        for (const locale of LOCALES) {
            const view = buildDuesCollectionView(SIX_PERIODS, getDictionary(locale));
            const items = duesLegendItems(view);

            expect(items[0]).toEqual({
                key: 'collected',
                label: view.collectedLabel,
                color: view.collectedColor,
            });
            expect(items[1]).toEqual({
                key: 'owed',
                label: view.owedLabel,
                color: view.owedColor,
            });
            // TC-IN-002: the colour-to-label pairing never flips, only the
            // legend's left-to-right order was the bug.
            expect(view.collectedColor).not.toBe(view.owedColor);
        }
    });

    it('keeps the same order and the same colours whether or not the chart has any figures to draw', () => {
        const empty = buildDuesCollectionView(NOTHING_YET, getDictionary('en'));
        const items = duesLegendItems(empty);

        expect(items.map((item) => item.key)).toEqual(['collected', 'owed']);
        expect(items[0].color).toBe(empty.collectedColor);
        expect(items[1].color).toBe(empty.owedColor);
    });
});

describe('the skipped-rate log line', () => {
    it('names the Activity and the Period a rate is missing for', () => {
        expect(skippedDuesRateLog('futsal', 202603)).toBe(
            '[admin insights] no Dues Rate covers 2026-3 for Activity futsal; left out of Dues owed',
        );
    });
});

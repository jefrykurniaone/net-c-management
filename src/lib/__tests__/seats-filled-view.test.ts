import { describe, expect, it } from 'vitest';
import { chartWeeks } from '../chart-weeks';
import { getDictionary, LOCALES } from '../i18n/dictionaries';
import type { SeatsFilledPoint, SeatsFilledSeries } from '../seats-filled';
import { buildSeatsFilledView } from '../seats-filled-view';

/**
 * The figure's text list is the accessibility contract (#169, DESIGN.md): a
 * chart is never the only representation of its numbers. For this line that
 * matters most at the gaps — a week the line skips has to say "no Sessions" in
 * words, or a reader has no way to tell a quiet week from a rendering fault.
 */

/** Wednesday 2 September 2026, midday in Jakarta. */
const NOW = new Date('2026-09-02T05:00:00.000Z');
const WEEKS = chartWeeks(NOW);

/** A week that ran: `percent` derived from the two figures, as the resolver does. */
function ran(index: number, seats: number, capacity: number): SeatsFilledPoint {
    return {
        week: WEEKS[index],
        percent: Math.round((seats * 100) / capacity),
        seats,
        capacity,
        sessionCount: 1,
    };
}

/** A week with no Sessions at all. */
function quiet(index: number): SeatsFilledPoint {
    return {
        week: WEEKS[index],
        percent: null,
        seats: 0,
        capacity: 0,
        sessionCount: 0,
    };
}

const EIGHT_WEEKS: SeatsFilledSeries = {
    points: [
        ran(0, 12, 20),
        ran(1, 15, 20),
        quiet(2),
        ran(3, 20, 20),
        ran(4, 0, 20),
        ran(5, 9, 20),
        ran(6, 18, 20),
        ran(7, 6, 20),
    ],
};

const NOTHING_POSTED: SeatsFilledSeries = {
    points: WEEKS.map((_week, index) => quiet(index)),
};

describe('the drawn line and the text list', () => {
    it.each(LOCALES)('carry one entry per week, in order, in %s', (locale) => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary(locale));

        expect(view.dots).toHaveLength(EIGHT_WEEKS.points.length);
        expect(view.values).toHaveLength(view.dots.length);
    });

    it('keeps a week with no Sessions as a gap rather than a zero', () => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));

        expect(view.dots[2].percent).toBeNull();
        expect(view.values[2].value).toBe('No Sessions');
    });

    it('keeps a week that ran and took no Seats as a drawn zero', () => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));

        expect(view.dots[4].percent).toBe(0);
        expect(view.values[4].value).toBe('0%, 0 of 20 seats held');
    });

    it('carries the exact Seats and capacity beside the rounded percentage', () => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));

        expect(view.values[0].value).toBe('60%, 12 of 20 seats held');
        expect(view.values[3].value).toBe('100%, 20 of 20 seats held');
    });

    it('says the same in Indonesian', () => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('id'));

        expect(view.values[0].value).toBe('60%, 12 dari 20 kursi terisi');
        expect(view.values[2].value).toBe('Tidak ada Sesi');
    });

    it('dates the axis and the list in each locale order', () => {
        const en = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));
        const id = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('id'));

        expect(en.dots[0].label).toBe('Jul 13');
        expect(id.dots[0].label).toBe('13 Jul');
        expect(en.values[0].label).toBe('Week of July 13, 2026');
        expect(id.values[0].label).toBe('Minggu 13 Juli 2026');
    });

    it('never calls a week that ran a week with no Sessions', () => {
        // Sessions posted with no capacity have no percentage either, but
        // saying "No Sessions" about a week that held one would be a false
        // statement in the text list, which is this chart's guarantee.
        const noSeatsOffered: SeatsFilledSeries = {
            points: [
                { ...quiet(0), sessionCount: 2 },
                ...EIGHT_WEEKS.points.slice(1),
            ],
        };
        const en = buildSeatsFilledView(noSeatsOffered, getDictionary('en'));
        const id = buildSeatsFilledView(noSeatsOffered, getDictionary('id'));

        expect(en.values[0].value).toBe('No Seats offered');
        expect(en.dots[0].display).toBe('No Seats offered');
        expect(id.values[0].value).toBe('Tidak ada kursi ditawarkan');
    });

    it('carries each point as finished text, the gap included', () => {
        const en = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));
        const id = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('id'));

        expect(en.dots[0].display).toBe('60%');
        expect(en.dots[2].display).toBe('No Sessions');
        expect(id.dots[2].display).toBe('Tidak ada Sesi');
    });

    it('dates every week by the Monday that opens it', () => {
        const view = buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en'));

        expect(view.dots.at(-1)?.label).toBe('Aug 31');
    });
});

describe('the axis ceiling', () => {
    it('is a whole week when nothing ran over', () => {
        expect(buildSeatsFilledView(EIGHT_WEEKS, getDictionary('en')).axisMax).toBe(
            100,
        );
    });

    it('is a whole week even when every week is no-data', () => {
        expect(
            buildSeatsFilledView(NOTHING_POSTED, getDictionary('en')).axisMax,
        ).toBe(100);
    });

    it('rises to the next round ten above an over-committed week', () => {
        const overCommitted: SeatsFilledSeries = {
            points: [
                ...EIGHT_WEEKS.points.slice(0, 7),
                { ...ran(7, 6, 20), percent: 127 },
            ],
        };

        expect(
            buildSeatsFilledView(overCommitted, getDictionary('en')).axisMax,
        ).toBe(130);
    });
});

describe('a community that has posted nothing for eight weeks', () => {
    it.each(LOCALES)('draws no line and no list rows in %s', (locale) => {
        const t = getDictionary(locale);
        const view = buildSeatsFilledView(NOTHING_POSTED, t);

        expect(view.dots).toEqual([]);
        expect(view.values).toEqual([]);
        expect(view.emptyChipLabel).toBe(t.insights.emptyChip);
        expect(view.emptyMessage).toBe(t.insights.fillEmptyMessage);
        expect(view.emptyMessage.toLowerCase()).not.toContain('period');
        expect(view.emptyMessage.toLowerCase()).not.toContain('periode');
    });

    it('still draws when a single week ran', () => {
        const onlyOne: SeatsFilledSeries = {
            points: [...NOTHING_POSTED.points.slice(0, 7), ran(7, 0, 20)],
        };

        expect(
            buildSeatsFilledView(onlyOne, getDictionary('en')).dots,
        ).toHaveLength(8);
    });
});

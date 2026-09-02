import { describe, expect, it } from 'vitest';
import { CHART_WEEKS, chartWeeks, weekIndexOfDay } from '../chart-weeks';

/**
 * The window two charts share (#171's fill line, #172's attendance sparkline),
 * so a wrong edge here is wrong on both at once — and silently, because a
 * Session credited to the week beside its own still draws a plausible line.
 *
 * Every instant below is written in UTC and every expectation is an ISO string,
 * matching `wib.test.ts` and `seed-session-dates.test.ts`: a Session is stored
 * as UTC midnight of its WIB calendar day, and these are the values the week
 * edges have to line up with.
 */

/** Wednesday 2 September 2026, midday in Jakarta. Its Monday is 31 August. */
const NOW = new Date('2026-09-02T05:00:00.000Z');

function startsOf(now: Date): string[] {
    return chartWeeks(now).map((week) => week.key);
}

describe('chartWeeks, the eight weeks a trend covers', () => {
    it('ends with the Monday of the week containing now, oldest first', () => {
        expect(startsOf(NOW)).toEqual([
            '2026-07-13',
            '2026-07-20',
            '2026-07-27',
            '2026-08-03',
            '2026-08-10',
            '2026-08-17',
            '2026-08-24',
            '2026-08-31',
        ]);
    });

    it('returns exactly CHART_WEEKS weeks', () => {
        expect(chartWeeks(NOW)).toHaveLength(CHART_WEEKS);
    });

    it('opens every week at UTC midnight, the shape a Session date has', () => {
        for (const week of chartWeeks(NOW)) {
            expect(week.start.toISOString()).toBe(`${week.key}T00:00:00.000Z`);
        }
    });

    it('leaves no hole and no overlap: each week ends where the next starts', () => {
        const weeks = chartWeeks(NOW);
        for (let index = 0; index + 1 < weeks.length; index += 1) {
            expect(weeks[index].end.getTime()).toBe(weeks[index + 1].start.getTime());
        }
    });

    it('ends the last week on the Monday after it, so `lt` needs no adjustment', () => {
        const weeks = chartWeeks(NOW);
        expect(weeks[weeks.length - 1].end.toISOString()).toBe(
            '2026-09-07T00:00:00.000Z',
        );
    });

    it('rolls the window at WIB midnight, not at UTC midnight', () => {
        const sundayNight = new Date('2026-09-06T16:59:00.000Z');
        const mondayMorning = new Date('2026-09-06T17:00:00.000Z');

        expect(startsOf(sundayNight).at(-1)).toBe('2026-08-31');
        expect(startsOf(mondayMorning).at(-1)).toBe('2026-09-07');
    });

    it('reaches back across a year boundary', () => {
        expect(startsOf(new Date('2026-01-05T05:00:00.000Z'))).toEqual([
            '2025-11-17',
            '2025-11-24',
            '2025-12-01',
            '2025-12-08',
            '2025-12-15',
            '2025-12-22',
            '2025-12-29',
            '2026-01-05',
        ]);
    });
});

describe('weekIndexOfDay, placing a Session in its week', () => {
    const weeks = chartWeeks(NOW);

    it.each([
        ['2026-07-13', 0],
        ['2026-07-19', 0],
        ['2026-07-20', 1],
        ['2026-08-31', CHART_WEEKS - 1],
        ['2026-09-06', CHART_WEEKS - 1],
    ])('puts %s in week %i', (day, expected) => {
        expect(weekIndexOfDay(weeks, new Date(`${day}T00:00:00.000Z`))).toBe(
            expected,
        );
    });

    it('answers -1 for the day before the window opens', () => {
        expect(
            weekIndexOfDay(weeks, new Date('2026-07-12T00:00:00.000Z')),
        ).toBe(-1);
    });

    it('answers -1 for the Monday the window stops before', () => {
        expect(
            weekIndexOfDay(weeks, new Date('2026-09-07T00:00:00.000Z')),
        ).toBe(-1);
    });

    it('answers -1 on an empty window rather than reading a missing week', () => {
        expect(weekIndexOfDay([], NOW)).toBe(-1);
    });
});

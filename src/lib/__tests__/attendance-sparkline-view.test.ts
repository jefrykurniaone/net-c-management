import { describe, expect, it } from 'vitest';
import type {
    AttendanceSparklinePoint,
    AttendanceSparklineSeries,
} from '../attendance-sparkline';
import { buildAttendanceSparklineView } from '../attendance-sparkline-view';
import { chartWeeks } from '../chart-weeks';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The figure's text list is the accessibility contract (#169, DESIGN.md), and
 * the headline number is the one figure the acceptance criterion names
 * directly — both come off the same finished series, so this file is what
 * proves they cannot disagree.
 */

/** Wednesday 2 September 2026, midday in Jakarta. */
const NOW = new Date('2026-09-02T05:00:00.000Z');
const WEEKS = chartWeeks(NOW);

function point(index: number, count: number): AttendanceSparklinePoint {
    return { week: WEEKS[index], count };
}

const SOME_ATTENDANCE: AttendanceSparklineSeries = {
    points: [
        point(0, 0),
        point(1, 1),
        point(2, 0),
        point(3, 2),
        point(4, 0),
        point(5, 1),
        point(6, 0),
        point(7, 3),
    ],
};

const NOTHING_PLAYED: AttendanceSparklineSeries = {
    points: WEEKS.map((_week, index) => point(index, 0)),
};

describe('the drawn line and the text list', () => {
    it.each(LOCALES)('carry one entry per week, in order, in %s', (locale) => {
        const view = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary(locale));

        expect(view.dots).toHaveLength(SOME_ATTENDANCE.points.length);
        expect(view.values).toHaveLength(view.dots.length);
    });

    it('keeps a quiet week as a drawn zero, not a gap', () => {
        const view = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('en'));

        expect(view.dots[0].count).toBe(0);
        expect(view.values[0].value).toBe('0 Present');
    });

    it('carries the exact count per week', () => {
        const view = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('en'));

        expect(view.values[3].value).toBe('2 Present');
        expect(view.values[7].value).toBe('3 Present');
    });

    it('says the same in Indonesian', () => {
        const view = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('id'));

        expect(view.values[3].value).toBe('2 Hadir');
    });

    it('dates the axis and the list in each locale order', () => {
        const en = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('en'));
        const id = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('id'));

        expect(en.dots[0].label).toBe('Jul 13');
        expect(id.dots[0].label).toBe('13 Jul');
        expect(en.values[0].label).toBe('Week of July 13, 2026');
        expect(id.values[0].label).toBe('Minggu 13 Juli 2026');
    });

    it('takes the headline count from the current week, the last point', () => {
        const view = buildAttendanceSparklineView(SOME_ATTENDANCE, getDictionary('en'));

        expect(view.headlineCount).toBe(3);
    });
});

describe('a member who has not played at all in the window', () => {
    it.each(LOCALES)('draws no line and no list rows in %s', (locale) => {
        const t = getDictionary(locale);
        const view = buildAttendanceSparklineView(NOTHING_PLAYED, t);

        expect(view.dots).toEqual([]);
        expect(view.values).toEqual([]);
        expect(view.emptyChipLabel).toBe(t.insights.emptyChip);
        expect(view.emptyMessage).toBe(t.insights.attendanceEmptyMessage);
        expect(view.emptyMessage.toLowerCase()).not.toContain('period');
        expect(view.emptyMessage.toLowerCase()).not.toContain('periode');
    });

    it('still draws when a single week has one Present row', () => {
        const onlyOne: AttendanceSparklineSeries = {
            points: [...NOTHING_PLAYED.points.slice(0, 7), point(7, 1)],
        };

        expect(
            buildAttendanceSparklineView(onlyOne, getDictionary('en')).dots,
        ).toHaveLength(8);
    });

    it('still reports the headline count for a history that is otherwise empty', () => {
        const onlyLastWeek: AttendanceSparklineSeries = {
            points: [...NOTHING_PLAYED.points.slice(0, 7), point(7, 1)],
        };

        expect(
            buildAttendanceSparklineView(onlyLastWeek, getDictionary('en'))
                .headlineCount,
        ).toBe(1);
    });
});

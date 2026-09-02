import { AttendanceStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
    resolveAttendanceSparklineSeries,
    type AttendanceSparklineInput,
    type AttendanceSparklineRow,
    type AttendanceSparklineSeries,
} from '../attendance-sparkline';
import { CHART_WEEKS, chartWeeks } from '../chart-weeks';

/**
 * What the member dashboard's attendance sparkline claims, asserted as
 * arithmetic: only the member's own Present rows count, week boundaries
 * follow the shared window, and an empty history is eight real zeros, never a
 * gap.
 */

/** Wednesday 2 September 2026, midday in Jakarta. */
const NOW = new Date('2026-09-02T05:00:00.000Z');
const LAST = CHART_WEEKS - 1;

/** Tuesday 1 September — inside the last week (Monday 31 August). */
const LAST_WEEK_DAY = new Date('2026-09-01T00:00:00.000Z');
/** Wednesday 15 July — inside the first week (Monday 13 July). */
const FIRST_WEEK_DAY = new Date('2026-07-15T00:00:00.000Z');
/** The Sunday before the window opens, and the Monday it stops before. */
const BEFORE_WINDOW = new Date('2026-07-12T00:00:00.000Z');
const AFTER_WINDOW = new Date('2026-09-07T00:00:00.000Z');

function row(
    overrides: Partial<AttendanceSparklineRow> = {},
): AttendanceSparklineRow {
    return {
        date: LAST_WEEK_DAY,
        status: AttendanceStatus.PRESENT,
        ...overrides,
    };
}

function series(
    input: Partial<AttendanceSparklineInput> = {},
): AttendanceSparklineSeries {
    return resolveAttendanceSparklineSeries({
        attendances: [],
        now: NOW,
        ...input,
    });
}

describe('the shape of the series', () => {
    it('is one point per week of the shared window, in the same order', () => {
        const result = series();

        expect(result.points).toHaveLength(CHART_WEEKS);
        expect(result.points.map((point) => point.week.key)).toEqual(
            chartWeeks(NOW).map((week) => week.key),
        );
    });

    it('is eight zeros for a member with no attendance at all', () => {
        for (const point of series().points) {
            expect(point.count).toBe(0);
        }
    });
});

describe('which Attendance rows count', () => {
    it('counts a PRESENT row and leaves the other statuses on the same Session out', () => {
        const result = series({
            attendances: [
                row({ status: AttendanceStatus.PRESENT }),
                row({ status: AttendanceStatus.REGISTERED }),
                row({ status: AttendanceStatus.MAYBE }),
                row({ status: AttendanceStatus.ABSENT }),
                row({ status: AttendanceStatus.NO_SHOW }),
            ],
        });

        expect(result.points[LAST].count).toBe(1);
    });

    it.each([
        AttendanceStatus.REGISTERED,
        AttendanceStatus.MAYBE,
        AttendanceStatus.ABSENT,
        AttendanceStatus.NO_SHOW,
    ])('leaves a %s row out of the count', (status) => {
        const result = series({ attendances: [row({ status })] });

        expect(result.points[LAST].count).toBe(0);
    });
});

describe('placing a row in its week', () => {
    it('puts each row in the week its Session date falls in', () => {
        const result = series({
            attendances: [
                row({ date: FIRST_WEEK_DAY }),
                row({ date: LAST_WEEK_DAY }),
            ],
        });

        expect(result.points[0].count).toBe(1);
        expect(result.points[LAST].count).toBe(1);
        expect(result.points[1].count).toBe(0);
    });

    it('sums more than one Present row in the same week', () => {
        const result = series({ attendances: [row(), row(), row()] });

        expect(result.points[LAST].count).toBe(3);
    });

    it('ignores a row on either side of the window', () => {
        const result = series({
            attendances: [row({ date: BEFORE_WINDOW }), row({ date: AFTER_WINDOW })],
        });

        for (const point of result.points) {
            expect(point.count).toBe(0);
        }
    });
});

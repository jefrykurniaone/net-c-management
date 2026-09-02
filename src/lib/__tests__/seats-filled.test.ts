import { AttendanceStatus, SessionStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { CHART_WEEKS, chartWeeks } from '../chart-weeks';
import {
    resolveSeatsFilledSeries,
    type FillChartAttendance,
    type FillChartSession,
    type SeatsFilledInput,
    type SeatsFilledSeries,
} from '../seats-filled';

/**
 * What the admin dashboard's fill line claims, asserted as arithmetic.
 *
 * A capacity figure an Admin acts on — posting more Sessions, or fewer Seats —
 * so each rule deciding what lands in the numerator and the denominator has its
 * own case: cancelled Sessions in neither, only Registered and Present rows in
 * the numerator, a week with no Sessions as no-data rather than a false zero,
 * and a week over capacity reported rather than clamped.
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

function session(
    overrides: Partial<FillChartSession> = {},
): FillChartSession {
    return {
        id: 'session-1',
        date: LAST_WEEK_DAY,
        maxPlayers: 10,
        status: SessionStatus.SCHEDULED,
        ...overrides,
    };
}

function rows(
    sessionId: string,
    count: number,
    status: AttendanceStatus = AttendanceStatus.REGISTERED,
): FillChartAttendance[] {
    return Array.from({ length: count }, () => ({ sessionId, status }));
}

function series(input: Partial<SeatsFilledInput> = {}): SeatsFilledSeries {
    return resolveSeatsFilledSeries({
        sessions: [],
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

    it('is eight no-data weeks for a community that has posted nothing', () => {
        for (const point of series().points) {
            expect(point.percent).toBeNull();
            expect(point.sessionCount).toBe(0);
            expect(point.capacity).toBe(0);
            expect(point.seats).toBe(0);
        }
    });

    it('puts each Session in its own week', () => {
        const result = series({
            sessions: [
                session({ id: 'first', date: FIRST_WEEK_DAY }),
                session({ id: 'last', date: LAST_WEEK_DAY }),
            ],
            attendances: [...rows('first', 5), ...rows('last', 2)],
        });

        expect(result.points[0].percent).toBe(50);
        expect(result.points[LAST].percent).toBe(20);
        expect(result.points[1].percent).toBeNull();
    });
});

describe('a week with no Sessions', () => {
    it('is no-data, never zero percent', () => {
        expect(series().points[LAST].percent).toBeNull();
    });

    it('is distinct from a week whose Sessions took no Seats', () => {
        const result = series({ sessions: [session()] });

        expect(result.points[LAST].percent).toBe(0);
        expect(result.points[LAST].sessionCount).toBe(1);
    });

    it('is what a week holding only cancelled Sessions comes to', () => {
        const result = series({
            sessions: [session({ status: SessionStatus.CANCELLED })],
            attendances: rows('session-1', 10),
        });

        expect(result.points[LAST].percent).toBeNull();
        expect(result.points[LAST].capacity).toBe(0);
        expect(result.points[LAST].seats).toBe(0);
        expect(result.points[LAST].sessionCount).toBe(0);
    });

    it('is what a Session posted with no Seats comes to, and it still counts as a Session', () => {
        const result = series({ sessions: [session({ maxPlayers: 0 })] });

        expect(result.points[LAST].percent).toBeNull();
        expect(result.points[LAST].sessionCount).toBe(1);
    });
});

describe('cancelled Sessions', () => {
    it('are in neither the numerator nor the denominator', () => {
        const result = series({
            sessions: [
                session({ id: 'live', maxPlayers: 10 }),
                session({
                    id: 'off',
                    maxPlayers: 10,
                    status: SessionStatus.CANCELLED,
                }),
            ],
            attendances: [...rows('live', 5), ...rows('off', 10)],
        });

        expect(result.points[LAST]).toMatchObject({
            percent: 50,
            seats: 5,
            capacity: 10,
            sessionCount: 1,
        });
    });
});

describe('which Attendance rows hold a Seat', () => {
    it('counts Registered and Present, and nothing else', () => {
        const result = series({
            sessions: [session({ maxPlayers: 10 })],
            attendances: [
                ...rows('session-1', 2, AttendanceStatus.REGISTERED),
                ...rows('session-1', 3, AttendanceStatus.PRESENT),
                ...rows('session-1', 1, AttendanceStatus.MAYBE),
                ...rows('session-1', 1, AttendanceStatus.ABSENT),
                ...rows('session-1', 1, AttendanceStatus.NO_SHOW),
            ],
        });

        expect(result.points[LAST].seats).toBe(5);
        expect(result.points[LAST].percent).toBe(50);
    });

    it.each([
        AttendanceStatus.MAYBE,
        AttendanceStatus.ABSENT,
        AttendanceStatus.NO_SHOW,
    ])('leaves a %s row out of the fill rate', (status) => {
        const result = series({
            sessions: [session({ maxPlayers: 10 })],
            attendances: rows('session-1', 4, status),
        });

        expect(result.points[LAST].percent).toBe(0);
    });

    it('ignores a row whose Session is not in the window', () => {
        const result = series({
            sessions: [
                session({ id: 'early', date: BEFORE_WINDOW }),
                session({ id: 'late', date: AFTER_WINDOW }),
            ],
            attendances: [...rows('early', 10), ...rows('late', 10)],
        });

        for (const point of result.points) {
            expect(point.percent).toBeNull();
            expect(point.sessionCount).toBe(0);
        }
    });

    it('ignores a row naming a Session that is not in the input at all', () => {
        const result = series({
            sessions: [session({ maxPlayers: 10 })],
            attendances: rows('nowhere', 6),
        });

        expect(result.points[LAST].percent).toBe(0);
    });
});

describe('the percentage', () => {
    it('is 100 for a week whose every Seat is held', () => {
        const result = series({
            sessions: [session({ maxPlayers: 10 })],
            attendances: rows('session-1', 10),
        });

        expect(result.points[LAST].percent).toBe(100);
    });

    it('is 100 across several Sessions that are all full', () => {
        const result = series({
            sessions: [
                session({ id: 'a', maxPlayers: 8 }),
                session({ id: 'b', maxPlayers: 12 }),
            ],
            attendances: [...rows('a', 8), ...rows('b', 12)],
        });

        expect(result.points[LAST]).toMatchObject({
            percent: 100,
            seats: 20,
            capacity: 20,
        });
    });

    it('sums capacity and Seats across a week rather than averaging Sessions', () => {
        const result = series({
            sessions: [
                session({ id: 'a', maxPlayers: 10 }),
                session({ id: 'b', maxPlayers: 30 }),
            ],
            attendances: [...rows('a', 10), ...rows('b', 0)],
        });

        expect(result.points[LAST].percent).toBe(25);
    });

    it('rounds to a whole percent', () => {
        const result = series({
            sessions: [session({ maxPlayers: 3 })],
            attendances: rows('session-1', 1),
        });

        expect(result.points[LAST].percent).toBe(33);
    });

    it('reports over 100 rather than clamping an over-committed week', () => {
        const result = series({
            sessions: [session({ maxPlayers: 10 })],
            attendances: rows('session-1', 12),
        });

        expect(result.points[LAST]).toMatchObject({
            percent: 120,
            seats: 12,
            capacity: 10,
        });
    });
});

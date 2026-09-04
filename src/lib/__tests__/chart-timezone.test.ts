import { PaymentStatus, PaymentType } from '@prisma/client';
import { SessionStatus } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { buildAttendanceSparklineView } from '../attendance-sparkline-view';
import { chartWeeks } from '../chart-weeks';
import { getDictionary } from '../i18n/dictionaries';
import { resolveMoneyByActivitySeries } from '../money-by-activity';
import { resolveSeatsFilledSeries } from '../seats-filled';
import { buildSeatsFilledView } from '../seats-filled-view';

/**
 * The same arithmetic, run on a server **west of UTC**.
 *
 * Why this file exists at all, and why a new module that reads a stored Session
 * date belongs in it as well as in its own suite:
 * `docs/adr/0007-wib-calendar-day-storage.md`.
 */

const ORIGINAL_TZ = process.env.TZ;
process.env.TZ = 'America/New_York';

afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
});

/** Wednesday 2 September 2026, midday in Jakarta. */
const NOW = new Date('2026-09-02T05:00:00.000Z');
/** 15 August 2026 **local**, so `currentPeriod` reads August in any zone. */
const AUGUST_NOW = new Date(2026, 7, 15);

describe('the host these cases need', () => {
    it('is west of UTC, or nothing below proves anything', () => {
        // 1 August at UTC midnight is still 31 July in New York, and the
        // Monday that opens the first week reads as a Sunday there.
        expect(new Date('2026-08-01T00:00:00.000Z').getMonth()).toBe(6);
        expect(new Date('2026-07-13T00:00:00.000Z').getDay()).toBe(0);
        expect(new Date('2026-07-13T00:00:00.000Z').getUTCDay()).toBe(1);
    });
});

describe('the week window, read west of UTC', () => {
    it('still opens each week on the WIB Monday', () => {
        expect(chartWeeks(NOW).map((week) => week.key)).toEqual([
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

    it('still counts a Session posted on the first Monday of the window', () => {
        const result = resolveSeatsFilledSeries({
            sessions: [
                {
                    id: 'monday',
                    date: new Date('2026-07-13T00:00:00.000Z'),
                    maxPlayers: 10,
                    status: SessionStatus.SCHEDULED,
                },
            ],
            attendances: [],
            now: NOW,
        });

        expect(result.points[0].sessionCount).toBe(1);
        expect(result.points[0].percent).toBe(0);
    });
});

describe('a Fee placed by its Session date, read west of UTC', () => {
    function totalForSessionDate(sessionDate: Date): number {
        return resolveMoneyByActivitySeries({
            activities: [{ id: 'badminton', name: 'Badminton' }],
            payments: [
                {
                    id: 'fee-1',
                    activityId: 'badminton',
                    activityName: 'Badminton',
                    amount: 20_000,
                    month: 8,
                    year: 2026,
                    status: PaymentStatus.CONFIRMED,
                    type: PaymentType.SESSION,
                    sessionDate,
                },
            ],
            now: AUGUST_NOW,
        }).total;
    }

    it('counts a Session on the first WIB day of August', () => {
        expect(totalForSessionDate(new Date('2026-08-01T00:00:00.000Z'))).toBe(
            20_000,
        );
    });

    it('leaves out a Session on the last WIB day of July', () => {
        expect(totalForSessionDate(new Date('2026-07-31T00:00:00.000Z'))).toBe(0);
    });
});

describe('a week label, read west of UTC', () => {
    it('names the Monday the week opens on, not the evening before it', () => {
        const view = buildSeatsFilledView(
            {
                points: chartWeeks(NOW).map((week, index) => ({
                    week,
                    percent: index === 0 ? 50 : null,
                    seats: index === 0 ? 5 : 0,
                    capacity: index === 0 ? 10 : 0,
                    sessionCount: index === 0 ? 1 : 0,
                })),
            },
            getDictionary('en'),
        );

        expect(view.dots[0].label).toBe('Jul 13');
        expect(view.values[0].label).toBe('Week of July 13, 2026');
    });
});

describe('an attendance week label, read west of UTC', () => {
    it('names the Monday the week opens on, not the evening before it', () => {
        const view = buildAttendanceSparklineView(
            {
                points: chartWeeks(NOW).map((week, index) => ({
                    week,
                    count: index === 0 ? 2 : 0,
                })),
            },
            getDictionary('en'),
        );

        expect(view.dots[0].label).toBe('Jul 13');
        expect(view.values[0].label).toBe('Week of July 13, 2026');
    });
});

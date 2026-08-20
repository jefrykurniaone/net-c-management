import { describe, it, expect } from 'vitest';
import {
    buildBoardDays,
    type BoardActivity,
    type BoardSession,
} from '../board-days';
import type { SessionQuota } from '../recurring-sessions';

/**
 * The board's day range. What is worth testing here is the module's own laws
 * rather than any markup: every day of the range gets an entry, a day the Admin
 * was expected to post on is told apart from a day nobody planned anything for,
 * and a stored calendar day is read as itself whatever zone the test runner
 * happens to sit in.
 */

const SUNDAY = 0;
const MONDAY = 1;
const TUESDAY = 2;
const THURSDAY = 4;

const DAYS_IN_WEEK = 7;

/** UTC midnight of a `YYYY-MM-DD` WIB day — how Sessions are stored. */
function utcDay(dayKey: string): Date {
    return new Date(`${dayKey}T00:00:00.000Z`);
}

/* Named so an index into a week is checkable by eye. August 2026 starts its
   weeks on the 23rd: Sunday 23 through Saturday 29. */
const SUN_23_AUG = '2026-08-23';
const TUE_25_AUG = '2026-08-25';
const WED_26_AUG = '2026-08-26';
const SAT_29_AUG = '2026-08-29';
const SUN_30_AUG = '2026-08-30';
const TUE_01_SEP = '2026-09-01';
const WED_02_SEP = '2026-09-02';

/** A whole WIB week, Sunday to Saturday. */
const WEEK = { start: utcDay(SUN_23_AUG), end: utcDay(SAT_29_AUG) };

function activity(overrides: Partial<BoardActivity> = {}): BoardActivity {
    return {
        id: 'a1',
        name: 'Badminton',
        recurringDay: TUESDAY,
        recurringStartTime: '19:00',
        recurringEndTime: '21:00',
        defaultLocation: 'GOR Cendrawasih',
        ...overrides,
    };
}

function session(overrides: Partial<BoardSession> = {}): BoardSession {
    return {
        id: 's1',
        activityId: 'a1',
        date: utcDay(TUE_25_AUG),
        title: 'Sesi Rutin Mingguan',
        startTime: '19:00',
        endTime: '21:00',
        location: 'GOR Cendrawasih',
        maxPlayers: 20,
        fee: 25000,
        status: 'SCHEDULED',
        ...overrides,
    };
}

describe('buildBoardDays', () => {
    it('marks the recurring day unposted across a week with no Sessions', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [],
        });

        expect(days).toHaveLength(DAYS_IN_WEEK);
        expect(days.map((day) => day.kind)).toEqual([
            'empty',
            'empty',
            'unposted',
            'empty',
            'empty',
            'empty',
            'empty',
        ]);
        const tuesday = days[TUESDAY];
        expect(tuesday.dayKey).toBe(TUE_25_AUG);
        expect(tuesday.weekday).toBe(TUESDAY);
        expect(tuesday.slots).toHaveLength(1);
        expect(tuesday.slots[0].kind).toBe('unposted');
        // The standing weekly slot supplies the line's time and venue.
        expect(tuesday.slots[0].startTime).toBe('19:00');
        expect(tuesday.slots[0].location).toBe('GOR Cendrawasih');
    });

    it('returns every day of the range in order, none skipped', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [session()],
        });

        expect(days.map((day) => day.dayKey)).toEqual([
            SUN_23_AUG,
            '2026-08-24',
            TUE_25_AUG,
            WED_26_AUG,
            '2026-08-27',
            '2026-08-28',
            SAT_29_AUG,
        ]);
        expect(days.map((day) => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('tells the posted recurring day from the unposted ones', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [
                activity({ id: 'a1', name: 'Badminton', recurringDay: MONDAY }),
                activity({ id: 'a2', name: 'Futsal', recurringDay: TUESDAY }),
                activity({ id: 'a3', name: 'Tenis', recurringDay: THURSDAY }),
            ],
            // Only the Tuesday Activity has had its Session posted.
            sessions: [session({ id: 's2', activityId: 'a2' })],
        });

        expect(days.map((day) => day.kind)).toEqual([
            'empty',
            'unposted',
            'posted',
            'empty',
            'unposted',
            'empty',
            'empty',
        ]);
        const posted = days[TUESDAY].slots[0];
        expect(posted.kind).toBe('posted');
        expect(posted.activity.name).toBe('Futsal');
        expect(posted.kind === 'posted' && posted.session.id).toBe('s2');
    });

    it('a community with no Sessions at all still has planned days', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [
                activity({ id: 'a1', recurringDay: SUNDAY }),
                activity({ id: 'a2', recurringDay: TUESDAY }),
            ],
            sessions: [],
        });

        expect(days.filter((day) => day.kind === 'unposted')).toHaveLength(2);
        expect(days.every((day) => day.kind !== 'posted')).toBe(true);
    });

    it('crosses a month boundary without dropping or renumbering a day', () => {
        const days = buildBoardDays({
            range: { start: utcDay(SUN_30_AUG), end: utcDay(WED_02_SEP) },
            activities: [activity({ recurringDay: TUESDAY })],
            sessions: [session({ date: utcDay(TUE_01_SEP) })],
        });

        expect(days.map((day) => day.dayKey)).toEqual([
            SUN_30_AUG,
            '2026-08-31',
            TUE_01_SEP,
            WED_02_SEP,
        ]);
        expect(days.map((day) => day.dayOfMonth)).toEqual([30, 31, 1, 2]);
        expect(days.map((day) => day.monthNumber)).toEqual([8, 8, 9, 9]);
        expect(days.map((day) => day.year)).toEqual([2026, 2026, 2026, 2026]);
        expect(days.map((day) => day.kind)).toEqual([
            'empty',
            'empty',
            'posted',
            'empty',
        ]);
    });

    it('crosses a year boundary the same way', () => {
        const days = buildBoardDays({
            range: { start: utcDay('2026-12-31'), end: utcDay('2027-01-01') },
            activities: [],
            sessions: [],
        });

        expect(days.map((day) => day.dayKey)).toEqual([
            '2026-12-31',
            '2027-01-01',
        ]);
        expect(days.map((day) => day.year)).toEqual([2026, 2027]);
    });

    it('returns exactly one entry for a range of one day', () => {
        const days = buildBoardDays({
            range: { start: utcDay(TUE_25_AUG), end: utcDay(TUE_25_AUG) },
            activities: [activity()],
            sessions: [session()],
        });

        expect(days).toHaveLength(1);
        expect(days[0].dayKey).toBe(TUE_25_AUG);
        expect(days[0].kind).toBe('posted');
    });

    it('never plans a day for an Activity with no recurring day', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity({ recurringDay: null })],
            sessions: [],
        });

        expect(days.every((day) => day.kind === 'empty')).toBe(true);
        expect(days.every((day) => day.slots.length === 0)).toBe(true);
    });

    it('still posts a Session for an Activity with no recurring day', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity({ recurringDay: null })],
            sessions: [session()],
        });

        expect(days[TUESDAY].kind).toBe('posted');
        expect(days.filter((day) => day.kind === 'empty')).toHaveLength(
            DAYS_IN_WEEK - 1,
        );
    });

    it('reads the stored calendar day, not a locally-shifted one', () => {
        // Late in the UTC day: a local-time formatter running east of UTC would
        // file this Session under the 26th, a day after it happened.
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [
                session({ date: new Date(`${TUE_25_AUG}T23:30:00.000Z`) }),
            ],
        });

        expect(days[TUESDAY].dayKey).toBe(TUE_25_AUG);
        expect(days[TUESDAY].kind).toBe('posted');
        const wednesday = days.find((day) => day.dayKey === WED_26_AUG);
        expect(wednesday?.kind).toBe('empty');
    });

    it('carries the quota the caller read, and null where it read none', () => {
        const quota: SessionQuota = { committed: 3, needed: 8, isMet: false };
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [session(), session({ id: 's2', startTime: '07:00' })],
            quotas: new Map([['s1', quota]]),
        });

        const [early, late] = days[TUESDAY].slots;
        expect(late.kind === 'posted' && late.quota).toEqual(quota);
        expect(early.kind === 'posted' && early.quota).toBeNull();
    });

    it('keeps an Activity off the unposted list once it has a Session', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [session()],
        });

        expect(days[TUESDAY].slots).toHaveLength(1);
        expect(days[TUESDAY].slots[0].kind).toBe('posted');
    });

    it('carries a cancelled Session rather than calling the day unposted', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity()],
            sessions: [session({ status: 'CANCELLED' })],
        });

        const [slot] = days[TUESDAY].slots;
        expect(days[TUESDAY].kind).toBe('posted');
        expect(slot.kind === 'posted' && slot.session.status).toBe('CANCELLED');
    });

    it('reads a day by the clock, earliest line first', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [
                activity({ id: 'a1', name: 'Badminton' }),
                activity({
                    id: 'a2',
                    name: 'Futsal',
                    recurringStartTime: '06:00',
                    recurringEndTime: '08:00',
                }),
            ],
            sessions: [session()],
        });

        expect(days[TUESDAY].slots.map((slot) => slot.startTime)).toEqual([
            '06:00',
            '19:00',
        ]);
        expect(days[TUESDAY].slots.map((slot) => slot.kind)).toEqual([
            'unposted',
            'posted',
        ]);
        expect(days[TUESDAY].kind).toBe('posted');
    });

    it('ignores a Session whose Activity was not supplied', () => {
        const days = buildBoardDays({
            range: WEEK,
            activities: [activity({ id: 'a1', recurringDay: null })],
            sessions: [session({ id: 's9', activityId: 'gone' })],
        });

        expect(days.every((day) => day.slots.length === 0)).toBe(true);
    });

    it('describes no days when the range ends before it starts', () => {
        const days = buildBoardDays({
            range: { start: utcDay(TUE_25_AUG), end: utcDay(SUN_23_AUG) },
            activities: [activity()],
            sessions: [session()],
        });

        expect(days).toEqual([]);
    });
});

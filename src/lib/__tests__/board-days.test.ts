import { describe, it, expect } from 'vitest';
import {
    buildBoardDays,
    type BoardActivity,
    type BoardDay,
    type BoardDaysInput,
    type BoardSession,
} from '../board-days';
import type { SessionQuota } from '../recurring-sessions';

/**
 * The board's day range. What is worth testing is the module's own laws rather
 * than any markup: every day of the range gets an entry, only a posted Session
 * ever turns a day's kind away from empty, and a stored calendar day is read as
 * itself whatever zone the runner sits in.
 */

const TUESDAY = 2;

const DAYS_IN_WEEK = 7;

/** UTC midnight of a `YYYY-MM-DD` WIB day — how Sessions are stored. */
function utcDay(dayKey: string): Date {
    return new Date(`${dayKey}T00:00:00.000Z`);
}

/* Named so an index into a week is checkable by eye: August 2026 runs a week
   from Sunday the 23rd to Saturday the 29th. */
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

/** One Tuesday Activity across the whole week, and nothing posted. */
function board(input: Partial<BoardDaysInput> = {}): BoardDay[] {
    return buildBoardDays({
        range: WEEK,
        activities: [activity()],
        sessions: [],
        ...input,
    });
}

/** The week's situations in one readable line. */
function kindsOf(days: readonly BoardDay[]): string {
    return days.map((day) => day.kind).join(' ');
}

const EMPTY_WEEK = 'empty empty empty empty empty empty empty';

describe('buildBoardDays', () => {
    it('yields no entries for a recurring weekday with nothing posted, Monthly billing off or not', () => {
        // `unpostedSlots` used to invent a card from `recurringDay` alone, a
        // rule wider than `ensureRecurringSessions`'s own (`recurringDay` AND
        // Monthly billing, `recurring-sessions.ts`) — an Activity with Monthly
        // billing off got a phantom card here forever, since nothing about
        // that Activity's billing mode reaches `BoardActivity`. The producer
        // is gone, so this reads empty whichever way that Activity is billed.
        const days = board();

        expect(days).toHaveLength(DAYS_IN_WEEK);
        expect(kindsOf(days)).toBe(EMPTY_WEEK);
        expect(days.every((day) => day.slots.length === 0)).toBe(true);
    });

    it('returns every day of the range in order, none skipped', () => {
        const days = board({ sessions: [session()] });

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
        expect(kindsOf(days)).toBe('empty empty posted empty');
    });

    it('crosses a year boundary the same way', () => {
        const days = buildBoardDays({
            range: { start: utcDay('2026-12-31'), end: utcDay('2027-01-01') },
            activities: [],
            sessions: [],
        });

        expect(days.map((day) => day.dayKey)).toEqual(['2026-12-31', '2027-01-01']);
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
        const days = board({ activities: [activity({ recurringDay: null })] });

        expect(kindsOf(days)).toBe(EMPTY_WEEK);
        expect(days.every((day) => day.slots.length === 0)).toBe(true);
    });

    it('still posts a Session for an Activity with no recurring day', () => {
        const days = board({
            activities: [activity({ recurringDay: null })],
            sessions: [session()],
        });

        expect(kindsOf(days)).toBe('empty empty posted empty empty empty empty');
    });

    it('reads the stored calendar day, not a locally-shifted one', () => {
        // Late in the UTC day: a local-time formatter running east of UTC would
        // file this Session under the 26th, a day after it happened.
        const days = board({
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
        const days = board({
            sessions: [session(), session({ id: 's2', startTime: '07:00' })],
            quotas: new Map([['s1', quota]]),
        });

        const [early, late] = days[TUESDAY].slots;
        expect(late.kind === 'posted' && late.quota).toEqual(quota);
        expect(early.kind === 'posted' && early.quota).toBeNull();
    });

    it('carries a cancelled Session rather than calling the day unposted', () => {
        const days = board({ sessions: [session({ status: 'CANCELLED' })] });

        const [slot] = days[TUESDAY].slots;
        expect(days[TUESDAY].kind).toBe('posted');
        expect(slot.kind === 'posted' && slot.session.status).toBe('CANCELLED');
    });

    it('ignores a Session whose Activity was not supplied', () => {
        const days = board({
            activities: [activity({ id: 'a1', recurringDay: null })],
            sessions: [session({ id: 's9', activityId: 'gone' })],
        });

        expect(kindsOf(days)).toBe(EMPTY_WEEK);
    });

    it('describes no days when the range ends before it starts', () => {
        const days = board({
            range: { start: utcDay(TUE_25_AUG), end: utcDay(SUN_23_AUG) },
            sessions: [session()],
        });

        expect(days).toEqual([]);
    });
});

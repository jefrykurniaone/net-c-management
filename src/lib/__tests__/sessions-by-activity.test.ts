import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    buildSessionsByActivity,
    type SectionActivity,
    type SessionCard,
    type SessionsByActivityInput,
} from '../sessions-by-activity';

/**
 * What is worth testing here is the module's own laws, never markup: section
 * order, card order within a section, the six-card cap and its true total, and
 * a stored calendar day read as itself whatever zone the runner sits in
 * (`docs/adr/0007-wib-calendar-day-storage.md`).
 */

/** UTC midnight of a `YYYY-MM-DD` WIB day — how Sessions and "today" are stored. */
function utcDay(dayKey: string): Date {
    return new Date(`${dayKey}T00:00:00.000Z`);
}

const MON_24_AUG = '2026-08-24';
const TUE_25_AUG = '2026-08-25';
const WED_26_AUG = '2026-08-26';
const THU_27_AUG = '2026-08-27';
const TODAY = utcDay(TUE_25_AUG);

function activity(overrides: Partial<SectionActivity> = {}): SectionActivity {
    return {
        id: 'a1',
        name: 'Badminton',
        icon: null,
        ...overrides,
    };
}

function card(overrides: Partial<SessionCard> = {}): SessionCard {
    return {
        id: 's1',
        activityId: 'a1',
        date: utcDay(TUE_25_AUG),
        startTime: '19:00',
        endTime: '21:00',
        location: 'GOR Cendrawasih',
        maxPlayers: 20,
        fee: 25_000,
        status: 'SCHEDULED',
        seats: { free: 10, max: 20 },
        quota: null,
        isDuesCovered: false,
        ...overrides,
    };
}

function build(overrides: Partial<SessionsByActivityInput> = {}) {
    return buildSessionsByActivity({
        today: TODAY,
        activities: [activity()],
        sessions: [],
        joinedActivityIds: new Set(),
        isSingleActivitySelected: false,
        ...overrides,
    });
}

describe('buildSessionsByActivity', () => {
    it('orders sections by the soonest upcoming session, earliest first', () => {
        const sections = build({
            activities: [
                activity({ id: 'a1', name: 'Badminton' }),
                activity({ id: 'a2', name: 'Futsal' }),
            ],
            sessions: [
                card({ id: 's1', activityId: 'a1', date: utcDay(THU_27_AUG) }),
                card({ id: 's2', activityId: 'a2', date: utcDay(TUE_25_AUG) }),
            ],
        });

        expect(sections.map((section) => section.activity.id)).toEqual([
            'a2',
            'a1',
        ]);
    });

    it('sorts a joined Activity ahead of one not joined, on the same day', () => {
        const sections = build({
            activities: [
                activity({ id: 'a1', name: 'Badminton' }),
                activity({ id: 'a2', name: 'Futsal' }),
            ],
            sessions: [
                card({ id: 's1', activityId: 'a1', date: utcDay(TUE_25_AUG) }),
                card({ id: 's2', activityId: 'a2', date: utcDay(TUE_25_AUG) }),
            ],
            joinedActivityIds: new Set(['a2']),
        });

        expect(sections.map((section) => section.activity.id)).toEqual([
            'a2',
            'a1',
        ]);
        expect(sections[0].isJoined).toBe(true);
        expect(sections[1].isJoined).toBe(false);
    });

    it('sorts an Activity with no upcoming session last, in a stable order among its peers', () => {
        const sections = build({
            activities: [
                activity({ id: 'a1', name: 'Badminton' }),
                activity({ id: 'a2', name: 'Futsal' }),
                activity({ id: 'a3', name: 'Tenis' }),
            ],
            sessions: [
                card({ id: 's1', activityId: 'a3', date: utcDay(TUE_25_AUG) }),
            ],
        });

        // a1 and a2 both have nothing upcoming: they keep the order they were given in.
        expect(sections.map((section) => section.activity.id)).toEqual([
            'a3',
            'a1',
            'a2',
        ]);
        expect(sections[1].total).toBe(0);
        expect(sections[1].cards).toEqual([]);
    });

    it('orders cards within a section by date, earliest first', () => {
        const sections = build({
            sessions: [
                card({ id: 'later', date: utcDay(THU_27_AUG) }),
                card({ id: 'sooner', date: utcDay(TUE_25_AUG) }),
                card({ id: 'middle', date: utcDay(WED_26_AUG) }),
            ],
        });

        expect(sections[0].cards.map((one) => one.id)).toEqual([
            'sooner',
            'middle',
            'later',
        ]);
    });

    it('breaks a same-day tie by time then id, the way the day builder does', () => {
        const sections = build({
            sessions: [
                card({ id: 'z-later-time', startTime: '19:00' }),
                card({ id: 'a-same-time-b', startTime: '07:00' }),
                card({ id: 'a-same-time-a', startTime: '07:00' }),
            ],
        });

        expect(sections[0].cards.map((one) => one.id)).toEqual([
            'a-same-time-a',
            'a-same-time-b',
            'z-later-time',
        ]);
    });

    it('caps a section at six cards and reports the true total, not the truncated count', () => {
        const sessions = Array.from({ length: 8 }, (_unused, index) =>
            card({
                id: `s${index}`,
                date: new Date(TODAY.getTime() + index * 24 * 60 * 60 * 1000),
            }),
        );
        const sections = build({ sessions });

        expect(sections[0].cards).toHaveLength(6);
        expect(sections[0].total).toBe(8);
        expect(sections[0].isTruncated).toBe(true);
    });

    it('does not cap or truncate when a single Activity is selected', () => {
        const sessions = Array.from({ length: 8 }, (_unused, index) =>
            card({
                id: `s${index}`,
                date: new Date(TODAY.getTime() + index * 24 * 60 * 60 * 1000),
            }),
        );
        const sections = build({ sessions, isSingleActivitySelected: true });

        expect(sections[0].cards).toHaveLength(8);
        expect(sections[0].total).toBe(8);
        expect(sections[0].isTruncated).toBe(false);
    });

    it('does not truncate a section with exactly six upcoming sessions', () => {
        const sessions = Array.from({ length: 6 }, (_unused, index) =>
            card({
                id: `s${index}`,
                date: new Date(TODAY.getTime() + index * 24 * 60 * 60 * 1000),
            }),
        );
        const sections = build({ sessions });

        expect(sections[0].cards).toHaveLength(6);
        expect(sections[0].isTruncated).toBe(false);
    });

    it('only includes sessions from today forward', () => {
        const sections = build({
            sessions: [
                card({ id: 'yesterday', date: utcDay(MON_24_AUG) }),
                card({ id: 'today', date: utcDay(TUE_25_AUG) }),
                card({ id: 'tomorrow', date: utcDay(WED_26_AUG) }),
            ],
        });

        expect(sections[0].cards.map((one) => one.id)).toEqual([
            'today',
            'tomorrow',
        ]);
        expect(sections[0].total).toBe(2);
    });

    it('sorts an Activity whose only sessions are all in the past as having none upcoming', () => {
        const sections = build({
            activities: [
                activity({ id: 'a1', name: 'Badminton' }),
                activity({ id: 'a2', name: 'Futsal' }),
            ],
            sessions: [
                card({ id: 's1', activityId: 'a1', date: utcDay(MON_24_AUG) }),
                card({ id: 's2', activityId: 'a2', date: utcDay(TUE_25_AUG) }),
            ],
        });

        expect(sections.map((section) => section.activity.id)).toEqual([
            'a2',
            'a1',
        ]);
        expect(sections[1].total).toBe(0);
    });

    it('ignores a Session whose Activity was not supplied', () => {
        const sections = build({
            activities: [activity({ id: 'a1' })],
            sessions: [card({ id: 's9', activityId: 'gone' })],
        });

        expect(sections[0].total).toBe(0);
        expect(sections[0].cards).toEqual([]);
    });

    it('carries the seats, own status, hold deadline, quota and dues coverage through untouched', () => {
        const holdExpiresAt = new Date('2026-08-25T12:00:00.000Z');
        const quota = { committed: 3, needed: 8, isMet: false };
        const sections = build({
            sessions: [
                card({
                    seats: { free: 4, max: 20 },
                    ownStatus: 'REGISTERED',
                    holdExpiresAt,
                    quota,
                    isDuesCovered: true,
                }),
            ],
        });

        const [only] = sections[0].cards;
        expect(only.seats).toEqual({ free: 4, max: 20 });
        expect(only.ownStatus).toBe('REGISTERED');
        expect(only.holdExpiresAt).toBe(holdExpiresAt);
        expect(only.quota).toEqual(quota);
        expect(only.isDuesCovered).toBe(true);
    });
});

describe('reads a stored WIB calendar day as itself, west of UTC (docs/adr/0007)', () => {
    const ORIGINAL_TZ = process.env.TZ;

    beforeAll(() => {
        process.env.TZ = 'America/New_York';
    });

    afterAll(() => {
        process.env.TZ = ORIGINAL_TZ;
    });

    it('is west of UTC, or nothing below proves anything', () => {
        expect(new Date('2026-08-25T00:00:00.000Z').getUTCDate()).toBe(25);
    });

    it('keeps a Session late in today\'s UTC day and drops one late in yesterday\'s', () => {
        const sections = build({
            sessions: [
                card({
                    id: 'today-late',
                    date: new Date(`${TUE_25_AUG}T23:30:00.000Z`),
                }),
                card({
                    id: 'yesterday-late',
                    date: new Date(`${MON_24_AUG}T23:30:00.000Z`),
                }),
            ],
        });

        expect(sections[0].cards.map((one) => one.id)).toEqual(['today-late']);
    });
});

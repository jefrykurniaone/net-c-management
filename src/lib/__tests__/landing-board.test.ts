import { describe, it, expect } from 'vitest';
import { getDictionary } from '../i18n/dictionaries';
import { buildBoardRows } from '../landing-board';
import type { PublicActivity, PublicSession } from '../public-landing';

/**
 * The public route's one band of substance. What is worth testing here is the
 * band's own laws rather than its markup: fees publish including zero, an
 * Activity with no scheduled session keeps its row, and a session date is read
 * off the WIB calendar day it was stored as rather than through whatever zone
 * the server happens to run in.
 */

const en = getDictionary('en');
const id = getDictionary('id');

const TUESDAY = 2;

function activity(overrides: Partial<PublicActivity> = {}): PublicActivity {
    return {
        id: 'a1',
        name: 'Badminton',
        icon: null,
        color: '#16a34a',
        recurringDay: TUESDAY,
        recurringStartTime: '19:00',
        recurringEndTime: '21:00',
        defaultLocation: 'GOR Cendrawasih',
        monthlyFee: 150000,
        sessionFee: 25000,
        allowsMonthly: true,
        allowsPerSession: true,
        ...overrides,
    };
}

function session(overrides: Partial<PublicSession> = {}): PublicSession {
    return {
        id: 's1',
        activityId: 'a1',
        // Stored as UTC midnight of its WIB calendar day.
        date: new Date('2026-08-25T00:00:00.000Z'),
        startTime: '19:00',
        endTime: '21:00',
        ...overrides,
    };
}

describe('buildBoardRows', () => {
    it('fuses each Activity with its own next session', () => {
        const rows = buildBoardRows(
            {
                activities: [activity(), activity({ id: 'a2', name: 'Futsal' })],
                nextSessions: [session(), session({ id: 's2', activityId: 'a2' })],
            },
            en,
        );

        expect(rows.map((row) => row.nextDate)).toEqual([
            '25 August · 19:00–21:00',
            '25 August · 19:00–21:00',
        ]);
    });

    it('keeps the row and leaves the date unset when nothing is scheduled', () => {
        const rows = buildBoardRows(
            { activities: [activity()], nextSessions: [] },
            en,
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].nextDate).toBeNull();
    });

    it('reads the stored calendar day, not a locally-shifted one', () => {
        // Late in the UTC day: a local-time formatter running east of UTC would
        // report the 26th here, advertising a session a day after it happened.
        const rows = buildBoardRows(
            {
                activities: [activity()],
                nextSessions: [session({ date: new Date('2026-08-25T23:30:00.000Z') })],
            },
            en,
        );

        expect(rows[0].nextDate).toBe('25 August · 19:00–21:00');
    });

    it('writes the standing weekly slot from the shared day names', () => {
        const [row] = buildBoardRows(
            { activities: [activity()], nextSessions: [] },
            en,
        );
        const [baris] = buildBoardRows(
            { activities: [activity()], nextSessions: [] },
            id,
        );

        expect(row.weeklySlot).toBe('Every Tuesday · 19:00–21:00');
        expect(baris.weeklySlot).toBe('Setiap Selasa · 19:00–21:00');
    });

    it('leaves the weekly slot unset for an Activity with no recurring day', () => {
        const [row] = buildBoardRows(
            {
                activities: [activity({ recurringDay: null })],
                nextSessions: [],
            },
            en,
        );

        expect(row.weeklySlot).toBeNull();
    });

    it('shows both fees with monthly first where both modes are offered', () => {
        const [row] = buildBoardRows(
            { activities: [activity()], nextSessions: [] },
            en,
        );

        expect(row.feePrimary).toBe('Rp 150.000 / month');
        expect(row.feeSecondary).toBe('Rp 25.000 / session');
    });

    it('publishes a zero fee as free rather than as Rp 0', () => {
        const [row] = buildBoardRows(
            {
                activities: [
                    activity({ monthlyFee: 0, allowsPerSession: false }),
                ],
                nextSessions: [],
            },
            en,
        );

        expect(row.feePrimary).toBe('Free');
        expect(row.feeSecondary).toBeNull();
    });

    it('leads with the per-session fee where that is the only mode', () => {
        const [row] = buildBoardRows(
            {
                activities: [activity({ allowsMonthly: false })],
                nextSessions: [],
            },
            en,
        );

        expect(row.feePrimary).toBe('Rp 25.000 / session');
        expect(row.feeSecondary).toBeNull();
    });

    it('always produces a livery letter, even for an unlettered name', () => {
        const rows = buildBoardRows(
            {
                activities: [
                    activity({ name: ' badminton' }),
                    activity({ id: 'a2', name: '   ' }),
                ],
                nextSessions: [],
            },
            en,
        );

        expect(rows.map((row) => row.initial)).toEqual(['B', '·']);
    });
});

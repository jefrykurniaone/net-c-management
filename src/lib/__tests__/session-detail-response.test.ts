import { describe, expect, it } from 'vitest';
import type { AttendanceStatus } from '@prisma/client';
import { toSessionDetailResponse } from '../session-detail-response';

/**
 * `GET /api/sessions/[id]` used to hand the Prisma result straight to
 * `NextResponse.json`, so every Attendance column reached every admitted
 * member — `holdExpiresAt` among them, which says who has claimed a Seat
 * without paying for it and when their hold lapses.
 *
 * This file is the guard on that. It enumerates the keys an attendee entry may
 * carry and fails on any addition, so a later edit that widens the query's
 * `select` back to an `include` cannot widen the response with it. The
 * assertions run on plain objects and know nothing about the query, which is
 * what makes them survive a refactor of it.
 */

const SESSION_ID = 'sess-1';
const VIEWER_ID = 'user-reader';
const OTHER_ID = 'user-other';
const STRANGER_ID = 'user-stranger';

const VIEWER_HOLD = new Date('2026-09-03T11:00:00.000Z');
const OTHER_HOLD = new Date('2026-09-03T12:00:00.000Z');

/** Every key an attendee entry of the response may carry, whoever is reading. */
const PERMITTED_KEYS = ['holdExpiresAt', 'id', 'status', 'user'];

/** The subset that is the reader's own business and nobody else's. */
const VIEWER_ONLY_KEYS = ['holdExpiresAt'];

/** Columns of `Attendance` that no surface renders and that never ship. */
const DROPPED_COLUMNS = [
    'userId',
    'sessionId',
    'note',
    'createdAt',
    'updatedAt',
];

/**
 * An Attendance row exactly as the unnarrowed `include` used to hand it over:
 * every column of the model, plus the `user` the query already narrowed. The
 * serialiser is fed the wide row on purpose — dropping what it does not name
 * is the behaviour under test.
 */
interface StoredAttendanceRow {
    readonly id: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly status: AttendanceStatus;
    readonly note: string | null;
    readonly holdExpiresAt: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly user: Readonly<{
        id: string;
        name: string | null;
        image: string | null;
    }>;
}

function storedRow(
    id: string,
    userId: string,
    holdExpiresAt: Date | null,
): StoredAttendanceRow {
    return {
        id,
        userId,
        sessionId: SESSION_ID,
        status: 'REGISTERED',
        note: 'transferred yesterday',
        holdExpiresAt,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-02T00:00:00.000Z'),
        user: { id: userId, name: `Member ${userId}`, image: `/${userId}.png` },
    };
}

/** The Session row the route queries, around whichever attendees are given. */
function storedSession(rows: readonly StoredAttendanceRow[]) {
    return {
        id: SESSION_ID,
        title: 'Friday Night',
        fee: 50000,
        maxPlayers: 12,
        activity: {
            id: 'act-1',
            name: 'Badminton',
            bankName: 'BCA',
            bankAccountNumber: '1234567890',
            bankAccountHolder: 'XClub Community',
        },
        _count: { attendances: rows.length },
        attendances: rows,
    };
}

const viewerRow = storedRow('att-viewer', VIEWER_ID, VIEWER_HOLD);
const otherRow = storedRow('att-other', OTHER_ID, OTHER_HOLD);
const response = toSessionDetailResponse(
    storedSession([viewerRow, otherRow]),
    VIEWER_ID,
);
const [viewerEntry, otherEntry] = response.attendances;

describe('toSessionDetailResponse — the hold expiry', () => {
    it('keeps the requesting member their own hold expiry', () => {
        expect(viewerEntry.holdExpiresAt).toBe(VIEWER_HOLD);
    });

    it('drops another member hold expiry, key and all', () => {
        expect('holdExpiresAt' in otherEntry).toBe(false);
        expect(Object.keys(otherEntry)).not.toContain('holdExpiresAt');
    });

    it('sends the reader own absent hold as null, not as a missing key', () => {
        const [entry] = toSessionDetailResponse(
            storedSession([storedRow('att-viewer', VIEWER_ID, null)]),
            VIEWER_ID,
        ).attendances;
        expect('holdExpiresAt' in entry).toBe(true);
        expect(entry.holdExpiresAt).toBeNull();
    });

    it('gives a reader who attends nothing here nobody hold expiry', () => {
        const stranger = toSessionDetailResponse(
            storedSession([viewerRow, otherRow]),
            STRANGER_ID,
        );
        for (const entry of stranger.attendances) {
            expect('holdExpiresAt' in entry).toBe(false);
        }
    });
});

describe('toSessionDetailResponse — the permitted keys', () => {
    it('carries no key beyond the enumerated set', () => {
        for (const entry of response.attendances) {
            for (const key of Object.keys(entry)) {
                expect(PERMITTED_KEYS).toContain(key);
            }
        }
    });

    it('gives every entry the keys that are not the reader own', () => {
        const shared = PERMITTED_KEYS.filter(
            (key) => !VIEWER_ONLY_KEYS.includes(key),
        );
        for (const entry of response.attendances) {
            expect(Object.keys(entry).sort()).toEqual(
                expect.arrayContaining(shared),
            );
        }
    });

    it.each(DROPPED_COLUMNS)('drops %s from every entry', (column) => {
        for (const entry of response.attendances) {
            expect(column in entry).toBe(false);
        }
    });

    it('renders each entry whole, and nothing more', () => {
        expect(viewerEntry).toStrictEqual({
            id: 'att-viewer',
            status: 'REGISTERED',
            user: {
                id: VIEWER_ID,
                name: `Member ${VIEWER_ID}`,
                image: `/${VIEWER_ID}.png`,
            },
            holdExpiresAt: VIEWER_HOLD,
        });
        expect(otherEntry).toStrictEqual({
            id: 'att-other',
            status: 'REGISTERED',
            user: {
                id: OTHER_ID,
                name: `Member ${OTHER_ID}`,
                image: `/${OTHER_ID}.png`,
            },
        });
    });

    it('keeps name and image, which the players card renders', () => {
        expect(otherEntry.user.name).toBe(`Member ${OTHER_ID}`);
        expect(otherEntry.user.image).toBe(`/${OTHER_ID}.png`);
    });
});

describe('toSessionDetailResponse — the rest of the body', () => {
    it('passes the Session row through untouched', () => {
        const { attendances, ...session } = response;
        expect(attendances).toHaveLength(2);
        expect(session).toStrictEqual({
            id: SESSION_ID,
            title: 'Friday Night',
            fee: 50000,
            maxPlayers: 12,
            activity: {
                id: 'act-1',
                name: 'Badminton',
                bankName: 'BCA',
                bankAccountNumber: '1234567890',
                bankAccountHolder: 'XClub Community',
            },
            _count: { attendances: 2 },
        });
    });

    it('keeps the query row order', () => {
        expect(response.attendances.map((entry) => entry.id)).toEqual([
            'att-viewer',
            'att-other',
        ]);
    });

    it('keeps an attendee whose name and image are unset', () => {
        const anonymous = {
            ...storedRow('att-anon', OTHER_ID, null),
            user: { id: OTHER_ID, name: null, image: null },
        };
        const [entry] = toSessionDetailResponse(
            storedSession([anonymous]),
            VIEWER_ID,
        ).attendances;
        expect(entry.user).toStrictEqual({
            id: OTHER_ID,
            name: null,
            image: null,
        });
    });
});

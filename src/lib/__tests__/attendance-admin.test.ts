import { describe, it, expect } from 'vitest';
import type { AttendanceStatus } from '@prisma/client';
import {
    changedRows,
    draftStatusOf,
    isAttendanceUntaken,
    MAX_BULK_ATTENDANCE_ROWS,
    parseBulkAttendance,
    prefillPresent,
    pruneAppliedEdits,
    rowsNeedingWrite,
    sessionEndInstant,
    type AttendanceEdits,
    type BulkPayloadError,
    type RecordedRow,
} from '../attendance-admin';

/**
 * The rules a bulk attendance save is made of. Every one of them is a way the
 * feature can lose or invent a record: a payload that half-validates writes half
 * a list, an untouched row that gets written rewrites a timestamp nobody
 * changed, and a Session that ended with everyone still Registered must stay
 * exactly that — never a No-Show anybody derived.
 */

const SEATED = new Set(['u1', 'u2', 'u3']);

function row(userId: string, status: AttendanceStatus): RecordedRow {
    return { userId, status };
}

describe('parseBulkAttendance', () => {
    it('accepts rows an Admin may set for members seated on this session', () => {
        const parsed = parseBulkAttendance(
            {
                rows: [
                    { userId: 'u1', status: 'PRESENT' },
                    { userId: 'u2', status: 'NO_SHOW' },
                ],
            },
            SEATED,
        );

        expect(parsed).toEqual({
            ok: true,
            rows: [
                { userId: 'u1', status: 'PRESENT' },
                { userId: 'u2', status: 'NO_SHOW' },
            ],
        });
    });

    it('accepts all four values an Admin may set, and only those four', () => {
        const parsed = parseBulkAttendance(
            {
                rows: [
                    { userId: 'u1', status: 'REGISTERED' },
                    { userId: 'u2', status: 'ABSENT' },
                    { userId: 'u3', status: 'PRESENT' },
                ],
            },
            SEATED,
        );

        expect(parsed.ok).toBe(true);
    });

    const refusals: readonly [string, unknown, BulkPayloadError][] = [
        ['no rows key at all', {}, 'ROWS_MISSING'],
        ['a null body', null, 'ROWS_MISSING'],
        ['rows that is not an array', { rows: 'PRESENT' }, 'ROWS_MISSING'],
        ['an empty list', { rows: [] }, 'ROWS_EMPTY'],
        [
            'a row that is not an object',
            { rows: ['u1'] },
            'ROW_INVALID',
        ],
        [
            'a row with no userId',
            { rows: [{ status: 'PRESENT' }] },
            'ROW_INVALID',
        ],
        [
            'a row with an empty userId',
            { rows: [{ userId: '', status: 'PRESENT' }] },
            'ROW_INVALID',
        ],
        [
            'a status outside the enum',
            { rows: [{ userId: 'u1', status: 'ATTENDED' }] },
            'ROW_INVALID',
        ],
        [
            'MAYBE, which is the member’s own and never an Admin’s',
            { rows: [{ userId: 'u1', status: 'MAYBE' }] },
            'ROW_INVALID',
        ],
        [
            'the same member twice',
            {
                rows: [
                    { userId: 'u1', status: 'PRESENT' },
                    { userId: 'u1', status: 'ABSENT' },
                ],
            },
            'DUPLICATE_USER',
        ],
        [
            'a member who holds no seat on this session',
            { rows: [{ userId: 'stranger', status: 'PRESENT' }] },
            'USER_NOT_ON_SESSION',
        ],
    ];

    it.each(refusals)('refuses %s', (_case, body, error) => {
        expect(parseBulkAttendance(body, SEATED)).toEqual({ ok: false, error });
    });

    it('refuses more rows than one save may carry', () => {
        const rows = Array.from(
            { length: MAX_BULK_ATTENDANCE_ROWS + 1 },
            (_unused, index) => ({ userId: `u${index}`, status: 'PRESENT' }),
        );

        expect(parseBulkAttendance({ rows }, SEATED)).toEqual({
            ok: false,
            error: 'ROWS_TOO_MANY',
        });
    });

    it('refuses the whole payload when one row of many is bad', () => {
        const parsed = parseBulkAttendance(
            {
                rows: [
                    { userId: 'u1', status: 'PRESENT' },
                    { userId: 'u2', status: 'MAYBE' },
                    { userId: 'u3', status: 'PRESENT' },
                ],
            },
            SEATED,
        );

        expect(parsed).toEqual({ ok: false, error: 'ROW_INVALID' });
    });
});

describe('rowsNeedingWrite', () => {
    const stored = new Map<string, AttendanceStatus>([
        ['u1', 'REGISTERED'],
        ['u2', 'PRESENT'],
    ]);

    it('keeps only the rows whose value actually differs from what is stored', () => {
        const writes = rowsNeedingWrite(
            [
                { userId: 'u1', status: 'PRESENT' },
                { userId: 'u2', status: 'PRESENT' },
            ],
            stored,
        );

        expect(writes).toEqual([{ userId: 'u1', status: 'PRESENT' }]);
    });

    it('writes nothing when every row already says what is stored', () => {
        const writes = rowsNeedingWrite(
            [
                { userId: 'u1', status: 'REGISTERED' },
                { userId: 'u2', status: 'PRESENT' },
            ],
            stored,
        );

        expect(writes).toEqual([]);
    });
});

describe('the draft an Admin builds before saving', () => {
    const rows: RecordedRow[] = [
        row('u1', 'REGISTERED'),
        row('u2', 'PRESENT'),
        row('u3', 'NO_SHOW'),
    ];

    it('reads a row as its edit where there is one, and as stored otherwise', () => {
        const edits: AttendanceEdits = { u1: 'ABSENT' };

        expect(draftStatusOf(rows[0], edits)).toBe('ABSENT');
        expect(draftStatusOf(rows[1], edits)).toBe('PRESENT');
    });

    it('sends only the rows the Admin changed', () => {
        const edits: AttendanceEdits = { u1: 'PRESENT', u2: 'PRESENT' };

        expect(changedRows(rows, edits)).toEqual([
            { userId: 'u1', status: 'PRESENT' },
        ]);
    });

    it('sends nothing when the register was opened and never touched', () => {
        expect(changedRows(rows, {})).toEqual([]);
    });

    it('drops edits the server has caught up with, and keeps the rest', () => {
        const edits: AttendanceEdits = { u1: 'PRESENT', u2: 'ABSENT' };
        const afterSave: RecordedRow[] = [
            row('u1', 'PRESENT'),
            row('u2', 'PRESENT'),
            row('u3', 'NO_SHOW'),
        ];

        expect(pruneAppliedEdits(afterSave, edits)).toEqual({ u2: 'ABSENT' });
    });

    it('hands back the same edits when none of them has landed', () => {
        const edits: AttendanceEdits = { u1: 'PRESENT' };

        expect(pruneAppliedEdits(rows, edits)).toBe(edits);
    });
});

describe('the "mark everyone Present" prefill', () => {
    const rows: RecordedRow[] = [
        row('u1', 'REGISTERED'),
        row('u2', 'ABSENT'),
        row('u3', 'NO_SHOW'),
    ];

    it('moves every Registered row to Present and leaves decided rows alone', () => {
        expect(prefillPresent(rows, {})).toEqual({ u1: 'PRESENT' });
    });

    it('reads what is on screen, so a row set back to Registered is included', () => {
        expect(prefillPresent(rows, { u2: 'REGISTERED' })).toEqual({
            u1: 'PRESENT',
            u2: 'PRESENT',
        });
    });
});

describe('sessionEndInstant', () => {
    /** UTC midnight of the WIB calendar day, which is how dates are stored. */
    const date = new Date('2026-08-29T00:00:00.000Z');

    it('reads endTime as a WIB wall clock, not as UTC', () => {
        expect(
            sessionEndInstant({ date, endTime: '10:00' }).toISOString(),
        ).toBe('2026-08-29T03:00:00.000Z');
    });

    it('carries the minutes', () => {
        expect(
            sessionEndInstant({ date, endTime: '21:30' }).toISOString(),
        ).toBe('2026-08-29T14:30:00.000Z');
    });

    it('falls back to the start of the day when endTime cannot be read', () => {
        expect(
            sessionEndInstant({ date, endTime: 'later' }).toISOString(),
        ).toBe('2026-08-28T17:00:00.000Z');
    });
});

describe('isAttendanceUntaken', () => {
    const base = {
        status: 'SCHEDULED',
        date: new Date('2026-08-29T00:00:00.000Z'),
        endTime: '10:00',
    } as const;
    /** 04:00 UTC — one hour after this session's 10:00 WIB end. */
    const afterTheGame = new Date('2026-08-29T04:00:00.000Z');
    /** 02:00 UTC — 09:00 WIB, while the session is still running. */
    const duringTheGame = new Date('2026-08-29T02:00:00.000Z');

    it('is true once the session has ended with every row still Registered', () => {
        const untaken = isAttendanceUntaken(
            { ...base, rows: [row('u1', 'REGISTERED'), row('u2', 'REGISTERED')] },
            afterTheGame,
        );

        expect(untaken).toBe(true);
    });

    it('is false while the session is still running', () => {
        const untaken = isAttendanceUntaken(
            { ...base, rows: [row('u1', 'REGISTERED')] },
            duringTheGame,
        );

        expect(untaken).toBe(false);
    });

    it('is true for a Completed session even before its end time passes', () => {
        const untaken = isAttendanceUntaken(
            {
                ...base,
                status: 'COMPLETED',
                rows: [row('u1', 'REGISTERED')],
            },
            duringTheGame,
        );

        expect(untaken).toBe(true);
    });

    it('is false once any row has been recorded', () => {
        const untaken = isAttendanceUntaken(
            { ...base, rows: [row('u1', 'REGISTERED'), row('u2', 'PRESENT')] },
            afterTheGame,
        );

        expect(untaken).toBe(false);
    });

    it('is false for a cancelled session, which nobody owed attendance for', () => {
        const untaken = isAttendanceUntaken(
            {
                ...base,
                status: 'CANCELLED',
                rows: [row('u1', 'REGISTERED')],
            },
            afterTheGame,
        );

        expect(untaken).toBe(false);
    });

    it('is false when nobody claimed a seat: there was nothing to take', () => {
        expect(isAttendanceUntaken({ ...base, rows: [] }, afterTheGame)).toBe(
            false,
        );
    });
});

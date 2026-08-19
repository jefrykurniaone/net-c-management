import { describe, it, expect } from 'vitest';
import { wibDayKey, wibDayStart, wibDayStartFromKey } from '../wib';

/**
 * The WIB day is the public landing cache's key (ticket 10), so a wrong day
 * boundary is not a cosmetic bug: it either serves a session that has already
 * happened, or rotates the board seven hours late. Session dates are stored as
 * UTC midnight of their calendar day, which is what these assertions compare
 * against.
 */
describe('the WIB calendar day', () => {
    it('is still yesterday at 16:59 UTC, one minute before WIB midnight', () => {
        const key = wibDayKey(new Date('2026-03-10T16:59:00.000Z'));

        expect(key).toBe('2026-03-10');
    });

    it('turns over at 17:00 UTC — midnight in Jakarta, not in UTC', () => {
        const key = wibDayKey(new Date('2026-03-10T17:00:00.000Z'));

        expect(key).toBe('2026-03-11');
    });

    it('does not turn over at UTC midnight', () => {
        const beforeUtcMidnight = wibDayKey(new Date('2026-03-10T23:59:00.000Z'));
        const afterUtcMidnight = wibDayKey(new Date('2026-03-11T00:01:00.000Z'));

        expect(afterUtcMidnight).toBe(beforeUtcMidnight);
    });

    it('starts at UTC midnight of that day, matching how dates are stored', () => {
        const start = wibDayStart(new Date('2026-03-10T17:30:00.000Z'));

        expect(start.toISOString()).toBe('2026-03-11T00:00:00.000Z');
    });

    it('round-trips through its key, so the cached read sees the same day', () => {
        const now = new Date('2026-12-31T20:15:00.000Z');

        expect(wibDayStartFromKey(wibDayKey(now)).getTime()).toBe(
            wibDayStart(now).getTime(),
        );
    });
});

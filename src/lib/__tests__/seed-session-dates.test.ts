import { describe, expect, it } from 'vitest';
import { wibDayKey, wibDayStartFromKey } from '../wib';
import { pastSessionDates } from '../../../prisma/seed/dates';
import { UPCOMING_SPECS, SCENARIO_SPECS } from '../../../prisma/seed/specs';
import { PAST_TOTAL } from '../../../prisma/seed/config';

const MIDNIGHT_UTC_SUFFIX = 'T00:00:00.000Z';

/**
 * `ActivitySession.date` holds UTC midnight of the WIB calendar day it
 * belongs to (`src/lib/wib.ts`, `wibDayStartFromKey`'s doc comment) — never a
 * `T17:00:00.000Z` instant, which names WIB midnight of the *following* day
 * and reads as two different days depending on whether a caller takes its
 * UTC date part or shifts it into WIB (#197). Every seeded Session date must
 * round-trip through the app's own day-key helpers back to the exact instant
 * it started from, proving the seed and the app agree on what day a Session
 * is stored under.
 */
function expectRoundTripsToItsOwnDay(date: Date) {
    expect(date.toISOString().endsWith(MIDNIGHT_UTC_SUFFIX)).toBe(true);
    expect(wibDayStartFromKey(wibDayKey(date)).getTime()).toBe(date.getTime());
}

describe('seeded Session dates', () => {
    it.each(UPCOMING_SPECS.map((spec) => [spec.title, spec.date]))(
        'upcoming session "%s" round-trips to the WIB day it was seeded for',
        (_title, date) => {
            expectRoundTripsToItsOwnDay(date);
        },
    );

    it.each(Object.values(SCENARIO_SPECS).map((spec) => [spec.title, spec.date]))(
        'scenario session "%s" round-trips to the WIB day it was seeded for',
        (_title, date) => {
            expectRoundTripsToItsOwnDay(date);
        },
    );

    it('every past session date round-trips to the WIB day it was spread over', () => {
        const dates = pastSessionDates(PAST_TOTAL);

        expect(dates).toHaveLength(PAST_TOTAL);
        for (const date of dates) {
            expectRoundTripsToItsOwnDay(date);
        }
    });
});

/**
 * Western Indonesian Time (UTC+7) — the one clock this community runs on.
 *
 * Session dates are stored as UTC midnight of their calendar day, so every
 * "today" in this app has to be the *WIB* day: a UTC or server-local day rolls
 * over at 07:00 WIB, mid-morning, which would advertise a session that already
 * happened and remind members about a day that has not started.
 *
 * The offset was duplicated in both crons before a third caller
 * (`src/lib/public-landing.ts`, wayfinder ticket 10) wanted it, which is what
 * earned it a home. No DST: WIB has none, so a fixed offset is the whole rule.
 */
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * `now` shifted into WIB, so the `getUTC*` accessors read off WIB wall-clock
 * fields. The returned `Date` is a carrier for those fields, not a real instant
 * — never persist it or compare it against a stored timestamp.
 */
export function toWibTime(now: Date): Date {
    return new Date(now.getTime() + WIB_OFFSET_MS);
}

/** UTC midnight of the WIB calendar day containing `now`. */
export function wibDayStart(now: Date): Date {
    const wibNow = toWibTime(now);
    return new Date(
        Date.UTC(
            wibNow.getUTCFullYear(),
            wibNow.getUTCMonth(),
            wibNow.getUTCDate(),
        ),
    );
}

/**
 * The WIB calendar day containing `now`, as `YYYY-MM-DD`.
 *
 * This is a *cache key*: ticket 10 keys the public landing read on it so the
 * session band rotates the instant the day does, rather than waiting out a
 * revalidate window that would keep yesterday on screen past midnight.
 */
export function wibDayKey(now: Date): string {
    return wibDayStart(now).toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/** Two digits, so a clock label never reads `9:5`. */
const CLOCK_DIGITS = 2;

/**
 * An instant as its WIB wall clock, `HH:MM`.
 *
 * Used for a deadline a member has to act before — a payment hold's expiry on a
 * Session card. Rendered server-side on purpose: `toLocaleTimeString` would read
 * the machine's zone on the server and the visitor's in the browser, so the same
 * deadline would render twice with two different numbers and hydrate mismatched.
 */
export function wibClockLabel(instant: Date): string {
    const wib = toWibTime(instant);
    const hours = String(wib.getUTCHours()).padStart(CLOCK_DIGITS, '0');
    const minutes = String(wib.getUTCMinutes()).padStart(CLOCK_DIGITS, '0');
    return `${hours}:${minutes}`;
}

/** The `Date` a `wibDayKey()` string names — UTC midnight of that WIB day. */
export function wibDayStartFromKey(dayKey: string): Date {
    return new Date(`${dayKey}T00:00:00.000Z`);
}

import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Reservation-hold timing + sweep (reserve-then-pay).
 *
 * A paid session's seat is claimed the moment a member reserves — before any
 * payment — so capacity is locked while they go pay. That seat is an unpaid
 * "hold": its `Attendance.holdExpiresAt` is set to the configured hold duration
 * out. Paying (monthly dues in, or a per-session proof uploaded) clears
 * `holdExpiresAt` to null, making the seat permanent. A hold the member never
 * funds expires and is released here.
 *
 * There is no cron on serverless, so the release is a lazy sweep: `releaseExpiredHolds`
 * runs at the top of the reads/writes that care about capacity (the sessions
 * pages, the reserve/attendance/upload routes, the dues views). It only ever
 * touches rows whose hold has already lapsed — a permanent seat has
 * `holdExpiresAt = null` and is never matched. Mirrors the lazy generation in
 * `src/lib/recurring-sessions.ts`.
 */

/** Settings key holding the admin-configured hold duration, in minutes. */
export const HOLD_DURATION_SETTING_KEY = 'holdDurationMinutes';

/** Default hold duration when the admin has not configured one (1 hour). */
export const DEFAULT_HOLD_DURATION_MINUTES = 60;

/** A configured duration below this is treated as invalid, not honored. */
const MIN_HOLD_DURATION_MINUTES = 1;

const MS_PER_MINUTE = 60 * 1000;

/**
 * The admin-configured hold duration in minutes (Settings key
 * `holdDurationMinutes`), falling back to the 1-hour default when unset or
 * not a positive integer.
 */
export async function getHoldDurationMinutes(): Promise<number> {
    const row = await prisma.settings.findUnique({
        where: { key: HOLD_DURATION_SETTING_KEY },
        select: { value: true },
    });
    const minutes = Number(row?.value);
    if (!Number.isInteger(minutes) || minutes < MIN_HOLD_DURATION_MINUTES) {
        return DEFAULT_HOLD_DURATION_MINUTES;
    }
    return minutes;
}

/** The instant a hold created at `now` expires (now + configured duration). */
export async function holdExpiresAt(now: Date = new Date()): Promise<Date> {
    const minutes = await getHoldDurationMinutes();
    return new Date(now.getTime() + minutes * MS_PER_MINUTE);
}

/**
 * Release every reservation whose hold has lapsed: delete the seat-holding
 * `Attendance` rows where `holdExpiresAt` is set and already past. A funded
 * seat (`holdExpiresAt = null`) is never matched, so this is safe to call on
 * any read. Returns how many seats were freed (0 when none lapsed).
 */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
    const { count } = await prisma.attendance.deleteMany({
        where: { holdExpiresAt: { not: null, lt: now } },
    });
    return count;
}

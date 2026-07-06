import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * Reservation-hold timing + sweep (reserve-then-pay).
 *
 * A paid session's seat is claimed the moment a member reserves — before any
 * payment — so capacity is locked while they go pay. That seat is an unpaid
 * "hold": its `Attendance.holdExpiresAt` is set to one hour out. Paying (monthly
 * dues in, or a per-session proof uploaded) clears `holdExpiresAt` to null,
 * making the seat permanent. A hold the member never funds expires and is
 * released here.
 *
 * There is no cron on serverless, so the release is a lazy sweep: `releaseExpiredHolds`
 * runs at the top of the reads/writes that care about capacity (the sessions
 * pages, the reserve/attendance/upload routes, the dues views). It only ever
 * touches rows whose hold has already lapsed — a permanent seat has
 * `holdExpiresAt = null` and is never matched. Mirrors the lazy generation in
 * `src/lib/recurring-sessions.ts`.
 */

/** A reservation holds its seat for this long before it must be paid (1 hour). */
export const HOLD_DURATION_MS = 60 * 60 * 1000;

/** The instant a hold created at `now` expires (now + HOLD_DURATION_MS). */
export function holdExpiresAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + HOLD_DURATION_MS);
}

/**
 * Release every reservation whose 1-hour hold has lapsed: delete the
 * seat-holding `Attendance` rows where `holdExpiresAt` is set and already past.
 * A funded seat (`holdExpiresAt = null`) is never matched, so this is safe to
 * call on any read. Returns how many seats were freed (0 when none lapsed).
 */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
    const { count } = await prisma.attendance.deleteMany({
        where: { holdExpiresAt: { not: null, lt: now } },
    });
    return count;
}

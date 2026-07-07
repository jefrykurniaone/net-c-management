import 'server-only';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isEmailConfigured, sendHoldExpired } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { DEFAULT_LOCALE } from '@/lib/i18n/dictionaries';

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
 *
 * Each released member is emailed (best-effort, after the response) that their
 * registration expired and they should register again.
 */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
    const expired = await prisma.attendance.findMany({
        where: { holdExpiresAt: { not: null, lt: now } },
        select: {
            id: true,
            user: { select: { name: true, email: true } },
            session: {
                select: { id: true, title: true, date: true, startTime: true },
            },
        },
    });
    if (expired.length === 0) return 0;

    const { count } = await prisma.attendance.deleteMany({
        where: { id: { in: expired.map((e) => e.id) } },
    });
    await queueHoldExpiredEmails(expired);
    return count;
}

interface ExpiredHold {
    user: { name: string | null; email: string | null };
    session: { id: string; title: string; date: Date; startTime: string };
}

/**
 * Queue "registration expired, please re-register" emails after the response.
 * Locale + settings are resolved up front (request APIs are not reliably
 * available inside `after` from Server Components); the sends themselves run
 * post-response. Best-effort: failures are logged, never thrown.
 */
async function queueHoldExpiredEmails(expired: ExpiredHold[]): Promise<void> {
    if (!isEmailConfigured()) return;
    const recipients = expired.filter((e) => e.user.email);
    if (recipients.length === 0) return;

    const [locale, settings] = await Promise.all([
        getLocale().catch(() => DEFAULT_LOCALE),
        getSettings(),
    ]);

    after(async () => {
        for (const { user, session } of recipients) {
            try {
                await sendHoldExpired({
                    to: user.email!,
                    name: user.name ?? user.email!,
                    sessionId: session.id,
                    sessionTitle: session.title,
                    sessionDate: new Date(session.date),
                    startTime: session.startTime,
                    communityName: settings.communityName,
                    locale,
                });
            } catch (err) {
                console.error(
                    `[holds] expiry email to ${user.email} failed:`,
                    err,
                );
            }
        }
    });
}

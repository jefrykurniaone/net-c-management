/**
 * RSVP timing rules. A session's RSVP window closes a fixed lead time before the
 * session starts (RSVP_CLOSE_HOURS_BEFORE) — after that, seats and intent are
 * locked. The close time is derived, never stored: session date + startTime,
 * minus the lead. Kept framework-agnostic so both Server Components and Route
 * Handlers share one source of truth.
 */

/** RSVP closes this many hours before the session start (1 day). */
export const RSVP_CLOSE_HOURS_BEFORE = 24;

const MS_PER_HOUR = 60 * 60 * 1000;

/** Combine a session's date (day) with its "HH:mm" startTime into one Date. */
export function sessionStartAt(date: Date, startTime: string): Date {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date(date);
    start.setHours(hours || 0, minutes || 0, 0, 0);
    return start;
}

/** The instant RSVP closes for a session (start − RSVP_CLOSE_HOURS_BEFORE). */
export function rsvpCloseAt(date: Date, startTime: string): Date {
    return new Date(
        sessionStartAt(date, startTime).getTime() -
            RSVP_CLOSE_HOURS_BEFORE * MS_PER_HOUR,
    );
}

/** Whether the RSVP window has already closed as of `now`. */
export function isRsvpClosed(
    date: Date,
    startTime: string,
    now: Date = new Date(),
): boolean {
    return now.getTime() >= rsvpCloseAt(date, startTime).getTime();
}

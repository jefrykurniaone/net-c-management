/** A rate is drawn as a whole percentage, so the ratio scales by this. */
const PERCENT_SCALE = 100;

/**
 * How much of this month's Dues-relevant attendance the member turned up for,
 * as a whole percentage.
 *
 * `heldSessions` counts only Sessions that have already happened — the reads
 * cap the denominator at `now` (`member-dashboard-data.ts`), so upcoming
 * Sessions, which nobody can have attended yet, never drag the figure down.
 * No Session yet this month is `0` rather than a division by zero.
 */
export function attendanceRateOf(
    presentCount: number,
    heldSessions: number,
): number {
    if (heldSessions <= 0) return 0;
    return Math.round((presentCount / heldSessions) * PERCENT_SCALE);
}

import { AttendanceStatus, SessionStatus } from '@prisma/client';
import { chartWeeks, weekIndexOfDay, type ChartWeek } from './chart-weeks';

/**
 * How full Sessions have been, week by week — the arithmetic behind the admin
 * dashboard's fill line (#171, spec `docs/spec-rally-insights-v1.md`).
 *
 * **The figure, exactly.** For each of the eight weeks in
 * `chartWeeks(now)`: the numerator is the count of Seat-holding `Attendance`
 * rows on that week's Sessions, the denominator is the sum of `maxPlayers`
 * over the same Sessions, and the point is the first over the second as a
 * percentage. **Cancelled Sessions are in neither**, which is the one exclusion
 * the ticket names: a Session that is off holds no Seats and offers no
 * capacity, and leaving its capacity in the denominator would report a healthy
 * week as half empty.
 *
 * **A week with no Sessions is `null`, never `0`.** Zero percent is a claim —
 * Sessions ran and nobody took a Seat. No Sessions is the absence of a claim,
 * and drawing it as zero invents a collapse in a week the community simply did
 * not play. The two are distinguishable in the record as well as on the line:
 * `sessionCount` says which happened.
 *
 * **Over 100 is reported, never clamped.** Capacity below the Seats already
 * held is refused when an Admin edits a Session (`src/lib/session-lock.ts`) and
 * reserving past capacity is refused under a row lock
 * (`src/lib/payments.ts`), so a week above 100 is rare — and it is exactly the
 * state an Admin has to act on. Clamping it to 100 would make an over-committed
 * Session indistinguishable from a perfectly full one, which is the one reading
 * this chart must never produce. The axis is sized to whatever the series
 * reaches, so the point stays on the canvas.
 *
 * **Pure, and no write** (`docs/adr/0005-pure-rule-modules.md`): both
 * exclusions — the cancelled Session and the non-Seat-holding Attendance row —
 * run here, in the code `src/lib/__tests__/seats-filled.test.ts` covers.
 *
 * **One thing it does not do: sweep expired holds.** `releaseExpiredHolds`
 * deletes the `Attendance` rows of lapsed payment holds, and every
 * capacity-sensitive read in the app calls it first. A chart reads and never
 * writes, so this one does not, and an unswept lapsed hold is still a
 * `REGISTERED` row here and still counted. The overstatement is at most a few
 * Seats, only in the current week, and it disappears the next time any
 * capacity-sensitive page runs the sweep.
 */

/**
 * The statuses that hold a Seat, mirroring `SEAT_HELD_STATUSES` in
 * `src/lib/payments.ts`, `SEAT_HOLDING` in `src/lib/session-standing.ts` and
 * the same list in `src/components/sessions/slot-action.ts`. Restated rather
 * than imported because the two library copies sit behind `server-only` and
 * this module is pure; the schema states the rule itself, at
 * `AttendanceStatus` — only `REGISTERED` and `PRESENT` hold a Seat, and
 * `MAYBE`, `ABSENT` (Opted Out) and `NO_SHOW` change no capacity figure.
 */
const SEAT_HOLDING: readonly AttendanceStatus[] = [
    AttendanceStatus.REGISTERED,
    AttendanceStatus.PRESENT,
];

/** A whole week, as a percentage. */
const FULL_PERCENT = 100;

/** One Session as this chart reads it, with its status left in to be judged. */
export interface FillChartSession {
    readonly id: string;
    /** UTC midnight of the Session's WIB calendar day (`ActivitySession.date`). */
    readonly date: Date;
    readonly maxPlayers: number;
    readonly status: SessionStatus;
}

/** One Attendance row, with its status left in to be judged. */
export interface FillChartAttendance {
    readonly sessionId: string;
    readonly status: AttendanceStatus;
}

export interface SeatsFilledInput {
    readonly sessions: readonly FillChartSession[];
    readonly attendances: readonly FillChartAttendance[];
    readonly now: Date;
}

/** One week's point on the line, and the two figures behind it. */
export interface SeatsFilledPoint {
    readonly week: ChartWeek;
    /**
     * Seats held over capacity, rounded to a whole percent — or `null` when the
     * week offered no capacity at all, which is no-data rather than zero.
     */
    readonly percent: number | null;
    /** `REGISTERED` + `PRESENT` rows on the week's non-cancelled Sessions. */
    readonly seats: number;
    /** Summed `maxPlayers` of the same Sessions. */
    readonly capacity: number;
    /** How many non-cancelled Sessions the week held. Zero means no-data. */
    readonly sessionCount: number;
}

export interface SeatsFilledSeries {
    /** Exactly `CHART_WEEKS` points, oldest first. */
    readonly points: readonly SeatsFilledPoint[];
}

/** One week's running figures while the rows are being walked. */
interface WeekTally {
    seats: number;
    capacity: number;
    sessionCount: number;
}

function emptyTallies(weekCount: number): WeekTally[] {
    return Array.from({ length: weekCount }, () => ({
        seats: 0,
        capacity: 0,
        sessionCount: 0,
    }));
}

/**
 * Add every countable Session's capacity to its week, and return which week
 * each one landed in.
 *
 * The returned map is also the gate on the numerator: a Session that was
 * cancelled, or that falls outside the window, is absent from it, so its
 * Attendance rows find no week and cannot be counted. One rule, applied once.
 */
function tallyCapacity(
    weeks: readonly ChartWeek[],
    sessions: readonly FillChartSession[],
    tallies: WeekTally[],
): Map<string, number> {
    const weekOfSession = new Map<string, number>();
    for (const session of sessions) {
        if (session.status === SessionStatus.CANCELLED) {
            continue;
        }
        const index = weekIndexOfDay(weeks, session.date);
        if (index < 0) {
            continue;
        }
        weekOfSession.set(session.id, index);
        tallies[index].capacity += session.maxPlayers;
        tallies[index].sessionCount += 1;
    }
    return weekOfSession;
}

/** Count the Seat-holding rows of every countable Session into its week. */
function tallySeats(
    attendances: readonly FillChartAttendance[],
    weekOfSession: ReadonlyMap<string, number>,
    tallies: WeekTally[],
): void {
    for (const attendance of attendances) {
        if (!SEAT_HOLDING.includes(attendance.status)) {
            continue;
        }
        const index = weekOfSession.get(attendance.sessionId);
        if (index === undefined) {
            continue;
        }
        tallies[index].seats += 1;
    }
}

/**
 * One week's finished point.
 *
 * No capacity means no percentage: with zero Sessions there is nothing to be a
 * fraction of, and dividing would answer `NaN` where the honest answer is "the
 * community did not play". A Session posted with `maxPlayers` of zero lands
 * here too, and is no-data for the same reason rather than a false zero — it
 * still shows in `sessionCount`, so the record keeps the two apart.
 */
function toPoint(week: ChartWeek, tally: WeekTally): SeatsFilledPoint {
    return {
        week,
        percent:
            tally.capacity === 0
                ? null
                : Math.round((tally.seats * FULL_PERCENT) / tally.capacity),
        seats: tally.seats,
        capacity: tally.capacity,
        sessionCount: tally.sessionCount,
    };
}

/**
 * The whole series: eight weeks of fill rate, oldest first.
 *
 * Capacity is tallied before Seats on purpose — the capacity pass decides which
 * Sessions count, and the Seat pass may only count rows on Sessions it already
 * accepted, so the numerator can never be drawn from a Session whose capacity
 * is not in the denominator.
 */
export function resolveSeatsFilledSeries(
    input: SeatsFilledInput,
): SeatsFilledSeries {
    const weeks = chartWeeks(input.now);
    const tallies = emptyTallies(weeks.length);
    const weekOfSession = tallyCapacity(weeks, input.sessions, tallies);
    tallySeats(input.attendances, weekOfSession, tallies);
    return { points: weeks.map((week, index) => toPoint(week, tallies[index])) };
}

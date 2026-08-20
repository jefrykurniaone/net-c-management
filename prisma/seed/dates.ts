/**
 * Anchor-date handling so the seed can simulate "today" at any point in time.
 *
 * Usage:
 *   npm run db:seed                                          # anchor = real today
 *   npm run db:seed -- --date=2026-08-15                     # pretend today is Aug 15
 *   npm run db:seed -- --date=2026-08-15 --from=2026-07-01 --to=2026-08-14
 *
 *   --date=YYYY-MM-DD  the anchor treated as "today". Time-of-day is taken from
 *                      the real clock so hold/ongoing scenarios stay realistic.
 *   --from=YYYY-MM-DD  start of the past COMPLETED-session range
 *                      (default: 1st of the anchor month)
 *   --to=YYYY-MM-DD    end of that range, must be <= anchor (default: anchor)
 *
 * Env fallbacks: SEED_DATE / SEED_FROM / SEED_TO.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const DAYS_PER_WEEK = 7;
const MIN_DAYS_OUT = 2;
const MS_PER_MINUTE = 60_000;

function flagValue(name: 'date' | 'from' | 'to'): string | undefined {
    const prefix = `--${name}=`;
    const arg = process.argv.find((a) => a.startsWith(prefix));
    if (arg) return arg.slice(prefix.length);
    const env = process.env[`SEED_${name.toUpperCase()}`]?.trim();
    return env || undefined;
}

function parseDay(value: string, flag: string): Date {
    if (!ISO_DATE.test(value)) {
        throw new Error(`--${flag} must be YYYY-MM-DD (got "${value}")`);
    }
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const isReal =
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d;
    if (!isReal) throw new Error(`--${flag}: "${value}" is not a real calendar date`);
    return date;
}

function resolveAnchor(): Date {
    const real = new Date();
    const value = flagValue('date');
    if (!value) return real;
    const day = parseDay(value, 'date');
    day.setHours(real.getHours(), real.getMinutes(), real.getSeconds(), 0);
    return day;
}

/** "Today" for every relative computation in the seed. */
export const now = resolveAnchor();

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `date`'s WIB wall-clock fields, readable through the getUTC* accessors. */
function toWib(date: Date): Date {
    return new Date(date.getTime() + WIB_OFFSET_MS);
}

/**
 * UTC-midnight of the WIB (UTC+7) calendar day containing `date` — the one way
 * this seed is allowed to turn an instant into a day.
 *
 * A Session's `date` is stored as UTC midnight of its WIB day, which is what
 * `src/lib/wib.ts` documents, what the create route writes (`new Date(date)`
 * over a `YYYY-MM-DD` string) and what the board reads back with `getUTC*`.
 * A local-midnight `setHours(0,0,0,0)` looks identical on a UTC host and is
 * wrong everywhere else: on WIB itself it stores the previous day at 17:00Z,
 * so every seeded Session lands one day early on the board and the fixture
 * stops matching the day TESTING.md §4 says it is on. That is what this
 * function exists to prevent, and why nothing here calls `setHours`.
 */
export function wibDayStart(date: Date = now): Date {
    const wib = toWib(date);
    return new Date(
        Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()),
    );
}

/** UTC-midnight of the 1st of the WIB month containing `date`. */
function startOfMonth(date: Date): Date {
    const wib = toWib(date);
    return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1));
}

function resolveRange(): { from: Date; to: Date } {
    const fromValue = flagValue('from');
    const toValue = flagValue('to');
    const from = fromValue ? parseDay(fromValue, 'from') : startOfMonth(now);
    const to = toValue ? parseDay(toValue, 'to') : wibDayStart(now);
    if (from.getTime() > to.getTime()) {
        throw new Error('--from must be on or before --to');
    }
    if (to.getTime() > now.getTime()) {
        throw new Error('--to must be on or before the anchor (--date)');
    }
    return { from, to };
}

const RANGE = resolveRange();
/** Range the past COMPLETED sessions are spread over. */
export const PAST_FROM = RANGE.from;
export const PAST_TO = RANGE.to;

export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

/** Next occurrence of `weekday` at least MIN_DAYS_OUT days ahead of `from`. */
export function nextWeekday(from: Date, weekday: number): Date {
    const d = wibDayStart(from);
    const delta = (weekday - d.getUTCDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const add = delta < MIN_DAYS_OUT ? delta + DAYS_PER_WEEK : delta;
    return addDays(d, add);
}

export interface Period {
    month: number;
    year: number;
}

export function periodOf(date: Date): Period {
    const wib = toWib(date);
    return { month: wib.getUTCMonth() + 1, year: wib.getUTCFullYear() };
}

export function periodKey(p: Period): number {
    return p.year * 100 + p.month;
}

/** Distinct monthly periods a payment must cover for the given dates. */
export function uniquePeriods(dates: Date[]): Period[] {
    const byKey = new Map<number, Period>();
    for (const d of dates) {
        const p = periodOf(d);
        byKey.set(periodKey(p), p);
    }
    return [...byKey.values()];
}

export const CURRENT_KEY = periodKey(periodOf(now));
export const NEXT_KEY = periodKey(periodOf(new Date(now.getFullYear(), now.getMonth() + 1, 1)));

/** First-day-ish instant in the month `back` months before the anchor. */
export function monthsAgo(back: number, day: number): Date {
    return new Date(now.getFullYear(), now.getMonth() - back, day, 9, 0, 0);
}

/**
 * Evenly spaced days within [PAST_FROM, PAST_TO] — all already elapsed.
 *
 * Snapped to `wibDayStart`, like every other Session date: a past Session that
 * kept the raw spread instant carried a time of day, and the board named its
 * day from `getUTC*`, so a Session seeded at 19:25Z showed up on the previous
 * day when a member paged back through the weeks.
 */
export function pastSessionDates(count: number): Date[] {
    const span = PAST_TO.getTime() - PAST_FROM.getTime();
    const dates: Date[] = [];
    for (let i = 1; i <= count; i++) {
        dates.push(
            wibDayStart(new Date(PAST_FROM.getTime() + Math.floor((span * i) / (count + 1)))),
        );
    }
    return dates;
}

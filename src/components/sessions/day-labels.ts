import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Dates said in words, from the dictionary, for the Session surfaces.
 *
 * **Nothing here calls a date formatter, and that is the whole point.** A
 * Session is stored as UTC midnight of its WIB calendar day, so a locale-aware
 * formatter reads the machine's zone rather than WIB — which is how a Tuesday
 * Session comes to advertise itself as Monday on a UTC or UTC+8 host. Every
 * field below is read with the `getUTC*` accessors, and every word comes from
 * `t.months`, so a label is the same on any host.
 */

/** "18 August" — the day and its month, never a formatter's idea of either. */
export function monthDayLabel(date: Date, t: Dictionary): string {
    return `${date.getUTCDate()} ${t.months[date.getUTCMonth() + 1]}`;
}

/** The far end of a range carries the year, so a distant week says which. */
export function monthDayYearLabel(date: Date, t: Dictionary): string {
    return `${monthDayLabel(date, t)} ${date.getUTCFullYear()}`;
}

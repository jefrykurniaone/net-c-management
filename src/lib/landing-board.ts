import type { Dictionary } from './i18n/dictionaries';
import type {
    PublicActivity,
    PublicLandingData,
    PublicSession,
} from './public-landing';

/**
 * The public route's one band of substance, shaped for rendering.
 *
 * There is no separate schedule band: each Activity is **one card** carrying
 * both its standing weekly slot and its own next scheduled date. That is what
 * keeps the shared Session card off this surface entirely, and with it the
 * conflict between that card's `n/max` Seats figure and the standing rule that
 * no capacity number reaches an unauthenticated page.
 *
 * Every string a card shows is built here rather than in the component, so the
 * band renders plain text it cannot get wrong and this file is unit-testable
 * without a DOM. The one exception is the livery, which is a component's
 * business rather than a string: the raw `Activity.icon` key passes straight
 * through to {@link ActivityTile}. Nothing here reads the database —
 * {@link PublicLandingData} arrives from the one module allowed to.
 */
export interface BoardRow {
    readonly id: string;
    readonly name: string;
    /**
     * `Activity.icon` as stored — a curated key, or `null` for the initial.
     * Carried through untouched rather than resolved here: {@link ActivityTile}
     * is the one seam that turns a key into a glyph and a name into a letter,
     * and a second resolution in this module would be a second answer.
     */
    readonly icon: string | null;
    /** The standing arrangement, or `null` where an Activity has no recurring day. */
    readonly weeklySlot: string | null;
    /** `Activity.defaultLocation` only — a per-session location never publishes. */
    readonly location: string;
    /** `null` means no scheduled session, which the card chips neutral rather than hiding. */
    readonly nextDate: string | null;
    readonly feePrimary: string;
    readonly feeSecondary: string | null;
}

/** Rupiah, written the way every other surface in this app writes it. */
function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** Zero publishes as "Free" rather than as `Rp 0`, in both locales. */
function feeLabel(amount: number, suffix: string, t: Dictionary): string {
    return amount === 0 ? t.landing.board.free : `${rupiah(amount)} ${suffix}`;
}

/**
 * Both payment modes show, monthly first where an Activity offers both: the
 * monthly figure is the standing commitment and the per-session one is the way
 * in, so a stranger reads the larger number in the position they scan first.
 */
function feeLines(
    activity: PublicActivity,
    t: Dictionary,
): Readonly<{ primary: string; secondary: string | null }> {
    const { perMonth, perSession } = t.landing.board;
    const monthly = feeLabel(activity.duesAmount, perMonth, t);
    const session = feeLabel(activity.sessionFee, perSession, t);

    if (activity.allowsMonthly && activity.allowsPerSession) {
        return { primary: monthly, secondary: session };
    }
    if (activity.allowsPerSession) {
        return { primary: session, secondary: null };
    }
    return { primary: monthly, secondary: null };
}

const DAYS_IN_WEEK = 7;

/**
 * "Every Tuesday · 19:00–21:00". The prefix and the weekday come from the
 * dictionary — the day names have one home in this app and this is not a second
 * one — and both orderings read correctly: *Every Tuesday*, *Setiap Selasa*.
 */
function weeklySlot(activity: PublicActivity, t: Dictionary): string | null {
    const day = activity.recurringDay;
    if (day === null || day < 0 || day >= DAYS_IN_WEEK) return null;

    const when = `${activity.recurringStartTime}–${activity.recurringEndTime}`;
    return `${t.landing.board.weeklyPrefix} ${t.days[day]} · ${when}`;
}

/**
 * "25 August · 19:00–21:00". The weekday is deliberately absent: the same row
 * already says *Every Tuesday*, and repeating it spends width the row does not
 * have on a phone.
 *
 * Session dates are stored as UTC midnight of their WIB calendar day, so the
 * `getUTC*` accessors read the intended day. A locale-aware formatter would
 * shift it by whatever zone the server happens to run in, which is how a
 * Tuesday session comes to advertise itself as Monday.
 */
function nextDateLabel(session: PublicSession, t: Dictionary): string {
    const date = session.date;
    const month = t.months[date.getUTCMonth() + 1];
    const when = `${session.startTime}–${session.endTime}`;
    return `${date.getUTCDate()} ${month} · ${when}`;
}

/**
 * Fuse the Activities with their next sessions into one row each.
 *
 * Every active Activity gets a row, in the order the read returned them —
 * weekly slot, then name. An Activity with no scheduled session keeps its row
 * and carries the neutral chip where the date goes; the row is never dropped,
 * because a community that hides the Activity nobody has posted a session for
 * yet is advertising less than it runs.
 */
export function buildBoardRows(
    data: PublicLandingData,
    t: Dictionary,
): BoardRow[] {
    const nextByActivity = new Map(
        data.nextSessions.map((session) => [session.activityId, session]),
    );

    return data.activities.map((activity) => {
        const fees = feeLines(activity, t);
        const next = nextByActivity.get(activity.id);
        return {
            id: activity.id,
            name: activity.name,
            icon: activity.icon,
            weeklySlot: weeklySlot(activity, t),
            location: activity.defaultLocation,
            nextDate: next ? nextDateLabel(next, t) : null,
            feePrimary: fees.primary,
            feeSecondary: fees.secondary,
        };
    });
}

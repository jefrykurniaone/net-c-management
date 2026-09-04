import {
    currentPeriod,
    fromPeriodKey,
    toPeriodKey,
    type BillingPeriod,
} from './billing-period';
import {
    allowedDuesRatePeriods,
    findQueuedDuesRate,
    resolveDuesRate,
    type DuesRateRow,
} from './dues-rate';
import type { Dictionary } from './i18n/dictionaries';

/**
 * The Admin's Dues field, in the Admin's own words: what the Activity charges
 * now, what it is about to charge, and which Periods a change may start from.
 *
 * A view module over `src/lib/dues-rate.ts` (`docs/adr/0006-view-modules.md`),
 * pure and free of `server-only` because the field it describes is a client
 * component (`docs/adr/0005-pure-rule-modules.md`). The caller passes the
 * *server's* instant as `now`: the picker must offer exactly the Periods the
 * route will accept, and an Admin whose laptop clock is a month out would
 * otherwise be shown a month their save is refused for.
 */

/** Rupiah, written the way every other surface in this app writes it. */
function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** "September 2026" / "September 2026" — a Billing Period as an Admin reads it. */
function periodLabel(period: BillingPeriod, t: Dictionary): string {
    return `${t.months[period.month]} ${period.year}`;
}

/** `{token}` substitution. A plain replace: one occurrence, no regex. */
function fill(template: string, token: string, value: string): string {
    return template.replace(`{${token}}`, value);
}

/** One Period the picker offers: its stored key, and how it is read aloud. */
export type DuesRatePeriodOption = Readonly<{
    key: number;
    label: string;
}>;

/** Everything the Dues field draws, decided here and nowhere else. */
export type DuesRateFieldView = Readonly<{
    /**
     * What the amount input starts at: the queued figure when a change is
     * queued, else the current rate. Following the queued change is what makes
     * an unrelated save — a renamed Activity, a corrected bank account —
     * harmless: it re-states the queued row rather than replacing it.
     */
    amount: number | null;
    /** What the current Period charges — the figure that stands if the queued change is withdrawn. */
    currentAmount: number | null;
    /** The Period key the picker starts at: the queued one, else the next Period. */
    effectiveFrom: number;
    /** The next Period, which is where the picker falls back after a withdrawal. */
    nextEffectiveFrom: number;
    /** The Periods a change may start from, earliest first. */
    options: readonly DuesRatePeriodOption[];
    /** The disclosure beneath the field: the current rate, and any queued change. */
    sentence: string;
    /** The queued row's Period key, or `null` when nothing is queued. */
    queuedEffectiveFrom: number | null;
}>;

/**
 * The sentence the field defers to. Three states, and the third is not a
 * decoration: an Activity whose Periods resolve to no amount is a broken
 * invariant, and saying so is the only way an Admin finds out. It is never
 * written as "Rp 0" — the resolver returns `null` rather than 0 precisely so
 * that a missing row cannot be read as a free month.
 */
function buildSentence(
    currentAmount: number | null,
    queued: DuesRateRow | null,
    t: Dictionary,
): string {
    if (currentAmount === null) {
        return t.admin.duesRateMissingNote;
    }
    if (queued === null) {
        return fill(t.admin.duesRateCurrentNote, 'amount', rupiah(currentAmount));
    }
    const withCurrent = fill(
        t.admin.duesRateQueuedNote,
        'amount',
        rupiah(currentAmount),
    );
    const withQueued = fill(withCurrent, 'queued', rupiah(queued.amount));
    return fill(
        withQueued,
        'month',
        periodLabel(fromPeriodKey(queued.effectiveFrom), t),
    );
}

/**
 * Read one Activity's rate rows into the field that edits them.
 *
 * The picker's Periods, the amount it starts at and the sentence beneath it all
 * come from the same three rules the route enforces — `resolveDuesRate`,
 * `findQueuedDuesRate` and `allowedDuesRatePeriods` — so a form that offers a
 * month and a route that accepts one cannot drift apart.
 */
export function buildDuesRateFieldView(
    rates: readonly DuesRateRow[],
    now: Date,
    t: Dictionary,
): DuesRateFieldView {
    const period = currentPeriod(now);
    const allowed = allowedDuesRatePeriods(now);
    const options = allowed.map((each) => ({
        key: toPeriodKey(each.month, each.year),
        label: periodLabel(each, t),
    }));
    const nextEffectiveFrom = options[0].key;

    const currentAmount = resolveDuesRate(rates, period);
    const queued = findQueuedDuesRate(rates, period);

    return {
        amount: queued?.amount ?? currentAmount,
        currentAmount,
        effectiveFrom: queued?.effectiveFrom ?? nextEffectiveFrom,
        nextEffectiveFrom,
        options,
        sentence: buildSentence(currentAmount, queued, t),
        queuedEffectiveFrom: queued?.effectiveFrom ?? null,
    };
}

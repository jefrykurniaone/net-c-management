import { PaymentMode, PaymentStatus } from '@prisma/client';
import type { Dictionary } from './i18n/dictionaries';
import {
    currentPeriod,
    graduateStanding,
    nextPeriod,
    resolvePaymentMode,
    type BillingPeriod,
    type MembershipMode,
    type OfferedModes,
} from './payment-mode';

/**
 * The member's per-Activity payment mode, in the member's own words.
 *
 * Purely presentational over `src/lib/payment-mode.ts`: nothing here resolves a
 * mode, mints a period key, or decides when a switch lands. It reads the
 * resolver's output for two periods — the current one, which is settled, and the
 * next one, which is what a control can still change — and turns both into
 * sentences. Server-only by construction, because the resolver it reads is.
 *
 * The one rule it restates in words is the rule a member gets billed by: a
 * Billing Period that has arrived is never rewritten, so a switch made against a
 * period that already has money in it lands in the next period instead. Saying
 * that beside the control, before the member commits, is the whole point — a
 * member surprised by this month's bill was not told.
 */

/** Rupiah, written the way every other surface in this app writes it. */
function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** "August 2026" / "Agustus 2026" — a Billing Period as a member reads it. */
function periodLabel(period: BillingPeriod, t: Dictionary): string {
    return `${t.months[period.month]} ${period.year}`;
}

/** `{token}` substitution. A plain replace: one occurrence, no regex. */
function fill(template: string, token: string, value: string): string {
    return template.replace(`{${token}}`, value);
}

/** Both modes, in the order a member reads them: the standing commitment first. */
const ORDERED_MODES: readonly PaymentMode[] = [
    PaymentMode.MONTHLY,
    PaymentMode.PER_SESSION,
];

/**
 * Dues and a per-Session Fee are different things, so every amount on this
 * surface says which one it is. Mode name, what it bills, and the figure.
 */
export interface ModeSummary {
    readonly modeLabel: string;
    readonly billsLabel: string;
    readonly amount: string;
}

/** One offered way to pay, as the control renders it. */
export interface ModeOptionView extends ModeSummary {
    readonly mode: PaymentMode;
    readonly modeDesc: string;
    /** Which Billing Period a switch to this mode lands in, in the member's words. */
    readonly effectSentence: string;
}

export interface MembershipModeView {
    /** Only the modes the Activity offers. Empty where it offers none. */
    readonly options: readonly ModeOptionView[];
    /** What is in force for the current period; null where nothing is chosen yet. */
    readonly inForce: ModeSummary | null;
    /** In force for the NEXT period — the value the control starts on. */
    readonly nextMode: PaymentMode | null;
    readonly currentPeriodLabel: string;
}

/** One Membership as the profile surface renders it. */
export interface MembershipRowView {
    readonly activityId: string;
    readonly name: string;
    readonly joinedDate: string;
    readonly mode: MembershipModeView;
    /** The Payment standing against the current period, or null where none is in. */
    readonly periodPaymentStatus: PaymentStatus | null;
}

/** What the view is built from. The Activity's prices, and the member's standing. */
export interface MembershipModeInput {
    readonly membership: MembershipMode;
    readonly offered: OfferedModes;
    readonly monthlyFee: number;
    readonly sessionFee: number;
    /** Whether a live Payment stands against the current Billing Period. */
    readonly hasLivePaymentThisPeriod: boolean;
}

function isOffered(mode: PaymentMode, offered: OfferedModes): boolean {
    return mode === PaymentMode.MONTHLY
        ? offered.allowsMonthly
        : offered.allowsPerSession;
}

function summarise(
    mode: PaymentMode,
    input: MembershipModeInput,
    t: Dictionary,
): ModeSummary {
    if (mode === PaymentMode.MONTHLY) {
        return {
            modeLabel: t.paymentMode.monthly,
            billsLabel: t.profile.modeDuesLabel,
            amount: `${rupiah(input.monthlyFee)}${t.paymentMode.perMonthSuffix}`,
        };
    }
    return {
        modeLabel: t.paymentMode.perSession,
        billsLabel: t.profile.modeFeeLabel,
        amount: `${rupiah(input.sessionFee)}${t.paymentMode.perSessionSuffix}`,
    };
}

/** The two Billing Periods every sentence on this surface is written against. */
interface PeriodLabels {
    readonly current: string;
    readonly next: string;
}

/** The two facts that decide which of those periods a switch lands in. */
interface SwitchGate {
    readonly hasLivePayment: boolean;
    readonly isSwitchQueued: boolean;
}

/**
 * Which Billing Period a switch to `target` lands in, said out loud.
 *
 * Mirrors the write path's own rule (`resolveSwitch` in
 * `src/app/api/users/memberships/[activityId]/mode/route.ts`) as a read, so the
 * sentence beside the control names the period the server will actually use:
 * a first-ever selection applies now, because nothing is owed yet; a change
 * against a period with no money in it may still be re-decided, so it also
 * applies now; re-picking the standing mode cancels a queued switch and so lands
 * now too; and a change against a period that is already paid queues for the
 * next period, leaving the settled one untouched.
 */
function effectSentence(
    target: PaymentMode,
    standingMode: PaymentMode | null,
    periods: PeriodLabels,
    gate: SwitchGate,
    t: Dictionary,
): string {
    const isFirstSelection = standingMode === null;
    if (!isFirstSelection && target === standingMode) {
        return gate.isSwitchQueued
            ? fill(t.profile.modeEffectNow, 'period', periods.current)
            : fill(t.profile.modeEffectUnchanged, 'period', periods.current);
    }
    if (isFirstSelection || !gate.hasLivePayment) {
        return fill(t.profile.modeEffectNow, 'period', periods.current);
    }
    return fill(
        fill(t.profile.modeEffectNext, 'next', periods.next),
        'current',
        periods.current,
    );
}

function buildOptions(
    input: MembershipModeInput,
    standingMode: PaymentMode | null,
    periods: PeriodLabels,
    gate: SwitchGate,
    t: Dictionary,
): ModeOptionView[] {
    return ORDERED_MODES.filter((mode) => isOffered(mode, input.offered)).map(
        (mode) => ({
            mode,
            ...summarise(mode, input, t),
            modeDesc:
                mode === PaymentMode.MONTHLY
                    ? t.paymentMode.monthlyDesc
                    : t.paymentMode.perSessionDesc,
            effectSentence: effectSentence(
                mode,
                standingMode,
                periods,
                gate,
                t,
            ),
        }),
    );
}

/**
 * The whole view for one Membership. `now` is injected rather than read from an
 * ambient clock, matching the resolver this reads.
 */
export function buildMembershipModeView(
    input: MembershipModeInput,
    now: Date,
    t: Dictionary,
): MembershipModeView {
    const current = currentPeriod(now);
    const next = nextPeriod(now);
    const periods: PeriodLabels = {
        current: periodLabel(current, t),
        next: periodLabel(next, t),
    };

    const inForceMode = resolvePaymentMode(
        input.membership,
        input.offered,
        current.month,
        current.year,
    );
    const nextMode = resolvePaymentMode(
        input.membership,
        input.offered,
        next.month,
        next.year,
    );
    const gate: SwitchGate = {
        hasLivePayment: input.hasLivePaymentThisPeriod,
        isSwitchQueued: nextMode !== inForceMode,
    };
    const standingMode = graduateStanding(input.membership, current).paymentMode;

    return {
        options: buildOptions(input, standingMode, periods, gate, t),
        inForce: inForceMode === null ? null : summarise(inForceMode, input, t),
        nextMode,
        currentPeriodLabel: periods.current,
    };
}

/**
 * Which Payment speaks for a Billing Period when several stand against it — a
 * per-Session member can hold more than one in a month. Confirmed money outranks
 * money awaiting Confirm, which outranks a Rejected row that funds nothing.
 */
const STATUS_RANK: Record<PaymentStatus, number> = {
    [PaymentStatus.CONFIRMED]: 3,
    [PaymentStatus.PENDING]: 2,
    [PaymentStatus.REJECTED]: 1,
};

/** The one Payment per Activity that speaks for the period, keyed by Activity. */
export function pickPeriodPaymentStatus(
    rows: readonly { readonly activityId: string; readonly status: PaymentStatus }[],
): Map<string, PaymentStatus> {
    const best = new Map<string, PaymentStatus>();
    for (const row of rows) {
        const held = best.get(row.activityId);
        if (held === undefined || STATUS_RANK[row.status] > STATUS_RANK[held]) {
            best.set(row.activityId, row.status);
        }
    }
    return best;
}

/**
 * The write path's own gate, read rather than re-decided: a Rejected Payment
 * funds nothing, so it leaves the period still open to be re-decided.
 */
export function isLivePaymentStatus(status: PaymentStatus | null): boolean {
    return status === PaymentStatus.CONFIRMED || status === PaymentStatus.PENDING;
}

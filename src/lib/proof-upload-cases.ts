import type { PaymentMode } from '@prisma/client';

/**
 * Why the Proof uploader has nothing to bill for — the one screen whose job is
 * "give the community your money" must never answer that with a blank page.
 *
 * This is a **read** over payment-mode resolution, not a second copy of it. The
 * effective mode per Activity is resolved server-side for the current period by
 * `resolvePaymentMode` (see `src/lib/payment-mode.ts`) and arrives on each row
 * of `GET /api/users/memberships`. Nothing here re-decides a mode, a period, or
 * a graduation; it only tells apart the causes that all used to render as the
 * same empty select, because a confident wrong explanation is worse than none.
 *
 * Deliberately free of `server-only`: the uploader is a client component and
 * reads its own fetched rows through this same seam.
 */

/**
 * The two modes as the memberships GET serialises them. Compared as string
 * literals so no Prisma runtime is pulled into the browser bundle.
 */
const MONTHLY: PaymentMode = 'MONTHLY';
const PER_SESSION: PaymentMode = 'PER_SESSION';

/** An Activity's transfer destination, as `BankAccountInfo` reads it. */
export interface ProofBankAccount {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
}

/**
 * An Activity billed monthly for the current period — the only kind of Activity
 * this screen can raise a Payment for, carrying what the member needs to pay:
 * the amount owed and where to transfer it.
 */
export interface MonthlyActivity extends ProofBankAccount {
    id: string;
    name: string;
    monthlyFee: number;
}

/** An Activity an explanation names, and the link that resolves it. */
export interface NamedActivity {
    id: string;
    name: string;
}

/** One row of `GET /api/users/memberships`, as this screen reads it. */
export interface MembershipRow extends ProofBankAccount {
    id: string;
    name: string;
    monthlyFee: number;
    joined: boolean;
    allowsMonthly: boolean;
    /** Server-resolved for the current period. `null` means "unselected". */
    effectiveMode: PaymentMode | null;
}

/**
 * What the uploader renders, and — when there is nothing to bill — which of the
 * causes applies. Each non-monthly case names the Activities it is about so the
 * sentence on screen is about the member's own situation rather than generic.
 *
 * - `monthly` — at least one Activity resolves to monthly billing. The form.
 * - `modeUnchosen` — the member has never chosen how they pay for an Activity
 *   that *could* bill monthly. Resolved where a mode is chosen.
 * - `perSessionOnly` — every Activity they are in bills per Session, so there
 *   is no monthly charge on this screen at all. Resolved from the Session.
 * - `noActivity` — they are in no Activity, so nothing is owed to anything.
 * - `noBilling` — their Activities offer no payment mode whatsoever. Blocked by
 *   Activity validation, so unreachable through the admin UI, but a member must
 *   not be sent to choose between two options that do not exist.
 */
export type ProofUploadCase =
    | { readonly kind: 'monthly'; readonly activities: readonly MonthlyActivity[] }
    | { readonly kind: 'modeUnchosen'; readonly activities: readonly NamedActivity[] }
    | { readonly kind: 'perSessionOnly'; readonly activities: readonly NamedActivity[] }
    | { readonly kind: 'noBilling'; readonly activities: readonly NamedActivity[] }
    | { readonly kind: 'noActivity' };

function toMonthlyActivity(row: MembershipRow): MonthlyActivity {
    return {
        id: row.id,
        name: row.name,
        monthlyFee: row.monthlyFee,
        bankName: row.bankName,
        bankAccountNumber: row.bankAccountNumber,
        bankAccountHolder: row.bankAccountHolder,
    };
}

function toNamedActivity(row: MembershipRow): NamedActivity {
    return { id: row.id, name: row.name };
}

/**
 * Tell the causes apart, most actionable first.
 *
 * `modeUnchosen` outranks `perSessionOnly` because a member holding both an
 * unchosen Activity and a per-Session one has exactly one thing to do, and it
 * is the choice — that is the only path from here to a monthly charge.
 *
 * An unresolved row whose Activity cannot bill monthly is not a choice waiting
 * to be made: a single offered mode auto-applies, so `null` alongside
 * `allowsMonthly === false` means the Activity offers no mode at all.
 */
export function resolveProofUploadCase(
    rows: readonly MembershipRow[],
): ProofUploadCase {
    const joined = rows.filter((row) => row.joined);
    const monthly = joined.filter((row) => row.effectiveMode === MONTHLY);
    if (monthly.length > 0) {
        return { kind: 'monthly', activities: monthly.map(toMonthlyActivity) };
    }
    if (joined.length === 0) {
        return { kind: 'noActivity' };
    }

    const unresolved = joined.filter((row) => row.effectiveMode === null);
    const choosable = unresolved.filter((row) => row.allowsMonthly);
    if (choosable.length > 0) {
        return { kind: 'modeUnchosen', activities: choosable.map(toNamedActivity) };
    }

    const perSession = joined.filter((row) => row.effectiveMode === PER_SESSION);
    if (perSession.length > 0) {
        return {
            kind: 'perSessionOnly',
            activities: perSession.map(toNamedActivity),
        };
    }
    return { kind: 'noBilling', activities: unresolved.map(toNamedActivity) };
}

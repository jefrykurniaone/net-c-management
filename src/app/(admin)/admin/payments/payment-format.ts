import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * How a Payment's two figures are written, in one place.
 *
 * The whole premise of the decision dialogs is that they restate the row the
 * Admin clicked. Two implementations of "the amount" — one drawing the cell,
 * one drawing the dialog that restates it — is exactly the drift this surface
 * cannot afford, so the row and the dialog read from here.
 *
 * Directive-free on purpose: the register's cells are server components and the
 * dialogs are client ones, and both import this.
 */

/** Rupiah as the rest of the app writes it. Tabular figures come from the kind. */
export function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** The Billing Period a Payment belongs to, named in the reader's locale. */
export function billingPeriodLabel(
    t: Dictionary,
    month: number,
    year: number,
): string {
    return `${t.months[month]} ${year}`;
}

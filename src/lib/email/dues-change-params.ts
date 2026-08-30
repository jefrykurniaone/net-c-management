import type { EmailLocale } from './layout';

/**
 * The one shape the three Dues-change notifications take.
 *
 * Declared once rather than three times because the sender is chosen by the
 * event, not by the fields: the queue, the replace and the withdraw all name an
 * Activity, a figure and a month, and a fourth copy of that list is a fourth
 * place for the three to drift apart. Only the *meaning* of two fields moves
 * with the event, which is what the comments below carry.
 */
export interface DuesChangeParams {
    to: string;
    name: string;
    activityName: string;
    /**
     * The figure the email is about: the new Dues for a queued or replaced
     * change, and — for a withdrawn one — the figure that stays, which is what
     * the current Billing Period charges.
     */
    amount: number;
    /** 1-based calendar month of the Billing Period the change was set for. */
    month: number;
    year: number;
    communityName: string;
    locale: EmailLocale;
}

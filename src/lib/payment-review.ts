/**
 * The one rule an Admin's Reject cannot be talked out of.
 *
 * A Reject is the only decision on this surface the member has to act on, and
 * the only thing telling them what to do about it is the reason the Admin
 * typed — it is stored as the Payment's `notes` and read straight back on their
 * own payments history. A Reject with no reason is therefore not a Reject with
 * a missing nicety; it is a member who has lost their Seat and cannot find out
 * why. The dialog asks for one, and this is what makes asking irrelevant.
 *
 * It answers on the raw request body, before the locale is read and before the
 * translated validation schema is built, so the refusal cannot be changed by a
 * dictionary edit and does not depend on one being loaded. The error string is
 * a machine name for that reason: it names the rule, never a sentence.
 */

/** The refusal's machine name. Not a dictionary key and never rendered. */
export const REJECT_REASON_REQUIRED = 'REJECT_REASON_REQUIRED';

/**
 * Whether this request body is a Reject carrying no usable reason. Whitespace
 * is not a reason: a member shown `"   "` has been told nothing.
 *
 * Anything that is not a Reject is not this rule's business and comes back
 * `false` — the request goes on to the schema that validates the rest.
 */
export function isRejectWithoutReason(body: unknown): boolean {
    if (typeof body !== 'object' || body === null) {
        return false;
    }
    const { status, notes } = body as Readonly<{
        status?: unknown;
        notes?: unknown;
    }>;
    if (status !== 'REJECTED') {
        return false;
    }
    return typeof notes !== 'string' || notes.trim().length === 0;
}

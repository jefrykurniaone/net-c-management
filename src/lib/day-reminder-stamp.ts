/**
 * Whether a day-of reminder run may mark a Session as reminded.
 *
 * `ActivitySession.dayReminderSentAt` is the double-send guard: once it is set,
 * the cron's query skips that Session for good. That makes the stamp a claim
 * about what already reached a member's inbox, and a claim only a successful
 * send can support. Stamping after a run that sent nothing does not guard a
 * double send — there was no first send to guard — it suppresses the only one
 * that was ever going to happen.
 *
 * Nothing here sends, reads or writes anything — it takes the tally the
 * recipient loop produced and answers one question
 * (`docs/adr/0005-pure-rule-modules.md`).
 */

/** What one Session's recipient loop did, counted per recipient. */
export type DayReminderOutcome = Readonly<{
    /** Recipients the mailer accepted. */
    sent: number;
    /** Recipients whose send threw. */
    failed: number;
    /** Registered attendees carrying no email address to send to. */
    unaddressable: number;
}>;

/**
 * True only when at least one reminder actually went out.
 *
 * The three cases the rule has to separate:
 *
 * - **Something sent.** Stamp. Those members have the mail; a second run would
 *   send it to them twice, which is exactly what the guard exists to prevent.
 *   A partial failure still stamps — the members who did receive it outrank the
 *   ones who did not, and re-running would spam the former to retry the latter.
 * - **Every send failed.** Do not stamp. A transient mail outage must not read
 *   as a completed run; the Session stays eligible so the next invocation
 *   retries it.
 * - **Nobody to send to.** Do not stamp, and this is the deliberate call rather
 *   than a fallthrough. A Session with no registered attendee — or one whose
 *   only attendees have no address — is not the same fact as a Session whose
 *   sends failed, but it wants the same answer for its own reason: the field
 *   records when the reminder was sent, and writing a time into it when nothing
 *   was sent records a delivery that never happened. Leaving it null is both
 *   true and harmless. There is no double send to guard against when there was
 *   no recipient, and if a member registers before the next invocation of the
 *   day the Session is still there to catch them.
 */
export function shouldStampDayReminder(outcome: DayReminderOutcome): boolean {
    return outcome.sent > 0;
}

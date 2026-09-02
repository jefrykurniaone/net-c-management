import { describe, expect, it } from 'vitest';
import {
    shouldStampDayReminder,
    type DayReminderOutcome,
} from '../day-reminder-stamp';

/**
 * The day-of reminder cron stamps `dayReminderSentAt` to stop a Session being
 * reminded twice. The stamp is therefore a claim that mail went out, and the
 * cases below fix what that claim costs when it is made too eagerly: a run whose
 * every send threw must leave the Session eligible, or one transient mail outage
 * suppresses that day's reminders permanently.
 */

const cases: ReadonlyArray<
    readonly [name: string, outcome: DayReminderOutcome, shouldStamp: boolean]
> = [
    [
        'stamps when every send succeeded',
        { sent: 5, failed: 0, unaddressable: 0 },
        true,
    ],
    [
        'stamps a partial failure, because the members who got it must not get it twice',
        { sent: 3, failed: 2, unaddressable: 0 },
        true,
    ],
    [
        'stamps when the only misses were attendees with no email address',
        { sent: 1, failed: 0, unaddressable: 4 },
        true,
    ],
    [
        'leaves the Session eligible for the next run when every send failed',
        { sent: 0, failed: 6, unaddressable: 0 },
        false,
    ],
    [
        'leaves the Session eligible when a single lone send failed',
        { sent: 0, failed: 1, unaddressable: 0 },
        false,
    ],
    [
        'does not stamp a Session with no recipients at all',
        { sent: 0, failed: 0, unaddressable: 0 },
        false,
    ],
    [
        'does not stamp when every registered attendee lacks an email address',
        { sent: 0, failed: 0, unaddressable: 3 },
        false,
    ],
];

describe('shouldStampDayReminder', () => {
    it.each(cases)('%s', (_name, outcome, shouldStamp) => {
        expect(shouldStampDayReminder(outcome)).toBe(shouldStamp);
    });
});

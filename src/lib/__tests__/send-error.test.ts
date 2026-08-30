import { describe, it, expect } from 'vitest';
import { formatSendFailure } from '../email/send-error';

/**
 * A stalled SMTP send used to reject (or, before this ticket, hang for up to nodemailer's
 * defaults) with no clue how long it had been running. This helper's message is the only
 * signal an operator gets to tell a slow-but-eventually-failing send apart from a fast one.
 */
describe('formatSendFailure', () => {
    it('prefixes the elapsed time and keeps the original message', () => {
        const original = new Error('Invalid login: 535-5.7.8');

        const wrapped = formatSendFailure(original, 30_000);

        expect(wrapped.message).toBe('send failed after 30000 ms: Invalid login: 535-5.7.8');
    });

    it('keeps the original error as cause', () => {
        const original = new Error('boom');

        const wrapped = formatSendFailure(original, 5);

        expect(wrapped.cause).toBe(original);
    });

    it('stringifies a non-Error rejection reason', () => {
        const wrapped = formatSendFailure('connection reset', 12);

        expect(wrapped.message).toBe('send failed after 12 ms: connection reset');
    });
});

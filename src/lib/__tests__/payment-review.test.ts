import { describe, it, expect } from 'vitest';
import {
    isRejectWithoutReason,
    REJECT_REASON_REQUIRED,
} from '../payment-review';

/**
 * The refusal a member's Seat depends on. A Reject releases every Seat they
 * hold for the period, and the reason is the only thing that tells them why —
 * so the cases worth pinning are the ones that look like a reason and are not.
 */

describe('isRejectWithoutReason', () => {
    it('refuses a Reject with no notes field at all', () => {
        expect(isRejectWithoutReason({ status: 'REJECTED' })).toBe(true);
    });

    it('refuses a Reject whose reason is the empty string', () => {
        expect(isRejectWithoutReason({ status: 'REJECTED', notes: '' })).toBe(
            true,
        );
    });

    it('refuses a Reject whose reason is only whitespace', () => {
        expect(
            isRejectWithoutReason({ status: 'REJECTED', notes: '  \n\t ' }),
        ).toBe(true);
    });

    it('refuses a Reject whose reason is not a string', () => {
        expect(isRejectWithoutReason({ status: 'REJECTED', notes: 42 })).toBe(
            true,
        );
    });

    it('lets a Reject carrying a real reason through', () => {
        expect(
            isRejectWithoutReason({
                status: 'REJECTED',
                notes: 'Transfer amount does not match',
            }),
        ).toBe(false);
    });

    it('is not a Confirm rule: a Confirm needs no notes', () => {
        expect(isRejectWithoutReason({ status: 'CONFIRMED' })).toBe(false);
    });

    it('leaves a body it cannot read to the schema behind it', () => {
        expect(isRejectWithoutReason(null)).toBe(false);
        expect(isRejectWithoutReason('REJECTED')).toBe(false);
        expect(isRejectWithoutReason(undefined)).toBe(false);
    });
});

describe('REJECT_REASON_REQUIRED', () => {
    it('is a machine name, not a sentence a dictionary could change', () => {
        expect(REJECT_REASON_REQUIRED).toBe('REJECT_REASON_REQUIRED');
    });
});

import { describe, it, expect } from 'vitest';
import {
    resolveStatusMark,
    MARK_KINDS,
    type MarkKind,
    type StatusMark,
} from '../status-mark';

describe('resolveStatusMark — Payment', () => {
    it('writes a Confirmed Payment in ink', () => {
        expect(resolveStatusMark({ domain: 'payment', status: 'CONFIRMED' })).toEqual({
            kind: 'ink',
            labelKey: 'confirmed',
        });
    });

    it('holds a Pending Payment with tape', () => {
        expect(resolveStatusMark({ domain: 'payment', status: 'PENDING' })).toEqual({
            kind: 'tape',
            labelKey: 'pending',
        });
    });

    it('strikes a Rejected Payment through', () => {
        expect(resolveStatusMark({ domain: 'payment', status: 'REJECTED' })).toEqual({
            kind: 'strike',
            labelKey: 'rejected',
        });
    });
});

describe('resolveStatusMark — Session', () => {
    it('strikes a cancelled Session through', () => {
        expect(resolveStatusMark({ domain: 'session', status: 'CANCELLED' })).toEqual({
            kind: 'strike',
            labelKey: 'cancelled',
        });
    });

    it.each(['SCHEDULED', 'ONGOING', 'COMPLETED'] as const)(
        'writes a posted Session (%s) in ink',
        (status) => {
            expect(resolveStatusMark({ domain: 'session', status }).kind).toBe('ink');
        },
    );

    it('keeps a distinct label for every Session status', () => {
        const labels = (['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map(
            (status) => resolveStatusMark({ domain: 'session', status }).labelKey,
        );
        expect(new Set(labels).size).toBe(labels.length);
    });
});

describe('resolveStatusMark — Attendance', () => {
    it('writes a held Seat in ink', () => {
        expect(resolveStatusMark({ domain: 'attendance', status: 'REGISTERED' })).toEqual({
            kind: 'ink',
            labelKey: 'registered',
        });
    });

    it('writes a Present Participant in ink', () => {
        expect(resolveStatusMark({ domain: 'attendance', status: 'PRESENT' })).toEqual({
            kind: 'ink',
            labelKey: 'present',
        });
    });

    it('holds an unsettled Maybe with tape', () => {
        expect(resolveStatusMark({ domain: 'attendance', status: 'MAYBE' })).toEqual({
            kind: 'tape',
            labelKey: 'maybe',
        });
    });

    it('erases a released Seat rather than marking it a failure', () => {
        // ABSENT is the stored name for Opted Out — the member's own choice.
        expect(resolveStatusMark({ domain: 'attendance', status: 'ABSENT' })).toEqual({
            kind: 'erased',
            labelKey: 'optedOut',
        });
    });

    it('never surfaces the stored ABSENT wording', () => {
        expect(
            resolveStatusMark({ domain: 'attendance', status: 'ABSENT' }).labelKey,
        ).not.toMatch(/absent/i);
    });
});

describe('the mark vocabulary', () => {
    it('is exactly six kinds', () => {
        expect(MARK_KINDS).toEqual([
            'ink',
            'tape',
            'strike',
            'erased',
            'blank',
            'hollow',
        ]);
    });

    it('never resolves a domain state to hollow — No-Show has no producer yet', () => {
        const every: StatusMark[] = [
            ...(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const).map((status) =>
                resolveStatusMark({ domain: 'session', status }),
            ),
            ...(['PENDING', 'CONFIRMED', 'REJECTED'] as const).map((status) =>
                resolveStatusMark({ domain: 'payment', status }),
            ),
            ...(['REGISTERED', 'MAYBE', 'PRESENT', 'ABSENT'] as const).map((status) =>
                resolveStatusMark({ domain: 'attendance', status }),
            ),
        ];
        expect(every.some((mark) => mark.kind === 'hollow')).toBe(false);
    });

    it('resolves every state to a kind inside the closed union', () => {
        const kinds: MarkKind[] = [...MARK_KINDS];
        expect(kinds).toContain(
            resolveStatusMark({ domain: 'payment', status: 'PENDING' }).kind,
        );
    });
});

import { describe, it, expect } from 'vitest';
import {
    resolveProofUploadCase,
    type MembershipRow,
} from '../proof-upload-cases';

/** A joined Activity that offers both modes and has no mode chosen yet. */
function row(overrides: Partial<MembershipRow> = {}): MembershipRow {
    return {
        id: 'badminton',
        name: 'Badminton',
        duesAmount: 150000,
        duesAmountByPeriod: { 202608: 150000 },
        joined: true,
        allowsMonthly: true,
        effectiveMode: null,
        bankName: 'BCA',
        bankAccountNumber: '1234567890',
        bankAccountHolder: 'Community',
        ...overrides,
    };
}

describe('resolveProofUploadCase — something to bill for', () => {
    it('renders the form for an Activity resolved to monthly billing', () => {
        const result = resolveProofUploadCase([
            row({ effectiveMode: 'MONTHLY' }),
        ]);
        expect(result).toEqual({
            kind: 'monthly',
            activities: [
                {
                    id: 'badminton',
                    name: 'Badminton',
                    duesAmount: 150000,
                    duesAmountByPeriod: { 202608: 150000 },
                    bankName: 'BCA',
                    bankAccountNumber: '1234567890',
                    bankAccountHolder: 'Community',
                },
            ],
        });
    });

    it('bills the monthly Activity even when another is unresolved', () => {
        const result = resolveProofUploadCase([
            row({ id: 'futsal', name: 'Futsal' }),
            row({ effectiveMode: 'MONTHLY' }),
        ]);
        expect(result.kind).toBe('monthly');
        expect(result.kind === 'monthly' && result.activities).toHaveLength(1);
    });

    it('ignores an Activity the member has left, monthly or not', () => {
        const result = resolveProofUploadCase([
            row({ joined: false, effectiveMode: 'MONTHLY' }),
        ]);
        expect(result).toEqual({ kind: 'noActivity' });
    });
});

describe('resolveProofUploadCase — nothing to bill for', () => {
    it('names the Activities awaiting a payment mode', () => {
        const result = resolveProofUploadCase([
            row({ id: 'futsal', name: 'Futsal' }),
        ]);
        expect(result).toEqual({
            kind: 'modeUnchosen',
            activities: [{ id: 'futsal', name: 'Futsal' }],
        });
    });

    it('asks for the choice first when one Activity is per-Session', () => {
        const result = resolveProofUploadCase([
            row({ id: 'futsal', name: 'Futsal', effectiveMode: 'PER_SESSION' }),
            row(),
        ]);
        expect(result).toEqual({
            kind: 'modeUnchosen',
            activities: [{ id: 'badminton', name: 'Badminton' }],
        });
    });

    it('sends a member billed per Session everywhere to the Session', () => {
        const result = resolveProofUploadCase([
            row({ effectiveMode: 'PER_SESSION' }),
            row({ id: 'futsal', name: 'Futsal', effectiveMode: 'PER_SESSION' }),
        ]);
        expect(result).toEqual({
            kind: 'perSessionOnly',
            activities: [
                { id: 'badminton', name: 'Badminton' },
                { id: 'futsal', name: 'Futsal' },
            ],
        });
    });

    it('keeps a member in no Activity out of the other explanations', () => {
        expect(resolveProofUploadCase([])).toEqual({ kind: 'noActivity' });
        expect(resolveProofUploadCase([row({ joined: false })])).toEqual({
            kind: 'noActivity',
        });
    });

    it('never asks for a choice an Activity offers no options for', () => {
        const result = resolveProofUploadCase([
            row({ allowsMonthly: false, effectiveMode: null }),
        ]);
        expect(result).toEqual({
            kind: 'noBilling',
            activities: [{ id: 'badminton', name: 'Badminton' }],
        });
    });
});

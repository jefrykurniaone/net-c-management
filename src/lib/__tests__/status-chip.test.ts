import { describe, it, expect } from 'vitest';
import {
    attendanceState,
    paymentState,
    resolveStatusChip,
    sessionState,
    CHIP_VARIANTS,
    type ChipLabelKey,
    type ChipVariant,
    type DomainState,
    type StatusChip,
} from '../status-chip';
import { getDictionary, LOCALES } from '../i18n/dictionaries';
import type { ChipProps } from '@/components/ui/chip';

const SESSION_STATUSES = ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'] as const;
const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'REJECTED'] as const;
const ATTENDANCE_STATUSES = [
    'REGISTERED',
    'MAYBE',
    'PRESENT',
    'ABSENT',
    'NO_SHOW',
] as const;

/**
 * Every state the product can be in, as the resolver's own input. Built through
 * the exported constructors, which is also what every call site uses.
 */
const EVERY_STATE: readonly DomainState[] = [
    ...SESSION_STATUSES.map(sessionState),
    ...PAYMENT_STATUSES.map(paymentState),
    ...ATTENDANCE_STATUSES.map(attendanceState),
];

/** One expected row: the state, the variant it draws, and the word it says. */
type Expected = readonly [DomainState, ChipVariant, ChipLabelKey];

const PAYMENT_CASES: readonly Expected[] = [
    [paymentState('CONFIRMED'), 'settled', 'confirmed'],
    [paymentState('PENDING'), 'provisional', 'pending'],
    [paymentState('REJECTED'), 'void', 'rejected'],
];

const SESSION_CASES: readonly Expected[] = [
    [sessionState('SCHEDULED'), 'settled', 'scheduled'],
    [sessionState('ONGOING'), 'settled', 'ongoing'],
    [sessionState('COMPLETED'), 'settled', 'completed'],
    [sessionState('CANCELLED'), 'void', 'cancelled'],
];

/**
 * `ABSENT` is the stored name for Opted Out — the member released their own
 * Seat. That is a choice, so it is neutral rather than void, and it never
 * surfaces as "Absent". `NO_SHOW` is the failure beside it.
 */
const ATTENDANCE_CASES: readonly Expected[] = [
    [attendanceState('REGISTERED'), 'settled', 'registered'],
    [attendanceState('PRESENT'), 'settled', 'present'],
    [attendanceState('MAYBE'), 'provisional', 'maybe'],
    [attendanceState('ABSENT'), 'neutral', 'optedOut'],
    [attendanceState('NO_SHOW'), 'void', 'noShow'],
];

describe('resolveStatusChip', () => {
    it.each([...PAYMENT_CASES, ...SESSION_CASES, ...ATTENDANCE_CASES])(
        '%o draws a $1 chip labelled $2',
        (state, variant, labelKey) => {
            expect(resolveStatusChip(state)).toEqual({ variant, labelKey });
        },
    );

    it('keeps a distinct label for every Session status', () => {
        const labels = SESSION_CASES.map(([state]) => resolveStatusChip(state).labelKey);

        expect(new Set(labels).size).toBe(labels.length);
    });

    it('tells No-Show apart from Opted Out by variant and by label', () => {
        const optedOut = resolveStatusChip(attendanceState('ABSENT'));
        const noShow = resolveStatusChip(attendanceState('NO_SHOW'));

        expect(noShow.variant).not.toBe(optedOut.variant);
        expect(noShow.labelKey).not.toBe(optedOut.labelKey);
    });

    it('never surfaces the stored ABSENT wording', () => {
        expect(resolveStatusChip(attendanceState('ABSENT')).labelKey).not.toMatch(
            /absent/i,
        );
    });
});

describe('the chip vocabulary', () => {
    it('is exactly five variants', () => {
        expect(CHIP_VARIANTS).toEqual([
            'settled',
            'provisional',
            'void',
            'neutral',
            'info',
        ]);
    });

    it('resolves every domain state to a variant and a label key', () => {
        const variants: ChipVariant[] = [...CHIP_VARIANTS];
        const resolved: StatusChip[] = EVERY_STATE.map(resolveStatusChip);

        expect(resolved).toHaveLength(EVERY_STATE.length);
        for (const chip of resolved) {
            expect(variants).toContain(chip.variant);
            expect(chip.labelKey).toEqual(expect.any(String));
        }
    });

    /**
     * Cancelled, Rejected and No-Show are all void, so the label is the only
     * thing telling them apart — The Label Rule doing the work the six mark
     * forms used to do with their shapes.
     */
    it('gives every void state its own label', () => {
        const voidLabels = EVERY_STATE.map(resolveStatusChip)
            .filter((chip) => chip.variant === 'void')
            .map((chip) => chip.labelKey);

        expect(voidLabels).toHaveLength(3);
        expect(new Set(voidLabels).size).toBe(voidLabels.length);
    });
});

describe('chip labels', () => {
    /** Every key a domain state can resolve to, plus the one no state owns. */
    const usedKeys: readonly ChipLabelKey[] = [
        ...EVERY_STATE.map((state) => resolveStatusChip(state).labelKey),
        'unposted',
    ];

    it.each(LOCALES)('ships every resolved label key in %s', (locale) => {
        const labels = getDictionary(locale).chips;
        const missing = usedKeys.filter((key) => !labels[key]?.trim());

        expect(missing).toEqual([]);
    });

    it('names the same keys in both locales', () => {
        expect(Object.keys(getDictionary('id').chips)).toEqual(
            Object.keys(getDictionary('en').chips),
        );
    });

    /**
     * The label is a required prop, so a chip cannot be built without one. The
     * `@ts-expect-error` below is the assertion: if `label` ever became
     * optional the directive would be unused and `tsc --noEmit` would fail.
     */
    it('cannot be built without a label', () => {
        const settled: ChipProps = { variant: 'settled', label: 'Confirmed' };
        // @ts-expect-error — a chip without a label does not type-check.
        const unlabelled: ChipProps = { variant: 'settled' };

        expect(settled.label).toBe('Confirmed');
        expect(unlabelled.label).toBeUndefined();
    });
});

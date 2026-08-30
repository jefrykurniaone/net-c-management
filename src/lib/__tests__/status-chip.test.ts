import { describe, it, expect } from 'vitest';
import {
    resolveStatusChip,
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

/** Every state the product can be in, as the resolver's own input. */
const EVERY_STATE: readonly DomainState[] = [
    ...SESSION_STATUSES.map((status): DomainState => ({ domain: 'session', status })),
    ...PAYMENT_STATUSES.map((status): DomainState => ({ domain: 'payment', status })),
    ...ATTENDANCE_STATUSES.map(
        (status): DomainState => ({ domain: 'attendance', status }),
    ),
];

describe('resolveStatusChip — Payment', () => {
    it('settles a Confirmed Payment', () => {
        expect(resolveStatusChip({ domain: 'payment', status: 'CONFIRMED' })).toEqual({
            variant: 'settled',
            labelKey: 'confirmed',
        });
    });

    it('holds a Pending Payment as provisional', () => {
        expect(resolveStatusChip({ domain: 'payment', status: 'PENDING' })).toEqual({
            variant: 'provisional',
            labelKey: 'pending',
        });
    });

    it('voids a Rejected Payment', () => {
        expect(resolveStatusChip({ domain: 'payment', status: 'REJECTED' })).toEqual({
            variant: 'void',
            labelKey: 'rejected',
        });
    });
});

describe('resolveStatusChip — Session', () => {
    it('voids a cancelled Session', () => {
        expect(resolveStatusChip({ domain: 'session', status: 'CANCELLED' })).toEqual({
            variant: 'void',
            labelKey: 'cancelled',
        });
    });

    it.each(['SCHEDULED', 'ONGOING', 'COMPLETED'] as const)(
        'settles a posted Session (%s)',
        (status) => {
            expect(resolveStatusChip({ domain: 'session', status }).variant).toBe(
                'settled',
            );
        },
    );

    it('keeps a distinct label for every Session status', () => {
        const labels = SESSION_STATUSES.map(
            (status) => resolveStatusChip({ domain: 'session', status }).labelKey,
        );
        expect(new Set(labels).size).toBe(labels.length);
    });
});

describe('resolveStatusChip — Attendance', () => {
    it('settles a held Seat', () => {
        expect(resolveStatusChip({ domain: 'attendance', status: 'REGISTERED' })).toEqual(
            { variant: 'settled', labelKey: 'registered' },
        );
    });

    it('settles a Present Participant', () => {
        expect(resolveStatusChip({ domain: 'attendance', status: 'PRESENT' })).toEqual({
            variant: 'settled',
            labelKey: 'present',
        });
    });

    it('holds an unsettled Maybe as provisional', () => {
        expect(resolveStatusChip({ domain: 'attendance', status: 'MAYBE' })).toEqual({
            variant: 'provisional',
            labelKey: 'maybe',
        });
    });

    it('leaves a released Seat neutral rather than marking it a failure', () => {
        // ABSENT is the stored name for Opted Out — the member's own choice.
        expect(resolveStatusChip({ domain: 'attendance', status: 'ABSENT' })).toEqual({
            variant: 'neutral',
            labelKey: 'optedOut',
        });
    });

    it('voids a No-Show', () => {
        // Held a Seat, did not withdraw, did not attend.
        expect(resolveStatusChip({ domain: 'attendance', status: 'NO_SHOW' })).toEqual({
            variant: 'void',
            labelKey: 'noShow',
        });
    });

    it('tells No-Show apart from Opted Out by variant and by label', () => {
        const optedOut = resolveStatusChip({ domain: 'attendance', status: 'ABSENT' });
        const noShow = resolveStatusChip({ domain: 'attendance', status: 'NO_SHOW' });
        expect(noShow.variant).not.toBe(optedOut.variant);
        expect(noShow.labelKey).not.toBe(optedOut.labelKey);
    });

    it('never surfaces the stored ABSENT wording', () => {
        expect(
            resolveStatusChip({ domain: 'attendance', status: 'ABSENT' }).labelKey,
        ).not.toMatch(/absent/i);
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
     * thing telling them apart — which is The Label Rule doing the work the six
     * mark forms used to do with their shapes.
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

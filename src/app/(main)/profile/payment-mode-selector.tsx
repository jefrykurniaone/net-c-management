'use client';

import { useState } from 'react';
import type { PaymentMode } from '@prisma/client';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';

const MONTHLY: PaymentMode = 'MONTHLY';
const PER_SESSION: PaymentMode = 'PER_SESSION';
/** Radix for decoding a YYYYMM period key back into month + year. */
const PERIOD_RADIX = 100;

/** The per-Activity mode state the selector renders and mutates. */
export interface MembershipMode {
    ekskulId: string;
    monthlyFee: number;
    sessionFee: number;
    allowsMonthly: boolean;
    allowsPerSession: boolean;
    pendingMode: PaymentMode | null;
    pendingEffectiveFrom: number | null;
    effectiveMode: PaymentMode | null;
}

function money(n: number): string {
    return `Rp ${n.toLocaleString('id-ID')}`;
}

/** Human label for a YYYYMM period key using the localized month names. */
function periodLabel(key: number, months: string[]): string {
    const year = Math.floor(key / PERIOD_RADIX);
    const month = key % PERIOD_RADIX;
    return `${months[month] ?? ''} ${year}`.trim();
}

function ModeCard({
    label,
    desc,
    fee,
    selected,
    busy,
    onSelect,
}: Readonly<{
    label: string;
    desc: string;
    fee: string;
    selected: boolean;
    busy: boolean;
    onSelect: () => void;
}>) {
    return (
        <button
            type='button'
            onClick={onSelect}
            disabled={busy}
            aria-pressed={selected}
            className={`min-h-[44px] rounded-lg border p-3 text-left transition ${
                selected
                    ? 'border-green-600 ring-1 ring-green-600 bg-green-50 dark:bg-green-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            } ${busy ? 'opacity-60' : ''}`}>
            <span className='flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white'>
                {selected && <Check className='w-3.5 h-3.5 text-green-600' />}
                {label}
            </span>
            <span className='block text-xs text-gray-500'>{desc}</span>
            <span className='mt-1 block text-sm font-semibold tabular-nums text-gray-900 dark:text-white'>
                {fee}
            </span>
        </button>
    );
}

/** Read-only line for an Activity that offers exactly one mode (auto-applied). */
function SingleModeLine({
    membership,
    t,
}: Readonly<{ membership: MembershipMode; t: Dictionary }>) {
    const mode = membership.effectiveMode;
    if (!mode) return null;
    const isMonthly = mode === MONTHLY;
    const label = isMonthly ? t.paymentMode.monthly : t.paymentMode.perSession;
    const fee = isMonthly
        ? `${money(membership.monthlyFee)}${t.paymentMode.perMonthSuffix}`
        : `${money(membership.sessionFee)}${t.paymentMode.perSessionSuffix}`;
    return (
        <p className='mt-2 text-xs text-gray-500'>
            {t.paymentMode.youPay}:{' '}
            <span className='font-medium text-gray-700 dark:text-gray-300'>{label}</span>{' '}
            <span className='tabular-nums'>{fee}</span>
        </p>
    );
}

export function PaymentModeSelector({
    membership,
    onChanged,
}: Readonly<{ membership: MembershipMode; onChanged: () => void }>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [saving, setSaving] = useState<PaymentMode | null>(null);

    async function choose(mode: PaymentMode) {
        // Re-picking the current mode is a no-op UNLESS a switch is queued —
        // then it cancels the pending switch (matches the route's resolveSwitch).
        const isNoOp = mode === membership.effectiveMode && !membership.pendingMode;
        if (saving || isNoOp) return;
        setSaving(mode);
        try {
            const res = await fetch(
                `/api/users/memberships/${membership.ekskulId}/mode`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode }),
                },
            );
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? t.common.error);
            }
            toast.success(t.paymentMode.saved);
            onChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setSaving(null);
        }
    }

    if (!(membership.allowsMonthly && membership.allowsPerSession)) {
        return <SingleModeLine membership={membership} t={t} />;
    }

    return (
        <div className='mt-2'>
            <p className='text-xs text-gray-500 mb-1.5'>{t.paymentMode.choosePrompt}</p>
            <div className='grid grid-cols-2 gap-2'>
                <ModeCard
                    label={t.paymentMode.monthly}
                    desc={t.paymentMode.monthlyDesc}
                    fee={`${money(membership.monthlyFee)}${t.paymentMode.perMonthSuffix}`}
                    selected={membership.effectiveMode === MONTHLY}
                    busy={saving === MONTHLY}
                    onSelect={() => choose(MONTHLY)}
                />
                <ModeCard
                    label={t.paymentMode.perSession}
                    desc={t.paymentMode.perSessionDesc}
                    fee={`${money(membership.sessionFee)}${t.paymentMode.perSessionSuffix}`}
                    selected={membership.effectiveMode === PER_SESSION}
                    busy={saving === PER_SESSION}
                    onSelect={() => choose(PER_SESSION)}
                />
            </div>
            {membership.pendingMode && membership.pendingEffectiveFrom && (
                <p className='mt-1.5 text-xs text-amber-700 dark:text-amber-500'>
                    {t.paymentMode.pendingNote} · {t.paymentMode.effectivePrefix}{' '}
                    {periodLabel(membership.pendingEffectiveFrom, t.months)}
                </p>
            )}
        </div>
    );
}

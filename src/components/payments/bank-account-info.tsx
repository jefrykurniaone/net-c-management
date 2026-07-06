'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

export interface BankAccount {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
}

/**
 * The activity's transfer destination on the payment-upload pages. The
 * account number is the thing members actually need, so it gets a copy
 * button; without a configured number the block falls back to a
 * "contact the admin" note instead of hiding the gap silently.
 */
export function BankAccountInfo({
    account,
}: Readonly<{ account: BankAccount | null }>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);

    if (!account) return null;

    if (!account.bankAccountNumber) {
        return (
            <p className='text-xs text-muted-foreground'>
                {t.payments.noBankInfo}
            </p>
        );
    }

    async function copyNumber() {
        try {
            await navigator.clipboard.writeText(account!.bankAccountNumber);
            toast.success(t.common.copied);
        } catch {
            toast.error(t.common.error);
        }
    }

    return (
        <div className='rounded-xl border border-primary-soft-border bg-primary-soft px-4 py-3.5'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.08em] text-primary'>
                {t.payments.transferTo}
            </p>
            <div className='mt-1.5 flex items-center justify-between gap-2'>
                <div className='min-w-0'>
                    <p className='font-heading text-[15px] font-bold text-foreground tabular-nums truncate'>
                        {account.bankName && `${account.bankName} · `}
                        {account.bankAccountNumber}
                    </p>
                    {account.bankAccountHolder && (
                        <p className='mt-0.5 text-xs text-primary'>
                            a.n. {account.bankAccountHolder}
                        </p>
                    )}
                </div>
                <button
                    type='button'
                    onClick={copyNumber}
                    aria-label={t.common.copy}
                    title={t.common.copy}
                    className='inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary-soft-border bg-card px-2.5 text-xs font-semibold text-primary hover:bg-accent'>
                    <Copy className='h-3.5 w-3.5' />
                    {t.common.copy}
                </button>
            </div>
        </div>
    );
}

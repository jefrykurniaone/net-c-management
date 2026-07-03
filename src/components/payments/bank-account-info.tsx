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
        <div className='rounded-lg border border-border bg-muted/50 p-3'>
            <p className='text-xs text-muted-foreground'>{t.payments.transferTo}</p>
            <div className='mt-1 flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold text-foreground tabular-nums'>
                    {account.bankName && `${account.bankName} · `}
                    {account.bankAccountNumber}
                </p>
                <button
                    type='button'
                    onClick={copyNumber}
                    aria-label={t.common.copy}
                    title={t.common.copy}
                    className='inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'>
                    <Copy className='h-3.5 w-3.5' />
                    {t.common.copy}
                </button>
            </div>
            {account.bankAccountHolder && (
                <p className='mt-0.5 text-xs text-muted-foreground'>
                    a.n. {account.bankAccountHolder}
                </p>
            )}
        </div>
    );
}

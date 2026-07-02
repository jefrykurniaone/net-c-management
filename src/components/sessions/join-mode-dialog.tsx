'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

function money(n: number): string {
    return `Rp ${n.toLocaleString('id-ID')}`;
}

interface JoinModeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    monthlyFee: number;
    sessionFee: number;
    loading: boolean;
    onMonthly: () => void;
    onPerSession: () => void;
}

/**
 * Mode choice at the moment of joining a session (not buried in the profile).
 * Registering free = Monthly; going to the pay page = Per-session. The server
 * persists the chosen mode on register/pay (adoptModeIfUnselected).
 */
export function JoinModeDialog({
    open,
    onOpenChange,
    monthlyFee,
    sessionFee,
    loading,
    onMonthly,
    onPerSession,
}: Readonly<JoinModeDialogProps>) {
    const { locale } = useLocale();
    const t = getDictionary(locale);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-sm'>
                <DialogHeader>
                    <DialogTitle>{t.sessions.joinDialogTitle}</DialogTitle>
                </DialogHeader>
                <p className='text-sm text-muted-foreground'>
                    {t.sessions.joinDialogDesc}
                </p>
                <div className='grid gap-3'>
                    <ModeOption
                        label={t.paymentMode.monthly}
                        desc={t.sessions.joinMonthlyDesc}
                        fee={`${money(monthlyFee)}${t.paymentMode.perMonthSuffix}`}
                        disabled={loading}
                        onSelect={onMonthly}
                    />
                    <ModeOption
                        label={t.paymentMode.perSession}
                        desc={t.sessions.joinPerSessionDesc}
                        fee={`${money(sessionFee)}${t.paymentMode.perSessionSuffix}`}
                        disabled={loading}
                        onSelect={onPerSession}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ModeOption({
    label,
    desc,
    fee,
    disabled,
    onSelect,
}: Readonly<{
    label: string;
    desc: string;
    fee: string;
    disabled: boolean;
    onSelect: () => void;
}>) {
    return (
        <button
            type='button'
            onClick={onSelect}
            disabled={disabled}
            className={`min-h-[44px] rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5 ${
                disabled ? 'opacity-60' : ''
            }`}>
            <span className='block text-sm font-medium text-foreground'>
                {label}
            </span>
            <span className='block text-xs text-muted-foreground'>{desc}</span>
            <span className='mt-1 block text-sm font-semibold tabular-nums text-foreground'>
                {fee}
            </span>
        </button>
    );
}

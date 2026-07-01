'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PaymentMode, PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** A session with no fee has nothing to charge, regardless of payment mode. */
const MIN_SESSION_FEE = 1;

interface RSVPButtonProps {
    sessionId: string;
    isRegistered: boolean;
    isFull: boolean;
    isCancelled: boolean;
    isCompleted: boolean;
    paymentMode: PaymentMode | null;
    sessionFee: number;
    sessionPaymentStatus: PaymentStatus | null;
}

export function RSVPButton({
    sessionId,
    isRegistered,
    isFull,
    isCancelled,
    isCompleted,
    paymentMode,
    sessionFee,
    sessionPaymentStatus,
}: Readonly<RSVPButtonProps>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);

    async function cancelRegistration(): Promise<void> {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.sessions.toastCancelError);
            }
            toast.success(t.sessions.toastCancelSuccess);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    async function registerFree(): Promise<void> {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
                method: 'POST',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.sessions.toastRegisterError);
            }
            toast.success(t.sessions.toastRegisterSuccess);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    if (isCancelled) {
        return <DisabledCta label={t.sessions.sessionCancelled} />;
    }
    if (isCompleted) {
        return <DisabledCta label={t.sessions.sessionCompleted} />;
    }

    // A fee-0 session has nothing to charge — everyone registers free. Otherwise
    // only a MONTHLY member registers free; a non-member / no-mode-selected
    // member (null) isn't offered the pay CTA either — there's no valid path.
    const isFreeEligible = paymentMode === 'MONTHLY' || sessionFee < MIN_SESSION_FEE;

    if (!isFreeEligible && paymentMode === null) {
        return <DisabledCta label={t.sessions.payRequired} />;
    }

    // Per-session members pay to secure a slot — never free.
    if (!isFreeEligible) {
        return (
            <PerSessionCta
                sessionId={sessionId}
                isRegistered={isRegistered}
                isFull={isFull}
                sessionFee={sessionFee}
                status={sessionPaymentStatus}
                loading={loading}
                onCancel={cancelRegistration}
                t={t}
            />
        );
    }

    if (!isRegistered && isFull) {
        return <DisabledCta label={t.sessions.sessionFull} />;
    }

    return (
        <Button
            onClick={isRegistered ? cancelRegistration : registerFree}
            loading={loading}
            variant={isRegistered ? 'outline' : 'default'}
            className={
                isRegistered
                    ? 'w-full text-destructive hover:bg-destructive/10'
                    : 'w-full'
            }>
            {isRegistered ? t.sessions.cancelRegistration : t.sessions.register}
        </Button>
    );
}

function DisabledCta({ label }: Readonly<{ label: string }>) {
    return (
        <Button disabled variant='outline' className='w-full'>
            {label}
        </Button>
    );
}

interface PerSessionCtaProps {
    sessionId: string;
    isRegistered: boolean;
    isFull: boolean;
    sessionFee: number;
    status: PaymentStatus | null;
    loading: boolean;
    onCancel: () => void;
    t: ReturnType<typeof getDictionary>;
}

function PerSessionCta({
    sessionId,
    isRegistered,
    isFull,
    sessionFee,
    status,
    loading,
    onCancel,
    t,
}: Readonly<PerSessionCtaProps>) {
    const payHref = `/sessions/${sessionId}/pay`;
    const feeLabel = `Rp ${sessionFee.toLocaleString('id-ID')}`;

    if (isRegistered && status === 'CONFIRMED') {
        return (
            <p className='text-sm font-medium text-success text-center py-2'>
                {t.sessions.registeredPaid}
            </p>
        );
    }

    // A reject deletes the Attendance row, so isRegistered is already false by
    // the time status is REJECTED — check status alone, not isRegistered too.
    if (status === 'REJECTED') {
        return (
            <div className='space-y-2'>
                <p className='text-sm font-medium text-destructive text-center'>
                    {t.sessions.paymentRejected}
                </p>
                <Link href={payHref}>
                    <Button className='w-full'>
                        {t.sessions.registerAndPay} · <span className='tabular-nums'>{feeLabel}</span>
                    </Button>
                </Link>
            </div>
        );
    }

    if (isRegistered) {
        return (
            <div className='space-y-2'>
                <p className='text-sm font-medium text-warning text-center'>
                    {t.sessions.registeredPending}
                </p>
                <Button
                    onClick={onCancel}
                    loading={loading}
                    variant='outline'
                    className='w-full text-destructive hover:bg-destructive/10'>
                    {t.sessions.cancelRegistration}
                </Button>
            </div>
        );
    }

    if (isFull) {
        return <DisabledCta label={t.sessions.sessionFull} />;
    }

    return (
        <Link href={payHref}>
            <Button className='w-full'>
                {t.sessions.registerAndPay} · <span className='tabular-nums'>{feeLabel}</span>
            </Button>
        </Link>
    );
}

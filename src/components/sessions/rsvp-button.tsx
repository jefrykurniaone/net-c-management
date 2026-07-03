'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PaymentMode, PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { JoinModeDialog } from '@/components/sessions/join-mode-dialog';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary } from '@/lib/i18n/dictionaries';

/** A session with no fee has nothing to charge, regardless of payment mode. */
const MIN_SESSION_FEE = 1;

interface RSVPButtonProps {
    sessionId: string;
    activityId: string;
    isRegistered: boolean;
    isFull: boolean;
    isCancelled: boolean;
    isCompleted: boolean;
    paymentMode: PaymentMode | null;
    sessionFee: number;
    monthlyFee: number;
    hasMonthlyPaid: boolean;
    sessionPaymentStatus: PaymentStatus | null;
    sessionPaymentNotes: string | null;
}

export function RSVPButton({
    sessionId,
    activityId,
    isRegistered,
    isFull,
    isCancelled,
    isCompleted,
    paymentMode,
    sessionFee,
    monthlyFee,
    hasMonthlyPaid,
    sessionPaymentStatus,
    sessionPaymentNotes,
}: Readonly<RSVPButtonProps>) {
    const router = useRouter();
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [loading, setLoading] = useState(false);
    const [modeDialogOpen, setModeDialogOpen] = useState(false);

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

    // Joining Monthly = pay dues first; the upload path joins the Activity,
    // adopts the mode, and auto-registers the member for the month's sessions.
    async function chooseMonthly(): Promise<void> {
        setLoading(true);
        try {
            const join = await fetch('/api/users/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId, action: 'join' }),
            });
            if (!join.ok) throw new Error(t.activity.actionFailed);
            const mode = await fetch(`/api/users/memberships/${activityId}/mode`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'MONTHLY' }),
            });
            if (!mode.ok) throw new Error(t.activity.actionFailed);
            router.push('/payments/upload');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
            setLoading(false);
        }
    }

    if (isCancelled) {
        return <DisabledCta label={t.sessions.sessionCancelled} />;
    }
    if (isCompleted) {
        return <DisabledCta label={t.sessions.sessionCompleted} />;
    }

    // A fee-0 session has nothing to charge — everyone registers free. A seat
    // on a paid session always has money behind it: a MONTHLY member may only
    // register once this period's dues are uploaded/confirmed; per-session
    // members pre-pay; a null mode picks the mode right here at join time.
    const isFreeEligible =
        sessionFee < MIN_SESSION_FEE ||
        (paymentMode === 'MONTHLY' && hasMonthlyPaid);

    // Monthly member with unpaid dues: route to the dues upload first. Paying
    // auto-registers them for every session of the month, including this one.
    if (!isFreeEligible && paymentMode === 'MONTHLY') {
        if (isRegistered) {
            return (
                <Button
                    onClick={cancelRegistration}
                    loading={loading}
                    variant='outline'
                    className='w-full text-destructive hover:bg-destructive/10'>
                    {t.sessions.cancelRegistration}
                </Button>
            );
        }
        return (
            <Link href='/payments/upload'>
                <Button className='w-full'>
                    {t.sessions.payMonthlyFirst} ·{' '}
                    <span className='tabular-nums'>
                        Rp {monthlyFee.toLocaleString('id-ID')}
                    </span>
                </Button>
            </Link>
        );
    }

    if (!isFreeEligible && paymentMode === null) {
        if (isRegistered) {
            return (
                <Button
                    onClick={cancelRegistration}
                    loading={loading}
                    variant='outline'
                    className='w-full text-destructive hover:bg-destructive/10'>
                    {t.sessions.cancelRegistration}
                </Button>
            );
        }
        if (isFull) {
            return <DisabledCta label={t.sessions.sessionFull} />;
        }
        return (
            <>
                <Button
                    onClick={() => setModeDialogOpen(true)}
                    loading={loading}
                    className='w-full'>
                    {t.sessions.register}
                </Button>
                <JoinModeDialog
                    open={modeDialogOpen}
                    onOpenChange={setModeDialogOpen}
                    monthlyFee={monthlyFee}
                    sessionFee={sessionFee}
                    loading={loading}
                    onMonthly={chooseMonthly}
                    onPerSession={() =>
                        router.push(`/sessions/${sessionId}/pay`)
                    }
                />
            </>
        );
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
                rejectNotes={sessionPaymentNotes}
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
    rejectNotes: string | null;
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
    rejectNotes,
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
                {rejectNotes && (
                    <p className='text-xs text-destructive text-center'>
                        {t.payments.rejectReason}: {rejectNotes}
                    </p>
                )}
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

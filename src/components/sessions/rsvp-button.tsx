'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PaymentMode, PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { JoinModeDialog } from '@/components/sessions/join-mode-dialog';
import { DisabledCta, PerSessionCta } from '@/components/sessions/per-session-cta';
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
    allowsBothModes: boolean;
    sessionFee: number;
    monthlyFee: number;
    hasMonthlyPaid: boolean;
    sessionPaymentStatus: PaymentStatus | null;
    sessionPaymentNotes: string | null;
    adminWhatsapp: string;
}

export function RSVPButton({
    sessionId,
    activityId,
    isRegistered,
    isFull,
    isCancelled,
    isCompleted,
    paymentMode,
    allowsBothModes,
    sessionFee,
    monthlyFee,
    hasMonthlyPaid,
    sessionPaymentStatus,
    sessionPaymentNotes,
    adminWhatsapp,
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

    // Ensure membership, persist the chosen mode (the server decides whether it
    // applies this period or queues for the next), then continue to `next`.
    // Registering through a payment path IS the mode choice — there is no
    // selector in the profile anymore.
    async function chooseMode(mode: PaymentMode, next: string): Promise<void> {
        setLoading(true);
        try {
            const join = await fetch('/api/users/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activityId, action: 'join' }),
            });
            if (!join.ok) throw new Error(t.activity.actionFailed);
            const res = await fetch(`/api/users/memberships/${activityId}/mode`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            if (!res.ok) throw new Error(t.activity.actionFailed);
            router.push(next);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
            setLoading(false);
        }
    }

    // Joining Monthly = pay dues first; paying auto-registers the member for
    // the month's sessions. Per-session = pre-pay this session's fee.
    const chooseMonthly = () => chooseMode('MONTHLY', '/payments/upload');
    const choosePerSession = () =>
        chooseMode('PER_SESSION', `/sessions/${sessionId}/pay`);

    // A member who has not paid anything this period may still switch modes
    // right here (the server applies it immediately); once a payment is in,
    // the server queues the switch for the next period instead.
    const modeSwitch = allowsBothModes && (
        <>
            <Button
                variant='ghost'
                size='sm'
                disabled={loading}
                onClick={() => setModeDialogOpen(true)}
                className='w-full text-xs text-muted-foreground'>
                {t.sessions.changePaymentMode}
            </Button>
            <JoinModeDialog
                open={modeDialogOpen}
                onOpenChange={setModeDialogOpen}
                monthlyFee={monthlyFee}
                sessionFee={sessionFee}
                loading={loading}
                onMonthly={chooseMonthly}
                onPerSession={choosePerSession}
            />
        </>
    );

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
            <div className='space-y-2'>
                <Link href='/payments/upload'>
                    <Button className='w-full'>
                        {t.sessions.payMonthlyFirst} ·{' '}
                        <span className='tabular-nums'>
                            Rp {monthlyFee.toLocaleString('id-ID')}
                        </span>
                    </Button>
                </Link>
                {modeSwitch}
            </div>
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
                    onPerSession={choosePerSession}
                />
            </>
        );
    }

    // Per-session members pay to secure a slot — never free. A live payment
    // (pending or confirmed) locks the mode for the period, so the switch
    // affordance only shows while nothing has been paid for this session.
    if (!isFreeEligible) {
        const hasLiveSessionPayment =
            sessionPaymentStatus === 'PENDING' ||
            sessionPaymentStatus === 'CONFIRMED';
        return (
            <div className='space-y-2'>
                <PerSessionCta
                    sessionId={sessionId}
                    isRegistered={isRegistered}
                    isFull={isFull}
                    sessionFee={sessionFee}
                    status={sessionPaymentStatus}
                    rejectNotes={sessionPaymentNotes}
                    adminWhatsapp={adminWhatsapp}
                    loading={loading}
                    onCancel={cancelRegistration}
                    t={t}
                />
                {!isRegistered && !hasLiveSessionPayment && modeSwitch}
            </div>
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

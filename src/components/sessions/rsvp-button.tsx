'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AttendanceStatus, PaymentMode, PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { JoinModeDialog } from '@/components/sessions/join-mode-dialog';
import { RsvpChoice, type RsvpChoiceValue } from '@/components/sessions/rsvp-choice';
import { DisabledCta, PerSessionCta } from '@/components/sessions/per-session-cta';
import { HoldCountdown } from '@/components/payments/hold-countdown';
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
    isRsvpClosed: boolean;
    isFreeSession: boolean;
    rsvpStatus: AttendanceStatus | null;
    paymentMode: PaymentMode | null;
    allowsBothModes: boolean;
    sessionFee: number;
    monthlyFee: number;
    hasMonthlyPaid: boolean;
    sessionPaymentStatus: PaymentStatus | null;
    sessionPaymentNotes: string | null;
    /** ISO instant this member's reservation hold lapses, or null when none. */
    holdExpiresAtISO: string | null;
    adminWhatsapp: string;
}

export function RSVPButton({
    sessionId,
    activityId,
    isRegistered,
    isFull,
    isCancelled,
    isCompleted,
    isRsvpClosed,
    isFreeSession,
    rsvpStatus,
    paymentMode,
    allowsBothModes,
    sessionFee,
    monthlyFee,
    hasMonthlyPaid,
    sessionPaymentStatus,
    sessionPaymentNotes,
    holdExpiresAtISO,
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

    // Tentative RSVP — a "maybe" holds no seat and costs nothing, so it is only
    // offered on free sessions. The route reads the intent from the body.
    async function markMaybe(): Promise<void> {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intent: 'MAYBE' }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? t.sessions.toastRegisterError);
            }
            toast.success(t.sessions.toastMaybeSuccess);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

    // Reserve-then-pay: hold the seat now (join-on-reserve + adopt the chosen
    // mode server-side) and go settle the bill the server hands back. A
    // free-eligible seat returns no payUrl — just refresh to show the RSVP.
    async function reserve(mode: PaymentMode): Promise<void> {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? t.sessions.toastRegisterError);
            if (data.payUrl) {
                router.push(data.payUrl);
                return;
            }
            toast.success(t.sessions.toastRegisterSuccess);
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
            setLoading(false);
        }
    }

    // Monthly = reserve, then pay this period's dues (which registers the member
    // for the month). Per-session = reserve, then pre-pay this session's fee.
    const chooseMonthly = () => reserve('MONTHLY');
    const choosePerSession = () => reserve('PER_SESSION');

    // CHANGE an already-selected mode. This must hit the dedicated switch route
    // (resolveSwitch: applies immediately while unpaid, queues to next period
    // once a payment is in) — the reserve path only adopts a mode when NONE is
    // selected (adoptModeIfUnselected), so it silently no-ops on a real change.
    async function switchMode(mode: PaymentMode): Promise<void> {
        setModeDialogOpen(false);
        setLoading(true);
        try {
            const res = await fetch(`/api/users/memberships/${activityId}/mode`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? t.common.error);
            // A switch on an already-paid period is queued for the next period
            // (current-period immutability) — say so, or it reads as a no-op since
            // the CTA price stays the same for this period.
            const isQueued =
                data.pendingMode === mode &&
                data.pendingEffectiveFrom &&
                data.paymentMode !== mode;
            if (isQueued) {
                const key: number = data.pendingEffectiveFrom;
                const label = mode === 'MONTHLY' ? t.paymentMode.monthly : t.paymentMode.perSession;
                const period = `${t.months[key % 100]} ${Math.floor(key / 100)}`;
                toast.success(
                    t.sessions.toastModeQueued
                        .replace('{mode}', label)
                        .replace('{period}', period),
                );
            } else {
                toast.success(t.sessions.toastModeSwitched);
            }
            router.refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t.common.error);
        } finally {
            setLoading(false);
        }
    }

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
                onMonthly={() => switchMode('MONTHLY')}
                onPerSession={() => switchMode('PER_SESSION')}
            />
        </>
    );

    if (isCancelled) {
        return <DisabledCta label={t.sessions.sessionCancelled} />;
    }
    if (isCompleted) {
        return <DisabledCta label={t.sessions.sessionCompleted} />;
    }
    // Past the RSVP deadline the seat/intent is frozen — nobody joins, leaves,
    // or switches. Members keep seeing their standing via the players list.
    if (isRsvpClosed) {
        return <DisabledCta label={t.sessions.rsvpClosed} />;
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
            // A reserved-but-unpaid seat is a live hold — same countdown as the
            // per-session flow, with the dues upload as the settle path.
            return (
                <div className='space-y-2'>
                    {holdExpiresAtISO && (
                        <p className='text-sm font-medium text-warning text-center'>
                            <HoldCountdown
                                iso={holdExpiresAtISO}
                                template={t.sessions.reservedPayWithin}
                                expiredLabel={t.sessions.holdExpired}
                            />
                        </p>
                    )}
                    {holdExpiresAtISO && (
                        <Button
                            onClick={chooseMonthly}
                            loading={loading}
                            className='w-full'>
                            {t.sessions.payMonthlyFirst} ·{' '}
                            <span className='tabular-nums'>
                                Rp {monthlyFee.toLocaleString('id-ID')}
                            </span>
                        </Button>
                    )}
                    <Button
                        onClick={cancelRegistration}
                        loading={loading}
                        variant='outline'
                        className='w-full text-destructive hover:bg-destructive/10'>
                        {t.sessions.cancelRegistration}
                    </Button>
                </div>
            );
        }
        // A full session has no seat to claim — the register CTA would only 409
        // server-side, so surface the "full" state up front instead.
        if (isFull) {
            return <DisabledCta label={t.sessions.sessionFull} />;
        }
        return (
            <div className='space-y-2'>
                <Button
                    onClick={chooseMonthly}
                    loading={loading}
                    className='w-full'>
                    {t.sessions.registerAndPay} ·{' '}
                    <span className='tabular-nums'>
                        Rp {monthlyFee.toLocaleString('id-ID')}
                    </span>
                </Button>
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
                    holdExpiresAtISO={holdExpiresAtISO}
                    onReserve={choosePerSession}
                    onCancel={cancelRegistration}
                    t={t}
                />
                {!isRegistered && !hasLiveSessionPayment && modeSwitch}
            </div>
        );
    }

    // Free-eligible: seat costs nothing (fee-0 session, or a monthly member whose
    // dues are in). Rendered as the segmented Going / (Maybe) / Can't-make-it
    // control from the design. "Maybe" is only offered on truly free sessions,
    // where a tentative RSVP holds no seat and owes nothing.
    const active: RsvpChoiceValue = isRegistered
        ? 'GOING'
        : rsvpStatus === 'MAYBE'
          ? 'MAYBE'
          : 'NONE';

    return (
        <RsvpChoice
            active={active}
            showMaybe={isFreeSession}
            disabled={loading}
            goingDisabled={isFull}
            labels={{
                going: t.sessions.going,
                maybe: t.sessions.maybe,
                cantMakeIt: t.sessions.cantMakeIt,
            }}
            onGoing={registerFree}
            onMaybe={markMaybe}
            onCancel={cancelRegistration}
        />
    );
}

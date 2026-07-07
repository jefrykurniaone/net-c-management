'use client';

import Link from 'next/link';
import type { PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { WhatsappButton } from '@/components/sessions/whatsapp-button';
import { HoldCountdown } from '@/components/payments/hold-countdown';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function DisabledCta({ label }: Readonly<{ label: string }>) {
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
    adminWhatsapp: string;
    loading: boolean;
    /** ISO instant the reservation hold lapses, or null when there is none. */
    holdExpiresAtISO: string | null;
    onReserve: () => void;
    onCancel: () => void;
    t: Dictionary;
}

export function PerSessionCta({
    sessionId,
    isRegistered,
    isFull,
    sessionFee,
    status,
    rejectNotes,
    adminWhatsapp,
    loading,
    holdExpiresAtISO,
    onReserve,
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
                <p className='text-xs text-warning text-center'>
                    {t.payments.rejectedRefundWarning}
                </p>
                {adminWhatsapp && (
                    <WhatsappButton
                        phone={adminWhatsapp}
                        label={t.sessions.contactAdmin}
                    />
                )}
                <Button onClick={onReserve} loading={loading} className='w-full'>
                    {t.sessions.registerAndPay} ·{' '}
                    <span className='tabular-nums'>{feeLabel}</span>
                </Button>
            </div>
        );
    }

    // Proof uploaded, awaiting admin confirmation.
    if (isRegistered && status === 'PENDING') {
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

    // Registered with nothing paid yet = an active reservation hold: route the
    // member to settle it before the seat is released.
    if (isRegistered) {
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
                <Link href={payHref}>
                    <Button className='w-full'>
                        {t.sessions.payNow} ·{' '}
                        <span className='tabular-nums'>{feeLabel}</span>
                    </Button>
                </Link>
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
        <Button onClick={onReserve} loading={loading} className='w-full'>
            {t.sessions.registerAndPay} ·{' '}
            <span className='tabular-nums'>{feeLabel}</span>
        </Button>
    );
}

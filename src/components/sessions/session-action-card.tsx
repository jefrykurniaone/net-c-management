import type { AttendanceStatus, PaymentMode, PaymentStatus } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { RSVPButton } from './rsvp-button';
import { WhatsappButton } from './whatsapp-button';

/**
 * The session detail page's action card: claim, withdraw, pay, or — where none
 * of those apply — the sentence saying why (`RSVPButton`'s own disabled states
 * already carry that sentence).
 */

const CARD_CLASS = 'rounded-xl bg-card shadow-lift p-block space-y-3';

export interface SessionActionCardData {
    readonly sessionId: string;
    readonly activityId: string;
    readonly isRegistered: boolean;
    readonly isFull: boolean;
    readonly isCancelled: boolean;
    readonly isCompleted: boolean;
    readonly isRsvpClosed: boolean;
    readonly isFreeSession: boolean;
    readonly rsvpStatus: AttendanceStatus | null;
    readonly paymentMode: PaymentMode | null;
    readonly allowsBothModes: boolean;
    readonly sessionFee: number;
    readonly duesAmount: number;
    readonly hasMonthlyPaid: boolean;
    readonly sessionPaymentStatus: PaymentStatus | null;
    readonly sessionPaymentNotes: string | null;
    readonly holdExpiresAtISO: string | null;
    readonly adminWhatsapp: string;
    /** A Dues member's own withdrawal that forfeited this Session (ADR: Dues
     *  buy availability for the month, not a per-Session credit). */
    readonly hasForfeitedSeat: boolean;
    /** A queued payment-mode switch not yet in effect for this Period. */
    readonly pendingSwitchNote: string | null;
    readonly rsvpCloseLabel: string;
}

export function SessionActionCard({
    data,
    t,
}: Readonly<{ data: SessionActionCardData; t: Dictionary }>) {
    return (
        <div className={CARD_CLASS}>
            <div className='flex items-baseline justify-between gap-2'>
                <h2 className='type-title text-card-foreground'>
                    {t.sessions.areYouPlaying}
                </h2>
                <span className='shrink-0 type-caption text-muted-foreground'>
                    {t.sessions.rsvpCloses} {data.rsvpCloseLabel}
                </span>
            </div>
            <RSVPButton
                sessionId={data.sessionId}
                activityId={data.activityId}
                isRegistered={data.isRegistered}
                isFull={data.isFull && !data.isRegistered}
                isCancelled={data.isCancelled}
                isCompleted={data.isCompleted}
                isRsvpClosed={data.isRsvpClosed}
                isFreeSession={data.isFreeSession}
                rsvpStatus={data.rsvpStatus}
                paymentMode={data.paymentMode}
                allowsBothModes={data.allowsBothModes}
                sessionFee={data.sessionFee}
                duesAmount={data.duesAmount}
                hasMonthlyPaid={data.hasMonthlyPaid}
                sessionPaymentStatus={data.sessionPaymentStatus}
                sessionPaymentNotes={data.sessionPaymentNotes}
                holdExpiresAtISO={data.holdExpiresAtISO}
                adminWhatsapp={data.adminWhatsapp}
            />
            {data.hasForfeitedSeat && (
                <p className='text-center type-caption text-muted-foreground'>
                    {t.sessions.duesForfeited}
                </p>
            )}
            {data.pendingSwitchNote && (
                <p className='text-center type-caption text-muted-foreground'>
                    {data.pendingSwitchNote}
                </p>
            )}
            {data.adminWhatsapp && (
                <WhatsappButton
                    phone={data.adminWhatsapp}
                    label={t.sessions.contactAdmin}
                />
            )}
        </div>
    );
}

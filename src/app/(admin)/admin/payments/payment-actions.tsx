'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { ConfirmPaymentDialog } from './payment-confirm-dialog';
import { RejectPaymentDialog } from './payment-reject-dialog';
import type { PaymentFacts } from './payment-facts';

/**
 * The Admin's decision on one Payment, taken from its own row. Both acts go
 * through a dialog: this is the surface where the community's money is settled,
 * and the two buttons sit a few pixels apart down forty rows.
 *
 * The controls are plain buttons in the row's DOM order, so Tab reaches them
 * after that row's Proof and Enter presses them. There is no single-key
 * shortcut anywhere here — a one-key Confirm on a money row is a mis-press
 * waiting to happen, and tab order already meets "no mouse".
 */

type Decision = 'CONFIRMED' | 'REJECTED';

export type PaymentActionsProps = Readonly<{
    id: string;
    memberName: string;
    activityName: string;
    month: number;
    year: number;
    amount: number;
    /** Activity Dues for monthly, the Session's own Fee for per-Session. */
    currentPrice: number | null;
    isMonthly: boolean;
}>;

function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

function periodLabel(t: Dictionary, month: number, year: number): string {
    return `${t.months[month]} ${year}`;
}

/**
 * What the Confirm dialog says when the amount is short. Null where it is not,
 * or where there is no current figure to compare against.
 */
function shortfallNoteOf(
    t: Dictionary,
    payment: PaymentActionsProps,
): string | null {
    const { currentPrice, amount, isMonthly } = payment;
    if (currentPrice === null || amount >= currentPrice) {
        return null;
    }
    const template = isMonthly
        ? t.admin.confirmBelowDues
        : t.admin.confirmBelowFee;
    return template.replace('{amount}', rupiah(currentPrice));
}

/** What Rejecting monthly Dues does to the member's Seats, said beforehand. */
function seatNoteOf(t: Dictionary, payment: PaymentActionsProps): string | null {
    if (!payment.isMonthly) {
        return null;
    }
    return t.admin.rejectSeatConsequence
        .replace('{activity}', payment.activityName)
        .replace('{period}', periodLabel(t, payment.month, payment.year));
}

function factsOf(t: Dictionary, payment: PaymentActionsProps): PaymentFacts {
    return {
        memberName: payment.memberName,
        activityName: payment.activityName,
        periodLabel: periodLabel(t, payment.month, payment.year),
        amountLabel: rupiah(payment.amount),
    };
}

/**
 * The write itself. Reports whether the row was decided, so the caller closes
 * the dialog only on a decision — a refused write leaves the Admin's typed
 * reason where they can fix it rather than making them start again.
 */
function usePaymentDecision(paymentId: string, t: Dictionary) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function decide(status: Decision, notes?: string): Promise<boolean> {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/payments/${paymentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes }),
            });
            if (!res.ok) {
                toast.error(t.admin.paymentUpdateFailed);
                return false;
            }
            toast.success(
                status === 'CONFIRMED'
                    ? t.admin.paymentConfirmed
                    : t.admin.paymentRejected,
            );
            router.refresh();
            return true;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { isSubmitting, decide };
}

/** The row's two controls, in the order the decision is made in. */
function DecisionButtons({
    t,
    onAsk,
}: Readonly<{ t: Dictionary; onAsk: (decision: Decision) => void }>) {
    return (
        <>
            <Button size='sm' onClick={() => onAsk('CONFIRMED')}>
                {t.admin.confirmBtn}
            </Button>
            <Button
                variant='destructive-outline'
                size='sm'
                onClick={() => onAsk('REJECTED')}>
                {t.admin.rejectBtn}
            </Button>
        </>
    );
}

export function PaymentActions(payment: PaymentActionsProps) {
    const { locale } = useLocale();
    const t = getDictionary(locale);
    const [asking, setAsking] = useState<Decision | null>(null);
    const { isSubmitting, decide } = usePaymentDecision(payment.id, t);

    async function run(status: Decision, notes?: string) {
        if (await decide(status, notes)) {
            setAsking(null);
        }
    }

    const facts = factsOf(t, payment);
    return (
        <>
            <DecisionButtons t={t} onAsk={setAsking} />
            <ConfirmPaymentDialog
                open={asking === 'CONFIRMED'}
                onOpenChange={(open) => setAsking(open ? 'CONFIRMED' : null)}
                t={t}
                facts={facts}
                shortfallNote={shortfallNoteOf(t, payment)}
                isSubmitting={isSubmitting}
                onConfirm={() => run('CONFIRMED')}
            />
            <RejectPaymentDialog
                open={asking === 'REJECTED'}
                onOpenChange={(open) => setAsking(open ? 'REJECTED' : null)}
                t={t}
                facts={facts}
                seatNote={seatNoteOf(t, payment)}
                isSubmitting={isSubmitting}
                onReject={(reason) => run('REJECTED', reason)}
            />
        </>
    );
}

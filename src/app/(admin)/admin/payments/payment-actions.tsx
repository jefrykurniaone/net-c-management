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
import { billingPeriodLabel, rupiah } from './payment-format';

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
    /**
     * What this Payment's own Billing Period charged: the Activity's Dues Rate
     * for that Period on a monthly one, the Session's own Fee on a per-Session
     * one. Never today's figure — `src/lib/payment-price.ts` decides it.
     */
    expectedPrice: number | null;
    isMonthly: boolean;
}>;

/**
 * What the Confirm dialog says when the amount is short of what the Payment's
 * Period charged. Null where it is not, and null where there is no figure to
 * compare against at all — a note against a guess is worse than no note.
 */
function shortfallNoteOf(
    t: Dictionary,
    payment: PaymentActionsProps,
): string | null {
    const { expectedPrice, amount, isMonthly } = payment;
    if (expectedPrice === null || amount >= expectedPrice) {
        return null;
    }
    const template = isMonthly
        ? t.admin.confirmBelowDues
        : t.admin.confirmBelowFee;
    return template.replace('{amount}', rupiah(expectedPrice));
}

/** What Rejecting monthly Dues does to the member's Seats, said beforehand. */
function seatNoteOf(t: Dictionary, payment: PaymentActionsProps): string | null {
    if (!payment.isMonthly) {
        return null;
    }
    return t.admin.rejectSeatConsequence
        .replace('{activity}', payment.activityName)
        .replace('{period}', billingPeriodLabel(t, payment.month, payment.year));
}

function factsOf(t: Dictionary, payment: PaymentActionsProps): PaymentFacts {
    return {
        memberName: payment.memberName,
        activityName: payment.activityName,
        periodLabel: billingPeriodLabel(t, payment.month, payment.year),
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
        } catch {
            // Offline, DNS, an aborted request: the dialog stays open with the
            // Admin's typed reason in it, and says so. Silence here would read
            // as a decision that went through.
            toast.error(t.admin.paymentUpdateFailed);
            return false;
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

type DecisionDialogsProps = Readonly<{
    asking: Decision | null;
    t: Dictionary;
    payment: PaymentActionsProps;
    facts: PaymentFacts;
    isSubmitting: boolean;
    onClose: () => void;
    onRun: (status: Decision, notes?: string) => void;
}>;

/**
 * Mounted only while open, so a dialog's own state — the Reject reason and its
 * refusal — lives exactly as long as the dialog does. A decision closes the
 * dialog by dropping it rather than through `onOpenChange`, and state that
 * outlived it would come back pre-filled the next time the Admin opened Reject.
 */
function DecisionDialogs({
    asking,
    t,
    payment,
    facts,
    isSubmitting,
    onClose,
    onRun,
}: DecisionDialogsProps) {
    if (asking === 'CONFIRMED') {
        return (
            <ConfirmPaymentDialog
                open
                onOpenChange={onClose}
                t={t}
                facts={facts}
                shortfallNote={shortfallNoteOf(t, payment)}
                isSubmitting={isSubmitting}
                onConfirm={() => onRun('CONFIRMED')}
            />
        );
    }
    if (asking === 'REJECTED') {
        return (
            <RejectPaymentDialog
                open
                onOpenChange={onClose}
                t={t}
                facts={facts}
                seatNote={seatNoteOf(t, payment)}
                isSubmitting={isSubmitting}
                onReject={(reason) => onRun('REJECTED', reason)}
            />
        );
    }
    return null;
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

    return (
        <>
            <DecisionButtons t={t} onAsk={setAsking} />
            <DecisionDialogs
                asking={asking}
                t={t}
                payment={payment}
                facts={factsOf(t, payment)}
                isSubmitting={isSubmitting}
                onClose={() => setAsking(null)}
                onRun={run}
            />
        </>
    );
}

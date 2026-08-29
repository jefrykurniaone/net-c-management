import type { Locale as DateFnsLocale } from 'date-fns';
import { StateMark } from '@/components/ui/mark';
import type { RegisterColumn } from '@/components/admin/register-columns';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { paymentState } from '@/lib/status-mark';
import { PaymentActions } from './payment-actions';
import { PaymentProof, type ProofLabels } from './payment-proof';
import {
    billingPeriodLabel,
    currentPriceOf,
    paymentMemberLabel,
    PaymentActivity,
    PaymentAmount,
    PaymentDecided,
    PaymentMember,
    PaymentPeriod,
    PaymentSent,
    type PaymentQueueRow,
} from './payment-cells';

/**
 * The queue's columns, in the order an Admin decides in: who sent it and what
 * for, the Proof itself, the figure to check against the bank statement, which
 * Billing Period it settles, where it stands, when it arrived, and the
 * decision. Position, rules and the collapse below `768px` are the register's;
 * only the values are described here.
 */

function proofLabelsFor(payment: PaymentQueueRow, t: Dictionary): ProofLabels {
    const name = paymentMemberLabel(payment);
    return {
        none: t.admin.proofNone,
        failed: t.admin.proofFailed,
        open: t.admin.proofOpen.replace('{name}', name),
        title: t.admin.proofDialogTitle.replace('{name}', name),
        caption: `${payment.activity.name} · ${billingPeriodLabel(payment, t)}`,
    };
}

/**
 * A row awaiting a decision carries the decision; a decided one carries only
 * when it was taken, because the standing column already says what.
 */
function PaymentDecision({
    payment,
    t,
    dateLocale,
}: Readonly<{
    payment: PaymentQueueRow;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    if (payment.status !== 'PENDING') {
        return <PaymentDecided payment={payment} t={t} dateLocale={dateLocale} />;
    }
    return (
        <PaymentActions
            id={payment.id}
            memberName={paymentMemberLabel(payment)}
            activityName={payment.activity.name}
            month={payment.month}
            year={payment.year}
            amount={payment.amount}
            currentPrice={currentPriceOf(payment)}
            isMonthly={payment.type === 'MONTHLY'}
        />
    );
}

/** Who, what for, and the Proof. */
function evidenceColumns(
    t: Dictionary,
): readonly RegisterColumn<PaymentQueueRow>[] {
    return [
        {
            key: 'member',
            head: t.admin.colMember,
            sortKey: 'member',
            render: (p) => <PaymentMember payment={p} />,
        },
        {
            key: 'activity',
            head: t.activity.label,
            render: (p) => <PaymentActivity payment={p} t={t} />,
        },
        {
            key: 'proof',
            head: t.admin.proof,
            render: (p) => (
                <PaymentProof
                    proofUrl={p.proofUrl}
                    labels={proofLabelsFor(p, t)}
                />
            ),
        },
    ];
}

/**
 * How much, and which Billing Period it settles. One amount column, not two:
 * the figure is the server's, so claimed and owed are the same number.
 */
function moneyColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<PaymentQueueRow>[] {
    return [
        {
            key: 'amount',
            head: t.admin.colAmount,
            kind: 'amount',
            sortKey: 'amount',
            render: (p) => <PaymentAmount payment={p} />,
        },
        {
            key: 'period',
            head: t.admin.colPeriod,
            sortKey: 'month',
            render: (p) => (
                <PaymentPeriod payment={p} t={t} dateLocale={dateLocale} />
            ),
        },
    ];
}

/** Where it stands, when it came, and the decision. */
function outcomeColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<PaymentQueueRow>[] {
    return [
        {
            key: 'standing',
            head: t.admin.colStatus,
            kind: 'standing',
            render: (p) => (
                <StateMark state={paymentState(p.status)} labels={t.marks} />
            ),
        },
        {
            key: 'sent',
            head: t.admin.colSent,
            kind: 'figure',
            sortKey: 'createdAt',
            render: (p) => (
                <PaymentSent payment={p} dateLocale={dateLocale} />
            ),
        },
        {
            key: 'actions',
            head: t.admin.colActions,
            kind: 'actions',
            render: (p) => (
                <PaymentDecision payment={p} t={t} dateLocale={dateLocale} />
            ),
        },
    ];
}

export function paymentColumns(
    t: Dictionary,
    dateLocale: DateFnsLocale,
): readonly RegisterColumn<PaymentQueueRow>[] {
    return [
        ...evidenceColumns(t),
        ...moneyColumns(t, dateLocale),
        ...outcomeColumns(t, dateLocale),
    ];
}

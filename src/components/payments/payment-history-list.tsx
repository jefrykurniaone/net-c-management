import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ExternalLink, MessageCircle } from 'lucide-react';
import type { PaymentStatus, PaymentType } from '@prisma/client';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { MarkedValue, StateMark } from '@/components/ui/mark';
import { paymentState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Rupiah is billed in whole units, and every amount in this product renders
 * the same way — proof-upload's convention (#54): `id-ID` grouping, no
 * subunits, tabular figures — so a column of amounts aligns down the page
 * whatever locale the UI itself is in.
 */
const RUPIAH_FORMAT = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
});

export interface HistoryPayment {
    id: string;
    amount: number;
    month: number;
    year: number;
    status: PaymentStatus;
    type: PaymentType;
    notes: string | null;
    proofUrl: string | null;
    createdAt: Date;
    activity: {
        name: string;
        adminWhatsapp: string | null;
    };
}

/**
 * Which of Dues or a per-Session Fee this Payment settles — CONTEXT.md's
 * exact vocabulary, never the stored `MONTHLY` / `SESSION` enum spelled out
 * to a member.
 */
function billingTypeLabel(type: PaymentType, t: Dictionary): string {
    return type === 'SESSION' ? t.payments.feeLabel : t.payments.duesLabel;
}

/**
 * The payments history, on the marks: a rule-bounded lattice, one row per
 * Payment sharing borders with its neighbours rather than sitting apart as
 * its own floating panel.
 */
export function PaymentHistoryList({
    payments,
    t,
    dateLocale,
}: Readonly<{
    payments: readonly HistoryPayment[];
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <div className='divide-y divide-rule overflow-hidden rounded-sm border border-rule bg-card'>
            {payments.map((payment) => (
                <PaymentHistoryRow
                    key={payment.id}
                    payment={payment}
                    t={t}
                    dateLocale={dateLocale}
                />
            ))}
        </div>
    );
}

/**
 * One Payment. Its standing is a mark from the resolver — never a coloured
 * badge — and its amount carries which of Dues or a Fee it is, and which
 * Billing Period it belongs to, in the same column every row shares.
 */
function PaymentHistoryRow({
    payment,
    t,
    dateLocale,
}: Readonly<{
    payment: HistoryPayment;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    const periodLabel = `${billingTypeLabel(payment.type, t)} · ${t.months[payment.month]} ${payment.year}`;

    return (
        <div className='flex items-start gap-cell p-block'>
            <ActivityInitial name={payment.activity.name} />
            <div className='min-w-0 flex-1'>
                <p className='type-title truncate text-card-foreground'>
                    {payment.activity.name}
                </p>
                <p className='type-caption text-secondary-foreground'>
                    {t.payments.submitted}{' '}
                    {format(new Date(payment.createdAt), 'MMM d', {
                        locale: dateLocale,
                    })}
                </p>
                {payment.status === 'REJECTED' && (
                    <RejectedPaymentNotice payment={payment} t={t} />
                )}
            </div>
            <PaymentStanding
                payment={payment}
                periodLabel={periodLabel}
                t={t}
            />
        </div>
    );
}

/**
 * What the Payment is worth, what period it settles, and where it stands. The
 * amount dims under a void state rather than being struck — the Strike mark
 * beside it carries the line.
 */
function PaymentStanding({
    payment,
    periodLabel,
    t,
}: Readonly<{
    payment: HistoryPayment;
    periodLabel: string;
    t: Dictionary;
}>) {
    const state = paymentState(payment.status);
    return (
        <div className='flex shrink-0 flex-col items-end gap-hair text-right'>
            <p className='type-label text-muted-foreground'>{periodLabel}</p>
            <MarkedValue
                state={state}
                className='type-figure tabular-nums text-card-foreground'>
                Rp {RUPIAH_FORMAT.format(payment.amount)}
            </MarkedValue>
            <StateMark state={state} labels={t.marks} />
            {payment.proofUrl && (
                <a
                    href={payment.proofUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='type-caption inline-flex items-center gap-hair text-primary hover:underline'>
                    <ExternalLink aria-hidden='true' className='size-3' />
                    {t.payments.viewProof}
                </a>
            )}
        </div>
    );
}

/**
 * A Rejected Payment is already unmistakable from its Strike mark — a real
 * line through the label, the value beside it dimmed. This notice only adds
 * what the member needs to act on it: why, and how to reach the admin — so it
 * stays in Secondary Ink rather than a surface-local status colour.
 */
function RejectedPaymentNotice({
    payment,
    t,
}: Readonly<{
    payment: Pick<HistoryPayment, 'notes' | 'activity'>;
    t: Dictionary;
}>) {
    return (
        <div className='mt-hair space-y-hair'>
            {payment.notes && (
                <p className='type-caption text-secondary-foreground'>
                    {t.payments.rejectReason}: {payment.notes}
                </p>
            )}
            <p className='type-caption text-secondary-foreground'>
                {t.payments.rejectedRefundWarning}
                {payment.activity.adminWhatsapp && (
                    <>
                        {' '}
                        <a
                            href={`https://wa.me/${payment.activity.adminWhatsapp.replace(/\D/g, '')}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center gap-hair font-medium text-primary hover:underline'>
                            <MessageCircle aria-hidden='true' className='size-3' />
                            {t.sessions.contactAdmin}
                        </a>
                    </>
                )}
            </p>
        </div>
    );
}

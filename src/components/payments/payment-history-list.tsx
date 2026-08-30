import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ExternalLink, MessageCircle } from 'lucide-react';
import type { PaymentStatus, PaymentType } from '@prisma/client';
import { ActivityInitial } from '@/components/activity/activity-badge';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { StatusChip, StatusValue } from '@/components/ui/chip';
import { paymentState } from '@/lib/status-chip';
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

interface PeriodGroup {
    month: number;
    year: number;
    payments: readonly HistoryPayment[];
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
 * Every Payment bucketed under the Billing Period it settles, most recent
 * Period first. Grouping is a display concern only — the query already
 * ordered payments `createdAt desc`, and that order survives inside each
 * bucket, so a group's own cards stay in the order the page fetched them.
 */
function groupByPeriod(
    payments: readonly HistoryPayment[],
): readonly PeriodGroup[] {
    const buckets = new Map<string, HistoryPayment[]>();
    for (const payment of payments) {
        const key = `${payment.year}-${payment.month}`;
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.push(payment);
        } else {
            buckets.set(key, [payment]);
        }
    }
    return [...buckets.values()]
        .map((bucket) => ({
            month: bucket[0].month,
            year: bucket[0].year,
            payments: bucket,
        }))
        .sort((a, b) => b.year - a.year || b.month - a.month);
}

/**
 * The payments history, on Rally cards: one card per Payment, grouped under
 * its Billing Period heading. Each surface draws its own card markup (the
 * owner decided against a shared card component); status is always read
 * through the shared resolver — no card here picks its own colour.
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
    const groups = groupByPeriod(payments);
    return (
        <div className='flex flex-col gap-bay'>
            {groups.map((group) => (
                <PeriodSection
                    key={`${group.year}-${group.month}`}
                    group={group}
                    t={t}
                    dateLocale={dateLocale}
                />
            ))}
        </div>
    );
}

/** One Billing Period: its heading, then every Payment it settles as a card. */
function PeriodSection({
    group,
    t,
    dateLocale,
}: Readonly<{
    group: PeriodGroup;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <section className='flex flex-col gap-block'>
            <h3 className='type-label text-muted-foreground'>
                {t.months[group.month]} {group.year}
            </h3>
            <div className='grid grid-cols-1 gap-block sm:grid-cols-2'>
                {group.payments.map((payment) => (
                    <PaymentCard
                        key={payment.id}
                        payment={payment}
                        t={t}
                        dateLocale={dateLocale}
                    />
                ))}
            </div>
        </section>
    );
}

/**
 * One Payment. Top to bottom: Activity, then type and submitted date, then
 * the amount; the footer carries the standing chip at its leading edge and
 * the Proof link (when there is one) at its trailing edge — the same
 * chip-leading / action-trailing footer the week strip's Session card uses,
 * so the two card families stay recognisable as one system.
 */
function PaymentCard({
    payment,
    t,
    dateLocale,
}: Readonly<{
    payment: HistoryPayment;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    const state = paymentState(payment.status);
    return (
        <Card size='sm'>
            <CardHeader className='flex flex-row items-center gap-cell'>
                <ActivityInitial name={payment.activity.name} />
                <CardTitle className='min-w-0 flex-1 truncate'>
                    {payment.activity.name}
                </CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-hair'>
                <p className='type-caption text-secondary-foreground'>
                    {billingTypeLabel(payment.type, t)} · {t.payments.submitted}{' '}
                    {format(new Date(payment.createdAt), 'MMM d', {
                        locale: dateLocale,
                    })}
                </p>
                <StatusValue
                    state={state}
                    className='type-figure tabular-nums text-card-foreground'>
                    Rp {RUPIAH_FORMAT.format(payment.amount)}
                </StatusValue>
                {payment.status === 'REJECTED' && (
                    <RejectedPaymentNotice payment={payment} t={t} />
                )}
            </CardContent>
            <CardFooter className='justify-between gap-cell'>
                <StatusChip state={state} labels={t.chips} />
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
            </CardFooter>
        </Card>
    );
}

/**
 * A Rejected Payment is already unmistakable from its void chip — the word
 * "Rejected", the value beside it dimmed. This notice only adds
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
        <div className='space-y-hair'>
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

import Link from 'next/link';
import type { PaymentStatus } from '@prisma/client';

import { Chip, StatusChip } from '@/components/ui/chip';
import { paymentState } from '@/lib/status-chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * What an Activity's money looks like on the dashboard right now.
 *
 * Any Payment that exists takes its chip from the resolver, including a
 * rejected one — that is emphatically someone having acted, so it is void
 * rather than neutral, and it stays a link because the member still needs to
 * send Proof again. Only the absence of a Payment is neutral: Dues nobody has
 * placed yet. A Fee still owed on held Seats is provisional.
 */
export function MoneyChip({
    isMonthlyDue,
    paymentStatus,
    outstanding,
    t,
}: Readonly<{
    isMonthlyDue: boolean;
    paymentStatus: PaymentStatus | undefined;
    outstanding: number;
    t: Dictionary;
}>) {
    if (isMonthlyDue) return duesChip(paymentStatus, t);
    if (outstanding > 0) {
        return (
            <Link href='/payments'>
                <Chip
                    variant='provisional'
                    label={t.dashboard.toPay.replace('{n}', String(outstanding))}
                />
            </Link>
        );
    }
    return null;
}

function duesChip(paymentStatus: PaymentStatus | undefined, t: Dictionary) {
    if (!paymentStatus) {
        return (
            <Link href='/payments/upload'>
                <Chip variant='neutral' label={t.dashboard.duesPendingMark} />
            </Link>
        );
    }
    const chip = <StatusChip state={paymentState(paymentStatus)} labels={t.chips} />;
    if (paymentStatus !== 'REJECTED') return chip;
    return <Link href='/payments/upload'>{chip}</Link>;
}

import Link from 'next/link';
import type { PaymentStatus } from '@prisma/client';

import { Mark, StateMark } from '@/components/ui/mark';
import { paymentState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * What an Activity's money looks like on the board right now.
 *
 * Any Payment that exists takes its mark from the resolver, including a
 * rejected one — that is emphatically someone having acted, so it is struck
 * through rather than left blank, and it stays a link because the member still
 * needs to send Proof again. Only the absence of a Payment is blank: Dues
 * nobody has placed yet. A Fee still owed on held Seats is provisional, so it
 * is held with tape.
 */
export function MoneyMark({
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
    if (isMonthlyDue) return duesMark(paymentStatus, t);
    if (outstanding > 0) {
        return (
            <Link href='/payments'>
                <Mark kind='tape'>
                    {t.dashboard.toPay.replace('{n}', String(outstanding))}
                </Mark>
            </Link>
        );
    }
    return null;
}

function duesMark(paymentStatus: PaymentStatus | undefined, t: Dictionary) {
    if (!paymentStatus) {
        return (
            <Link href='/payments/upload'>
                <Mark kind='blank'>{t.dashboard.duesPendingMark}</Mark>
            </Link>
        );
    }
    const mark = <StateMark state={paymentState(paymentStatus)} labels={t.marks} />;
    if (paymentStatus !== 'REJECTED') return mark;
    return <Link href='/payments/upload'>{mark}</Link>;
}

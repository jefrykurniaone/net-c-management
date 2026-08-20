import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The dues alert banner: monthly Dues take priority; otherwise any
 * per-session reservation still awaiting payment. Unchanged by this ticket —
 * moved out of the page component so the page stays a reasonable length
 * while it takes on the Slot Cell rebuild.
 */

const BANNER_CLASS =
    'flex items-center gap-3 rounded-xl border border-warning-soft-border bg-warning-soft px-3.5 py-3 hover:bg-warning-soft/80 transition-colors';
const PAY_NOW_CLASS =
    'shrink-0 rounded-lg bg-warning-solid px-3 py-1.5 text-xs font-semibold text-warning-solid-foreground';

interface UnpaidActivity {
    readonly name: string;
    readonly monthlyFee: number;
}

function MonthlyDuesBanner({
    activity,
    monthLabel,
    t,
}: Readonly<{ activity: UnpaidActivity; monthLabel: string; t: Dictionary }>) {
    return (
        <Link href='/payments/upload' className={BANNER_CLASS}>
            <AlertTriangle className='size-[18px] shrink-0 text-warning-soft-foreground' />
            <div className='min-w-0 flex-1'>
                <p className='truncate text-[13px] font-semibold text-warning-soft-foreground'>
                    {activity.name} {t.dashboard.duesUnpaidBanner}
                </p>
                <p className='truncate text-xs text-warning-soft-foreground/80'>
                    {monthLabel} · Rp {activity.monthlyFee.toLocaleString('id-ID')}
                </p>
            </div>
            <span className={PAY_NOW_CLASS}>{t.dashboard.payNow}</span>
        </Link>
    );
}

function ReservationsDueBanner({
    count,
    t,
}: Readonly<{ count: number; t: Dictionary }>) {
    return (
        <Link href='/payments' className={BANNER_CLASS}>
            <AlertTriangle className='size-[18px] shrink-0 text-warning-soft-foreground' />
            <div className='min-w-0 flex-1'>
                <p className='truncate text-[13px] font-semibold text-warning-soft-foreground'>
                    {t.dashboard.reservationsToPay.replace('{n}', String(count))}
                </p>
                <p className='truncate text-xs text-warning-soft-foreground/80'>
                    {t.dashboard.reservationsToPaySub}
                </p>
            </div>
            <span className={PAY_NOW_CLASS}>{t.dashboard.payNow}</span>
        </Link>
    );
}

export function DuesBanner({
    firstUnpaid,
    outstandingCount,
    monthLabel,
    t,
}: Readonly<{
    firstUnpaid: UnpaidActivity | undefined;
    outstandingCount: number;
    monthLabel: string;
    t: Dictionary;
}>) {
    if (firstUnpaid) {
        return (
            <MonthlyDuesBanner
                activity={firstUnpaid}
                monthLabel={monthLabel}
                t={t}
            />
        );
    }
    if (outstandingCount > 0) {
        return <ReservationsDueBanner count={outstandingCount} t={t} />;
    }
    return null;
}

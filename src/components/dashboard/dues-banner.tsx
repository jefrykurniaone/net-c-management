import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DuesChangeNotice } from '@/lib/dues-notice';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The dues alert banner: monthly Dues take priority; otherwise any per-session
 * reservation still awaiting payment.
 *
 * It also carries the **queued Dues change** notice (#113), which is why the
 * banner renders when nothing is unpaid — a member who has already paid this
 * month is exactly the member who needs to hear that the figure changes next.
 * That variant carries no "Pay now" pill and no link: there is nothing to pay
 * yet, the sentence carries the fact in words, and nothing here is interactive.
 */

const BANNER_BOX =
    'rounded-xl border border-warning-soft-border bg-warning-soft px-3.5 py-3';
const BANNER_CLASS = `flex items-center gap-3 ${BANNER_BOX} hover:bg-warning-soft/80 transition-colors`;
const NOTICE_CLASS = `${BANNER_BOX} space-y-1`;
const PAY_NOW_CLASS =
    'shrink-0 rounded-lg bg-warning-solid px-3 py-1.5 text-xs font-semibold text-warning-solid-foreground';

interface UnpaidActivity {
    readonly name: string;
    /** This Activity's Dues Rate for the current Billing Period (ADR 0002). */
    readonly duesAmount: number;
}

function formatAmount(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
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
                    {monthLabel} · {formatAmount(activity.duesAmount)}
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

/** "{Activity} Dues change to Rp 90.000 from September 2026". */
function noticeSentence(notice: DuesChangeNotice, t: Dictionary): string {
    return t.dashboard.duesChangeNotice
        .replace('{activity}', notice.activityName)
        .replace('{amount}', formatAmount(notice.amount))
        .replace(
            '{month}',
            `${t.months[notice.period.month]} ${notice.period.year}`,
        );
}

function DuesChangeNotices({
    notices,
    t,
}: Readonly<{ notices: readonly DuesChangeNotice[]; t: Dictionary }>) {
    return (
        <div className={NOTICE_CLASS}>
            {notices.map((notice) => (
                <p
                    key={notice.activityId}
                    className='text-[13px] text-warning-soft-foreground'>
                    {noticeSentence(notice, t)}
                </p>
            ))}
        </div>
    );
}

/** The unpaid alert, or `null` when the member owes nothing right now. */
function unpaidAlert(
    firstUnpaid: UnpaidActivity | undefined,
    outstandingCount: number,
    monthLabel: string,
    t: Dictionary,
): ReactNode {
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

export function DuesBanner({
    firstUnpaid,
    outstandingCount,
    notices,
    monthLabel,
    t,
}: Readonly<{
    firstUnpaid: UnpaidActivity | undefined;
    outstandingCount: number;
    /** Queued Dues changes this member is billed Monthly for (#113). */
    notices: readonly DuesChangeNotice[];
    monthLabel: string;
    t: Dictionary;
}>) {
    const alert = unpaidAlert(firstUnpaid, outstandingCount, monthLabel, t);
    if (alert === null && notices.length === 0) {
        return null;
    }
    return (
        <div className='space-y-2'>
            {alert}
            {notices.length > 0 ? (
                <DuesChangeNotices notices={notices} t={t} />
            ) : null}
        </div>
    );
}

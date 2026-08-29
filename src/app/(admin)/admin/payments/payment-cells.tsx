import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import type { PaymentStatus, PaymentType } from '@prisma/client';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { MarkedValue } from '@/components/ui/mark';
import { paymentState } from '@/lib/status-mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * The values one Payment row holds. The register owns where each of these lands
 * and how it rules; these components own only what a single value looks like,
 * which is the whole of what a caller gets to say.
 */

export type PaymentQueueRow = Readonly<{
    id: string;
    type: PaymentType;
    amount: number;
    month: number;
    year: number;
    status: PaymentStatus;
    proofUrl: string | null;
    createdAt: Date;
    confirmedAt: Date | null;
    user: Readonly<{ name: string | null; email: string | null }>;
    activity: Readonly<{
        id: string;
        name: string;
        monthlyFee: number;
        bankName: string;
        bankAccountNumber: string;
        bankAccountHolder: string;
    }>;
    session: Readonly<{ title: string; date: Date; fee: number }> | null;
}>;

const EM_DASH = '—';

const DATE_FORMAT = 'd MMM yyyy';

/** What to call this member in a column, a dialog and a toast. */
export function paymentMemberLabel(payment: PaymentQueueRow): string {
    return payment.user.name ?? payment.user.email ?? EM_DASH;
}

/** Rupiah as the rest of the app writes it. Tabular figures come from the kind. */
export function rupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** The Billing Period this Payment belongs to, named in the reader's locale. */
export function billingPeriodLabel(
    payment: PaymentQueueRow,
    t: Dictionary,
): string {
    return `${t.months[payment.month]} ${payment.year}`;
}

/**
 * The current price for this Payment's mode: the Activity's Dues for a monthly
 * one, that Session's own Fee for a per-Session one. Null where the Session is
 * gone, which is the one case with no figure to compare against.
 */
export function currentPriceOf(payment: PaymentQueueRow): number | null {
    if (payment.type === 'SESSION') {
        return payment.session?.fee ?? null;
    }
    return payment.activity.monthlyFee;
}

/** Who sent it, and how to place them. */
export function PaymentMember({
    payment,
}: Readonly<{ payment: PaymentQueueRow }>) {
    return (
        <span className='flex min-w-0 flex-col gap-hair'>
            <span className='type-title text-foreground'>
                {paymentMemberLabel(payment)}
            </span>
            <span className='type-caption break-all text-muted-foreground'>
                {payment.user.email}
            </span>
        </span>
    );
}

/** The destination account, so the Admin opens the right bank statement. */
function bankLine(activity: PaymentQueueRow['activity']): string {
    return [
        activity.bankName,
        activity.bankAccountNumber,
        activity.bankAccountHolder,
    ]
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join(' · ');
}

/**
 * The Activity as its initial tile, with the account the money was sent to
 * beneath it. Two Activities can share an initial, so the name is always here
 * too and the tile is never the only identifier.
 */
export function PaymentActivity({
    payment,
    t,
}: Readonly<{ payment: PaymentQueueRow; t: Dictionary }>) {
    const bank = bankLine(payment.activity);
    return (
        <span className='flex min-w-0 items-start gap-cell'>
            <ActivityInitial name={payment.activity.name} />
            <span className='flex min-w-0 flex-col gap-hair'>
                <span className='type-body text-foreground'>
                    {payment.activity.name}
                </span>
                <span className='type-caption tabular-nums text-muted-foreground'>
                    {bank === ''
                        ? t.admin.bankNotSet
                        : `${t.payments.transferTo} ${bank}`}
                </span>
            </span>
        </span>
    );
}

/**
 * The one amount column. The figure is the server's, set when the Payment was
 * created, so claimed and owed are the same number by construction and the
 * Admin's comparison is against the bank screenshot rather than a second
 * column.
 *
 * A Rejected amount is drawn by `MarkedValue`, which dims it to Secondary Ink
 * and leaves the line-through on the Strike mark's own label in the standing
 * column — one line through two words reads as a stamp, a second line through
 * the value beside it reads as damage to the row. That is the shipped
 * precedent (`src/components/ui/mark.tsx`) and the member payments history is
 * already asserted against it (`TESTING.md` TC-MS-017), so the queue matches it
 * rather than striking the figure itself.
 */
export function PaymentAmount({
    payment,
}: Readonly<{ payment: PaymentQueueRow }>) {
    return (
        <MarkedValue
            state={paymentState(payment.status)}
            className='text-foreground'>
            {rupiah(payment.amount)}
        </MarkedValue>
    );
}

/**
 * The Billing Period, on every row — a per-Session Payment belongs to a month
 * as much as a monthly one does, and its Session's date says which day inside
 * that month it settles.
 */
export function PaymentPeriod({
    payment,
    t,
    dateLocale,
}: Readonly<{
    payment: PaymentQueueRow;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <span className='flex flex-col gap-hair'>
            <span className='type-body text-foreground'>
                {billingPeriodLabel(payment, t)}
            </span>
            {payment.session && (
                <span className='type-caption text-muted-foreground'>
                    {format(payment.session.date, DATE_FORMAT, {
                        locale: dateLocale,
                    })}
                </span>
            )}
        </span>
    );
}

/** When the member sent it. */
export function PaymentSent({
    payment,
    dateLocale,
}: Readonly<{ payment: PaymentQueueRow; dateLocale: DateFnsLocale }>) {
    return (
        <time
            dateTime={payment.createdAt.toISOString()}
            className='type-figure text-foreground'>
            {format(payment.createdAt, DATE_FORMAT, { locale: dateLocale })}
        </time>
    );
}

/**
 * A decided row has no controls left — the standing column already says what
 * was decided, so all the actions column adds is when. A row decided before
 * that stamp existed simply has one line fewer.
 */
export function PaymentDecided({
    payment,
    t,
    dateLocale,
}: Readonly<{
    payment: PaymentQueueRow;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    if (payment.confirmedAt === null) {
        return null;
    }
    return (
        <span className='type-caption text-muted-foreground'>
            {t.admin.paymentDecidedOn.replace(
                '{date}',
                format(payment.confirmedAt, DATE_FORMAT, {
                    locale: dateLocale,
                }),
            )}
        </span>
    );
}

import Link from 'next/link';
import { format } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { HoldCountdown } from '@/components/payments/hold-countdown';
import type { OutstandingSessionBill } from '@/lib/payments';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * One Activity's Dues standing for the current Billing Period, as this card
 * needs it — already resolved by the page, so the card only ever draws a
 * state, never decides one.
 */
export interface MonthlyDuesRow {
    id: string;
    name: string;
    duesAmount: number;
    status: 'paid' | 'inReview' | 'unpaid';
    hold?: Date;
}

/**
 * A reserved-but-unpaid per-Session bill, one Card each, the whole card a
 * link to the pay flow — unchanged behaviour, only the container is now a
 * borderless Rally card instead of a bordered, ruled row.
 */
export function OutstandingReservationsSection({
    bills,
    t,
    dateLocale,
}: Readonly<{
    bills: readonly OutstandingSessionBill[];
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    if (bills.length === 0) return null;
    return (
        <section className='flex flex-col gap-block'>
            <h2 className='type-label text-muted-foreground'>
                {t.payments.outstandingReservations}
            </h2>
            <div className='flex flex-col gap-block'>
                {bills.map((bill) => (
                    <OutstandingReservationCard
                        key={bill.sessionId}
                        bill={bill}
                        t={t}
                        dateLocale={dateLocale}
                    />
                ))}
            </div>
        </section>
    );
}

function OutstandingReservationCard({
    bill,
    t,
    dateLocale,
}: Readonly<{
    bill: OutstandingSessionBill;
    t: Dictionary;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <Link
            href={`/sessions/${bill.sessionId}/pay`}
            className='block transition-rally hover:shadow-lift-hover motion-reduce:transition-none'>
            <Card size='sm'>
                <CardContent className='flex items-center gap-cell'>
                    <ActivityInitial name={bill.activity.name} />
                    <div className='min-w-0 flex-1'>
                        <p className='type-title truncate text-card-foreground'>
                            {bill.title}
                        </p>
                        {/* The Activity name rides the caption line: the tile
                            alone cannot tell apart two Activities sharing an
                            initial. */}
                        <p className='type-caption tabular-nums text-secondary-foreground'>
                            {bill.activity.name} · Rp{' '}
                            {bill.fee.toLocaleString('id-ID')} ·{' '}
                            {format(new Date(bill.date), 'd MMM', {
                                locale: dateLocale,
                            })}
                        </p>
                    </div>
                    <div className='flex shrink-0 flex-col items-end gap-hair'>
                        {/* A Seat held on money not yet sent is provisional. */}
                        <Chip variant='provisional' label={t.payments.payNow} />
                        <p className='type-caption tabular-nums text-warning'>
                            <HoldCountdown
                                iso={new Date(bill.holdExpiresAt).toISOString()}
                                template={t.payments.payWithin}
                                expiredLabel={t.sessions.holdExpired}
                            />
                        </p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

/**
 * The current Billing Period's Dues, one Card per monthly Activity. Not a
 * link — paying is reached through the chip for the unpaid case, exactly as
 * before.
 */
export function MonthlyDuesSection({
    rows,
    monthLabel,
    t,
}: Readonly<{
    rows: readonly MonthlyDuesRow[];
    monthLabel: string;
    t: Dictionary;
}>) {
    if (rows.length === 0) return null;
    return (
        <section className='flex flex-col gap-block'>
            <h2 className='type-label text-muted-foreground'>{monthLabel}</h2>
            <div className='flex flex-col gap-block'>
                {rows.map((row) => (
                    <MonthlyDuesCard key={row.id} row={row} t={t} />
                ))}
            </div>
        </section>
    );
}

function MonthlyDuesCard({
    row,
    t,
}: Readonly<{ row: MonthlyDuesRow; t: Dictionary }>) {
    return (
        <Card size='sm'>
            <CardContent className='flex items-center gap-cell'>
                <ActivityInitial name={row.name} />
                <div className='min-w-0 flex-1'>
                    <p className='type-title truncate text-card-foreground'>
                        {row.name}
                    </p>
                    <p className='type-caption tabular-nums text-secondary-foreground'>
                        Rp {row.duesAmount.toLocaleString('id-ID')}{' '}
                        {t.payments.perMonth}
                    </p>
                </div>
                <MonthlyDuesStanding row={row} t={t} />
            </CardContent>
        </Card>
    );
}

function MonthlyDuesStanding({
    row,
    t,
}: Readonly<{ row: MonthlyDuesRow; t: Dictionary }>) {
    if (row.status === 'paid') {
        return <Chip variant='settled' label={t.payments.paid} />;
    }
    if (row.status === 'inReview') {
        return <Chip variant='provisional' label={t.payments.inReview} />;
    }
    return (
        <div className='flex shrink-0 flex-col items-end gap-hair'>
            <Link href='/payments/upload'>
                {/* Dues nobody has paid yet: expected, not yet placed. */}
                <Chip variant='neutral' label={t.payments.unpaid} />
            </Link>
            {row.hold && (
                <p className='type-caption tabular-nums text-warning'>
                    <HoldCountdown
                        iso={row.hold.toISOString()}
                        template={t.payments.payWithin}
                        expiredLabel={t.sessions.holdExpired}
                    />
                </p>
            )}
        </div>
    );
}

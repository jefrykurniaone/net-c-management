import Link from 'next/link';
import { format, differenceInCalendarDays } from 'date-fns';
import type { Locale as DateFnsLocale } from 'date-fns';
import { CreditCard, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { UnderBookedSession } from './dashboard-data';

/** `fill('{n} items', { n: 3 })` → `'3 items'` — the dashboard's one templating need. */
function fill(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce(
        (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
        template,
    );
}

function PendingProofsRow({
    t,
    pendingPayments,
}: Readonly<{ t: Dictionary; pendingPayments: number }>) {
    return (
        <div className='flex items-center gap-3.5 px-5 py-3.5'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft'>
                <CreditCard className='w-4 h-4 text-warning' />
            </span>
            <div className='flex-1 min-w-0'>
                <p className='type-body font-semibold text-foreground'>
                    {fill(t.admin.pendingProofsItem, { n: pendingPayments })}
                </p>
                <p className='type-caption text-muted-foreground'>
                    {t.admin.pendingProofsSub}
                </p>
            </div>
            <Button asChild size='sm' variant='outline'>
                <Link href='/admin/payments'>{t.admin.reviewAction}</Link>
            </Button>
        </div>
    );
}

function UnderBookedRow({
    t,
    underBooked,
    now,
    dateLocale,
}: Readonly<{
    t: Dictionary;
    underBooked: UnderBookedSession;
    now: Date;
    dateLocale: DateFnsLocale;
}>) {
    return (
        <div className='flex items-center gap-3.5 px-5 py-3.5'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft'>
                <Users className='w-4 h-4 text-primary' />
            </span>
            <div className='flex-1 min-w-0'>
                <p className='type-body font-semibold text-foreground truncate'>
                    {fill(t.admin.underBookedItem, {
                        title: underBooked.title,
                        n: underBooked.attendances,
                        max: underBooked.maxPlayers,
                    })}
                </p>
                <p className='type-caption text-muted-foreground'>
                    {format(new Date(underBooked.date), 'EEE, d MMM', {
                        locale: dateLocale,
                    })}{' '}
                    ·{' '}
                    {fill(t.admin.rsvpClosesInDays, {
                        n: differenceInCalendarDays(new Date(underBooked.date), now),
                    })}
                </p>
            </div>
            <Button asChild size='sm' variant='outline'>
                <Link href={`/admin/sessions/${underBooked.id}/edit`}>
                    {t.admin.remindMembers}
                </Link>
            </Button>
        </div>
    );
}

/**
 * "Needs attention" (User Story 3): pending Payments and one under-booked
 * Session, in that order. Shows both when both apply, either alone, or the
 * all-clear sentence when neither does — never an empty card with nothing
 * said (DESIGN.md, the Register's retired empty-state rule, restated for a
 * card rather than a row).
 */
export function DashboardAttentionCard({
    t,
    pendingPayments,
    underBooked,
    now,
    dateLocale,
}: Readonly<{
    t: Dictionary;
    pendingPayments: number;
    underBooked: UnderBookedSession | null;
    now: Date;
    dateLocale: DateFnsLocale;
}>) {
    const attentionCount = (pendingPayments > 0 ? 1 : 0) + (underBooked ? 1 : 0);

    return (
        <Card className='gap-0 overflow-hidden p-0'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-border'>
                <h2 className='type-title text-foreground'>
                    {t.admin.needsAttentionTitle}
                </h2>
                {attentionCount > 0 && (
                    <span className='type-label text-warning-soft-foreground bg-warning-soft border border-warning-soft-border rounded-full px-2.5 py-0.5'>
                        {fill(t.admin.itemsCount, { n: attentionCount })}
                    </span>
                )}
            </div>
            {attentionCount === 0 ? (
                <p className='px-5 py-8 type-body text-muted-foreground text-center'>
                    {t.admin.allClear}
                </p>
            ) : (
                <div className='divide-y divide-border'>
                    {pendingPayments > 0 && (
                        <PendingProofsRow t={t} pendingPayments={pendingPayments} />
                    )}
                    {underBooked && (
                        <UnderBookedRow
                            t={t}
                            underBooked={underBooked}
                            now={now}
                            dateLocale={dateLocale}
                        />
                    )}
                </div>
            )}
        </Card>
    );
}

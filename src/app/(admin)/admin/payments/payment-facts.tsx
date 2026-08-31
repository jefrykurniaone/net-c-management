import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * What both decision dialogs restate before the Admin commits: who sent it,
 * what for, which Billing Period, and how much. The Admin has just been reading
 * a bank statement, and a dialog that only says "are you sure?" makes them go
 * back to the row to find out which one they clicked.
 */

export type PaymentFacts = Readonly<{
    memberName: string;
    activityName: string;
    periodLabel: string;
    amountLabel: string;
}>;

export function PaymentFactList({
    facts,
    t,
}: Readonly<{ facts: PaymentFacts; t: Dictionary }>) {
    return (
        <dl className='grid grid-cols-[auto_1fr] gap-x-block gap-y-hair rounded-lg border border-border bg-background p-cell'>
            <dt className='type-label text-muted-foreground'>
                {t.admin.colMember}
            </dt>
            <dd className='type-body text-foreground'>{facts.memberName}</dd>
            <dt className='type-label text-muted-foreground'>
                {t.activity.label}
            </dt>
            <dd className='type-body text-foreground'>{facts.activityName}</dd>
            <dt className='type-label text-muted-foreground'>
                {t.admin.colPeriod}
            </dt>
            <dd className='type-body text-foreground'>{facts.periodLabel}</dd>
            <dt className='type-label text-muted-foreground'>
                {t.admin.colAmount}
            </dt>
            <dd className='type-figure text-foreground'>{facts.amountLabel}</dd>
        </dl>
    );
}

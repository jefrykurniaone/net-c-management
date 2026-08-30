'use client';

import type { PaymentStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Chip, StatusChip } from '@/components/ui/chip';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { paymentState } from '@/lib/status-chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { MembershipRowView } from '@/lib/membership-mode-view';
import { PaymentModeControl } from './PaymentModeControl';

interface MembershipCellProps {
    row: MembershipRowView;
    t: Dictionary;
    onLeave: () => void;
}

/**
 * One Membership — a member's standing belonging to one Activity, carrying how
 * they pay for it. One row inside the memberships card, reading top to bottom
 * as the question a member came here with: which Activity, what is in force
 * for the Billing Period they are in, and then the control that changes the
 * next one.
 */
export function MembershipCell({
    row,
    t,
    onLeave,
}: Readonly<MembershipCellProps>) {
    return (
        <div className='flex flex-col gap-block p-block'>
            <div className='flex items-start gap-cell'>
                <ActivityInitial name={row.name} className='size-9' />
                <div className='min-w-0 flex-1'>
                    <p className='type-title truncate text-card-foreground'>
                        {row.name}
                    </p>
                    <p className='type-caption text-secondary-foreground'>
                        {t.profile.joinedPrefix} {row.joinedDate}
                    </p>
                </div>
                <Button variant='outline' size='sm' onClick={onLeave}>
                    {t.profile.leaveButton}
                </Button>
            </div>

            <InForceLine row={row} t={t} />

            <PaymentModeControl
                activityId={row.activityId}
                activityName={row.name}
                mode={row.mode}
                t={t}
            />
        </div>
    );
}

/**
 * What is in force for the Billing Period the member is already in — the period
 * a switch cannot rewrite. The chip beside it is the evidence for that: money in
 * for this period is exactly what settles it, and a settled period is what
 * pushes a change into the next one.
 */
function InForceLine({
    row,
    t,
}: Readonly<{ row: MembershipRowView; t: Dictionary }>) {
    const { inForce, currentPeriodLabel } = row.mode;
    return (
        <div className='flex flex-wrap items-baseline justify-between gap-cell border-t border-border pt-cell'>
            <div className='min-w-0'>
                {/* The period sits in the same column on every row, so its
                    year takes tabular figures and the rows line up. */}
                <p className='type-label tabular-nums text-muted-foreground'>
                    {t.profile.currentPeriodRowLabel} · {currentPeriodLabel}
                </p>
                {inForce ? (
                    <p className='type-figure mt-hair text-card-foreground'>
                        {inForce.modeLabel} · {inForce.billsLabel}{' '}
                        {inForce.amount}
                    </p>
                ) : (
                    <p className='type-body text-secondary-foreground'>
                        {t.profile.modeNoneChosen}
                    </p>
                )}
            </div>
            <PeriodPaymentChip status={row.periodPaymentStatus} t={t} />
        </div>
    );
}

/**
 * The Payment standing against the current Billing Period, drawn through the one
 * seam — no surface here picks its own variant or its own status colour. A
 * period nothing has been paid against yet has no stored state at all, which is
 * the one case a bare **neutral** chip is for: expected, not yet placed.
 */
function PeriodPaymentChip({
    status,
    t,
}: Readonly<{ status: PaymentStatus | null; t: Dictionary }>) {
    if (status === null) {
        return <Chip variant='neutral' label={t.profile.markNotPaid} />;
    }
    return <StatusChip state={paymentState(status)} labels={t.chips} />;
}

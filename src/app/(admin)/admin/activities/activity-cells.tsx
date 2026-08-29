import { cn } from '@/lib/utils';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { Mark } from '@/components/ui/mark';
import type { BillingPeriod } from '@/lib/billing-period';
import { resolveDuesRate, type DuesRateRow } from '@/lib/dues-rate';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Activity } from '@prisma/client';

/**
 * What one Activity row holds. The register owns where each of these lands
 * and how it rules; these components own only what a single value looks
 * like — which is the whole of what a caller gets to say.
 */

/** Nothing configured, nothing to draw. */
const EM_DASH = '—';

function formatRupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** What the register needs to price one Activity's Dues for a Billing Period. */
type ActivityDuesRow = Readonly<{
    allowsMonthly: boolean;
    duesRates: readonly DuesRateRow[];
}>;

/**
 * Dues is per-month, resolved through the Dues Rate of the Period the register
 * is about — never a live field. Unset when the Activity does not offer Monthly.
 *
 * A Period no rate row covers is named in words rather than drawn as an em
 * dash: the dash means "nothing configured", and an Activity with no rate at all
 * is a broken invariant the beginning-of-time row exists to prevent. Reading the
 * two as the same thing is how a missing rate goes unnoticed. It is never
 * printed as Rp 0 for the reason `resolveDuesRate` returns `null` instead of 0.
 *
 * The register carries **no** marker for a queued change: a queued change is not
 * a standing, and the column answers "which Activity charges most" today.
 */
export function activityDuesLabel(
    activity: ActivityDuesRow,
    period: BillingPeriod,
    t: Dictionary,
): string {
    if (!activity.allowsMonthly) {
        return EM_DASH;
    }
    const amount = resolveDuesRate(activity.duesRates, period);
    return amount === null ? t.admin.duesRateNone : formatRupiah(amount);
}

/** Fee is per-Session; unset when the Activity does not offer Per-Session. */
export function activityFeeLabel(activity: Activity): string {
    return activity.allowsPerSession ? formatRupiah(activity.sessionFee) : EM_DASH;
}

/** The payment modes an Activity offers, in the labels the form already uses. */
export function activityModesLabel(activity: Activity, t: Dictionary): string {
    const modes: string[] = [];
    if (activity.allowsMonthly) {
        modes.push(t.admin.activityModeMonthly);
    }
    if (activity.allowsPerSession) {
        modes.push(t.admin.activityModePerSession);
    }
    return modes.length > 0 ? modes.join(', ') : EM_DASH;
}

/** The weekly auto-schedule slot, or unset when the Activity has none. */
export function activityWeeklySlotLabel(activity: Activity, t: Dictionary): string {
    if (activity.recurringDay === null) {
        return EM_DASH;
    }
    const day = t.days[activity.recurringDay];
    return `${day} ${activity.recurringStartTime}–${activity.recurringEndTime}`;
}

/**
 * Who they are: the initial tile, the name, and the slug beneath it. An
 * inactive Activity's name is dimmed, not struck, the way `MarkedValue`
 * treats a void value; the Strike mark in the standing column carries the
 * line. `MarkedValue` itself takes a `DomainState`, and Activity active/
 * inactive isn't one (see `ActivityStanding`), so this applies the same
 * `text-muted-foreground` class directly rather than routing through it.
 */
export function ActivityIdentity({ activity }: Readonly<{ activity: Activity }>) {
    return (
        <span className='flex min-w-0 items-center gap-cell'>
            <ActivityInitial name={activity.name} />
            <span className='flex min-w-0 flex-col gap-hair'>
                <span
                    className={cn(
                        'type-title text-foreground',
                        !activity.isActive && 'text-muted-foreground',
                    )}>
                    {activity.name}
                </span>
                <span className='type-caption text-muted-foreground'>
                    {activity.slug}
                </span>
            </span>
        </span>
    );
}

/**
 * The destination bank account — bank, number, holder, each its own line —
 * or unset when none is configured yet (`activityBankHint`: an empty bank
 * name is how an Admin leaves it hidden from members).
 */
export function ActivityBank({ activity }: Readonly<{ activity: Activity }>) {
    if (activity.bankName === '') {
        return (
            <span className='type-caption text-muted-foreground'>
                {EM_DASH}
            </span>
        );
    }
    return (
        <span className='flex flex-col gap-hair'>
            <span className='type-body text-foreground'>{activity.bankName}</span>
            {activity.bankAccountNumber !== '' && (
                <span className='type-caption tabular-nums text-muted-foreground'>
                    {activity.bankAccountNumber}
                </span>
            )}
            {activity.bankAccountHolder !== '' && (
                <span className='type-caption text-muted-foreground'>
                    {activity.bankAccountHolder}
                </span>
            )}
        </span>
    );
}

/**
 * Active or inactive, told apart by a mark rather than by colour. Whether an
 * Activity is active is a standing configuration fact, not a stored
 * lifecycle it moves through, so `status-mark.ts`'s resolver has no domain
 * for it (by design — see its comment on Role) and this is the one place
 * that picks a mark kind by hand instead of going through
 * `resolveStatusMark`.
 */
export function ActivityStanding({
    activity,
    t,
}: Readonly<{ activity: Activity; t: Dictionary }>) {
    return (
        <Mark kind={activity.isActive ? 'ink' : 'strike'}>
            {activity.isActive ? t.admin.active : t.admin.inactive2}
        </Mark>
    );
}

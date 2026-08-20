import type { PaymentStatus } from '@prisma/client';
import type { BoardDay } from '@/lib/board-days';
import { ActivityInitial } from '@/components/activity/activity-badge';
import { MoneyMark } from './money-mark';
import { ActivityDayCells } from './activity-day-cells';
import type { DashboardSlotContext } from './dashboard-slot-data';

/** The Activity fields this card's own header needs — a name beside its tile. */
export interface DashboardActivity {
    readonly id: string;
    readonly name: string;
}

/**
 * One Activity's card on the dashboard: identity and dues in its own header
 * (unchanged by this ticket), its Sessions rendered through the Slot Cell
 * beneath it (the ticket's own rebuild). The header keeps the plain bordered
 * card it already had — this ticket's coloured top border was removed from
 * it in #36, before this ticket, and never returns.
 */
export function ActivitySummaryCard({
    activity,
    days,
    isMonthlyDue,
    paymentStatus,
    outstanding,
    slotContext,
}: Readonly<{
    activity: DashboardActivity;
    days: readonly BoardDay[];
    isMonthlyDue: boolean;
    paymentStatus: PaymentStatus | undefined;
    outstanding: number;
    slotContext: DashboardSlotContext;
}>) {
    return (
        <div className='bg-card rounded-xl border border-border overflow-hidden'>
            <div className='flex items-center gap-2.5 p-4 pb-3'>
                <ActivityInitial name={activity.name} />
                <span className='flex-1 text-[15px] font-semibold text-foreground truncate'>
                    {activity.name}
                </span>
                <MoneyMark
                    isMonthlyDue={isMonthlyDue}
                    paymentStatus={paymentStatus}
                    outstanding={outstanding}
                    t={slotContext.t}
                />
            </div>
            <div className='px-4 pb-4'>
                <ActivityDayCells days={days} context={slotContext} />
            </div>
        </div>
    );
}

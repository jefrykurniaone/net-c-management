import Link from 'next/link';
import { Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { ActivitySummaryCard } from '@/components/dashboard/activity-summary-card';
import type { ActivitySectionView } from '@/components/dashboard/activity-sections';

/**
 * "Your activities" — one {@link ActivitySummaryCard} per Activity this member
 * is on, under a heading row that links out to the full Sessions board. A
 * member on nothing yet gets the join prompt instead of an empty heading.
 *
 * Draws only: every card's contents are already resolved by
 * `activity-sections.ts`, so nothing here picks a board or a Payment Mode.
 */
export function ActivitySummarySection({
    sections,
    t,
}: Readonly<{
    sections: readonly ActivitySectionView[];
    t: Dictionary;
}>) {
    if (sections.length === 0) {
        return (
            <EmptyState
                icon={Shapes}
                chipLabel={t.common.empty}
                title={t.activity.noneJoined}
                action={
                    <Link href='/sessions'>
                        <Button variant='outline' size='sm'>
                            {t.activity.join}
                        </Button>
                    </Link>
                }
            />
        );
    }

    return (
        <div className='space-y-4'>
            <div className='flex items-baseline justify-between'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
                    {t.dashboard.yourActivities}
                </p>
                <Link
                    href='/sessions'
                    className='text-xs font-semibold text-primary hover:underline'>
                    {t.dashboard.viewAllShort}
                </Link>
            </div>
            {sections.map((section) => (
                <ActivitySummaryCard
                    key={section.key}
                    activity={section.activity}
                    paymentMode={section.paymentMode}
                    cards={section.cards}
                    t={t}
                />
            ))}
        </div>
    );
}

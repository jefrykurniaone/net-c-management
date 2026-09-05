import type { PaymentMode } from '@prisma/client';
import { ActivityTile } from '@/components/activity/activity-tile';
import { Chip } from '@/components/ui/chip';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { DashboardCardView } from './activity-card-view';
import { ActivitySessionCard } from './activity-session-card';

/** The Activity fields this card's own header needs. */
export interface DashboardActivity {
    readonly id: string;
    readonly name: string;
    /** `Activity.icon` as stored, or null for the initial tile. */
    readonly icon: string | null;
}

/**
 * One Activity's card on the dashboard: identity and how the member pays for
 * it in the header, that Activity's next Sessions as compact cards in the
 * body (`spec-rally-member-v1.md`, Dashboard). Per-Activity Payment standing —
 * paid, pending, rejected, to pay — moved out of this header with #160: it now
 * surfaces through the dues notice card above every Activity's own card and
 * the dashboard's own Dues stat, so this header says only what a member pays
 * *by*, never whether this period is settled.
 */
export function ActivitySummaryCard({
    activity,
    paymentMode,
    cards,
    t,
}: Readonly<{
    activity: DashboardActivity;
    paymentMode: PaymentMode | null;
    cards: readonly DashboardCardView[];
    t: Dictionary;
}>) {
    return (
        <div className='flex flex-col gap-cell rounded-xl bg-card p-block shadow-lift'>
            <div className='flex items-center gap-cell'>
                <ActivityTile name={activity.name} icon={activity.icon} size='lead' />
                <span className='type-title min-w-0 flex-1 truncate text-card-foreground'>
                    {activity.name}
                </span>
                <PaymentModeChip mode={paymentMode} t={t} />
            </div>
            {cards.length === 0 ? (
                <ActivityEmptyNotice t={t} />
            ) : (
                <div className='flex flex-col gap-cell'>
                    {cards.map(({ key, card }) => (
                        <ActivitySessionCard key={key} card={card} t={t} />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * This Activity's body when its next-Sessions list is empty — nothing posted
 * and no standing weekly slot landing in the range. A sentence beside the
 * neutral chip, drawn directly rather than through `BoardNotice`
 * (`src/app/(main)/sessions/page.tsx`): that component is its own `bg-card
 * shadow-lift` box, and nesting one inside this card's would double the
 * shadow rather than reading as one card with one sentence in it.
 */
function ActivityEmptyNotice({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell'>
            <Chip variant='neutral' label={t.chips.unposted} />
            <p className='type-caption text-secondary-foreground'>
                {t.dashboard.noUpcoming}
            </p>
        </div>
    );
}

/**
 * What a member pays this Activity *by* — Monthly or Per-Session — never
 * whether this period is settled. `null` covers both an Activity offering no
 * mode and one offering both to a member who has not chosen yet; neither has
 * anything to say beyond "not chosen", so the two collapse into one chip.
 */
function PaymentModeChip({
    mode,
    t,
}: Readonly<{ mode: PaymentMode | null; t: Dictionary }>) {
    if (mode === null) {
        return <Chip variant='neutral' label={t.profile.modeNoneChosen} />;
    }
    const label = mode === 'MONTHLY' ? t.paymentMode.monthly : t.paymentMode.perSession;
    return <Chip variant='info' label={label} />;
}

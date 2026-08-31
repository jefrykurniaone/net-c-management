import { ActivityTile } from '@/components/activity/activity-tile';
import { Chip } from '@/components/ui/chip';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BoardRow } from '@/lib/landing-board';
import { Band, BandGrid, BandHead } from './band';
import { QuietJoin } from './quiet-join';

/**
 * The community's real Activities, as a card grid. This is the page's only
 * per-community substance that the Admin does not type: the hero and the bands
 * around it are words, and this band is data.
 *
 * One card per active Activity, fused with that Activity's own next scheduled
 * date. There is no separate schedule band — this product's answer to "when is
 * badminton" has always been one place, not two lists a reader has to join by
 * name.
 *
 * **The card's information order, and why.** Identity, then recurrence, then
 * place, then the next occurrence, then price:
 *
 *  1. the livery tile and the Activity's name — what this is;
 *  2. the standing weekly slot — when it *always* happens, which is the thing
 *     a stranger is deciding about, because joining is a standing commitment
 *     rather than one session;
 *  3. the location — where, and the first thing that rules a community out;
 *  4. the next scheduled date, or the neutral chip where there is none — when
 *     it happens *next*, which is a fact about this week rather than about the
 *     Activity;
 *  5. the Fee — last, because a price read before there is anything to price
 *     is just a number.
 *
 * ADR 0003 retired the shared Slot Cell, so each surface composes its own card;
 * this order is the one the member surfaces mirror, and the resolvers underneath
 * it stay shared. The last two sit in the card's footer, on its own wash and
 * behind a rule, because they are the two facts that change without the
 * Activity changing.
 */
export function ActivitiesBand({
    t,
    rows,
}: Readonly<{ t: Dictionary; rows: readonly BoardRow[] }>) {
    return (
        <Band>
            <BandHead head={t.landing.board.head} body={t.landing.board.body} />
            <BandGrid kind='activities'>
                {rows.length > 0 ? (
                    rows.map((row) => (
                        <ActivityCard key={row.id} row={row} t={t} />
                    ))
                ) : (
                    <EmptyCard t={t} />
                )}
            </BandGrid>
            {/* The second action, quiet: the page has exactly one loud one and
                it is in the hero. On a phone this band's foot is several
                screens from it, and a reader the data has just convinced should
                not have to scroll back to act. */}
            <QuietJoin label={t.landing.board.cta} className='mt-bay' />
        </Band>
    );
}

/**
 * One Activity. `h-full` so every card in a row is the same height and the
 * footer lands on the same line across the row; `CardContent` takes the slack,
 * because an Activity with no recurring day has fewer lines than its neighbour.
 */
function ActivityCard({
    row,
    t,
}: Readonly<{ row: BoardRow; t: Dictionary }>) {
    return (
        <Card className='h-full'>
            {/* `CardHeader`'s own base class is `grid`, and `tailwind-merge`
                will not resolve a `flex-row` against it because display and
                flex-direction are different groups — DESIGN.md, Components. So
                the tile and the name sit in their own flex child of the grid
                rather than being laid out by the header itself. */}
            <CardHeader>
                <div className='flex flex-row items-start gap-cell'>
                    <ActivityTile name={row.name} icon={row.icon} size='lead' />
                    {/* The name is the Activity's own, unbounded, and the
                        narrowest column on this page is a card on a 390px
                        phone — so the same guarantee the header rail gives the
                        community name applies here. */}
                    <CardTitle className='min-w-0 break-words'>
                        {row.name}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col gap-hair'>
                <StandingLines row={row} />
            </CardContent>
            <CardFooter className='flex-wrap items-end justify-between gap-cell'>
                <NextDate row={row} t={t} />
                <Fee row={row} />
            </CardFooter>
        </Card>
    );
}

/**
 * The standing arrangement — when it runs every week, and where. One line each
 * on a card, where the retired row joined them with a separator to save width
 * it did not have. Both parts are optional configuration, so each is omitted
 * rather than rendered as an empty caption.
 */
function StandingLines({ row }: Readonly<{ row: BoardRow }>) {
    return (
        <>
            {row.weeklySlot ? (
                <p className='type-caption text-secondary-foreground'>
                    {row.weeklySlot}
                </p>
            ) : null}
            {row.location ? (
                <p className='type-caption text-secondary-foreground'>
                    {row.location}
                </p>
            ) : null}
        </>
    );
}

/**
 * The Activity's own next scheduled date, or the **neutral** chip where it has
 * none. Neutral means *expected but not yet placed*, which is the honest state
 * of an Activity nobody has posted a session for — and the card keeps its place
 * either way, because a community that hides those is advertising less than it
 * runs.
 *
 * The label is not decoration: it is what says which of the footer's two
 * figures this one is, and the card gives it the room the row did not.
 */
function NextDate({ row, t }: Readonly<{ row: BoardRow; t: Dictionary }>) {
    return (
        <div className='flex min-w-0 flex-col gap-hair'>
            <p className='type-label text-subtle-foreground'>
                {t.landing.board.nextLabel}
            </p>
            {row.nextDate ? (
                <p className='type-figure text-card-foreground'>
                    {row.nextDate}
                </p>
            ) : (
                <Chip variant='neutral' label={t.chips.unposted} />
            )}
        </div>
    );
}

/** Both modes where an Activity offers both, monthly first. Zero reads as free, not as `Rp 0`. */
function Fee({ row }: Readonly<{ row: BoardRow }>) {
    return (
        <div className='text-right'>
            <p className='type-figure text-card-foreground'>{row.feePrimary}</p>
            {row.feeSecondary ? (
                <p className='type-caption text-subtle-foreground'>
                    {row.feeSecondary}
                </p>
            ) : null}
        </div>
    );
}

/**
 * A community with nothing configured keeps this band and renders one
 * neutral-chipped card. Dropping the band leaves the page a poster, and an
 * empty band is not embarrassing — it is what a community that has just been
 * set up actually looks like.
 *
 * It spans the grid rather than sitting in the first cell: one third-width card
 * beside two empty tracks reads as a layout that failed, which is the opposite
 * of what an empty state is for.
 */
function EmptyCard({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <Card className='sm:col-span-2 lg:col-span-3'>
            <CardContent className='flex flex-wrap items-center gap-cell'>
                <Chip variant='neutral' label={t.chips.unposted} />
                <p className='type-body text-secondary-foreground'>
                    {t.landing.board.empty}
                </p>
            </CardContent>
        </Card>
    );
}

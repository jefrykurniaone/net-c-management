import { Mark } from '@/components/ui/mark';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BoardRow } from '@/lib/landing-board';
import { Band, BandHead, Lattice, Livery } from './band';
import { QuietJoin } from './quiet-join';

/**
 * The only band below the seam, and the page's only per-community substance:
 * the copy above it is generic by decision, so if this band goes the page is a
 * generic poster.
 *
 * One row per active Activity, fused with that Activity's own next scheduled
 * date. There is no separate schedule section — this product's answer to "when
 * is badminton" has always been one row in one place, not two lists a reader has
 * to join by name.
 */
export function BoardBand({
    t,
    rows,
}: Readonly<{ t: Dictionary; rows: readonly BoardRow[] }>) {
    return (
        <Band>
            <BandHead head={t.landing.board.head} body={t.landing.board.body} />
            <Lattice>
                {rows.length > 0 ? (
                    rows.map((row) => (
                        <ActivityRow key={row.id} row={row} t={t} />
                    ))
                ) : (
                    <EmptyStrip t={t} />
                )}
            </Lattice>
            {/* The second action. The obvious closing composition — repeating
                the painted board as a bookend — is barred, painted board is
                confined to the hero; a full-bleed slab of the identity green
                was the alternative and competes with the hero's tile for the
                one loud action on the page. A quiet line is what is left, and
                on a page this short it is enough. */}
            <QuietJoin label={t.landing.board.cta} className='mt-block' />
        </Band>
    );
}

/**
 * One ruled row: the livery, the name and its standing arrangement, the next
 * date, and the fee — in fixed positions, so the row is read by position rather
 * than by label.
 *
 * The text column carries a `14rem` floor. Without it the fee column crushes
 * the weekly slot into a ragged four-line column on a phone; with it the fee
 * wraps to its own line and the row stacks into legible tiers instead.
 */
function ActivityRow({
    row,
    t,
}: Readonly<{ row: BoardRow; t: Dictionary }>) {
    return (
        <div className='flex flex-wrap items-baseline gap-cell p-block'>
            <Livery initial={row.initial} />
            <div className='min-w-[14rem] flex-1'>
                <p className='type-title text-card-foreground'>{row.name}</p>
                <StandingLine row={row} />
            </div>
            <NextDate row={row} t={t} />
            <Fee row={row} />
        </div>
    );
}

/**
 * The standing arrangement — when it runs every week and where. Both parts are
 * optional configuration, so the line is assembled from whichever exist and
 * omitted entirely rather than rendered as an empty caption.
 */
function StandingLine({ row }: Readonly<{ row: BoardRow }>) {
    const parts = [row.weeklySlot, row.location].filter(Boolean);
    if (parts.length === 0) return null;

    return (
        <p className='type-caption text-secondary-foreground'>
            {parts.join(' · ')}
        </p>
    );
}

/**
 * The Activity's own next scheduled date, or the **Blank** mark where it has
 * none. Blank means *expected but not yet placed*, which is the honest state of
 * an Activity nobody has posted a session for — and the row keeps its place
 * either way, because a board that hides its empty cells is a list of cards.
 *
 * The label earns its place on a phone, where the row stacks into tiers and
 * nothing else says which tier this is.
 */
function NextDate({ row, t }: Readonly<{ row: BoardRow; t: Dictionary }>) {
    return (
        <div className='min-w-[10rem]'>
            <p className='type-label text-subtle-foreground'>
                {t.landing.board.nextLabel}
            </p>
            {row.nextDate ? (
                <p className='type-figure text-card-foreground'>
                    {row.nextDate}
                </p>
            ) : (
                <Mark kind='blank'>{t.marks.unposted}</Mark>
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
 * A community with nothing configured keeps this band and renders it as one
 * Blank-marked strip. Dropping the band leaves the page a poster, and an empty
 * board is not embarrassing — it is what a community that has just been set up
 * actually looks like.
 */
function EmptyStrip({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <div className='flex flex-wrap items-center gap-cell p-block'>
            <Mark kind='blank'>{t.marks.unposted}</Mark>
            <p className='type-body text-secondary-foreground'>
                {t.landing.board.empty}
            </p>
        </div>
    );
}


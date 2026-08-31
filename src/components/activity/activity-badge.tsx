import { cn } from '@/lib/utils';
import { ActivityTile } from './activity-tile';

/**
 * Two compositions of {@link ActivityTile} — the tile plus the Activity's name
 * in a pill, and the tile standing alone in a list row.
 *
 * The tile itself lives in `./activity-tile`, which is the seam every surface
 * that names an Activity draws through. Nothing here decides what a tile looks
 * like; these only decide what sits beside one.
 *
 * `icon` is optional on both and passes straight through, so a caller that has
 * not been given the Activity's icon yet keeps rendering the initial exactly as
 * before rather than having to pass null.
 */

type ActivityLiveryProps = Readonly<{
    name: string;
    /** `Activity.icon` as stored; null or absent renders the initial. */
    icon?: string | null;
    className?: string;
}>;

/**
 * Tile plus the Activity name. The name is what tells two Activities sharing an
 * initial apart, so the tile is never the only identifier here — which is why
 * the tile inside it is `inline` and stays out of the accessible name.
 *
 * It draws its own pill rather than reaching for the status chip: a chip
 * carries one written state label in Label caps, and an Activity name is a
 * proper noun that must not be uppercased and is not a state. The shape is the
 * chip's — a pill, a hairline, a card face — so the two read as one family.
 */
export function ActivityBadge({ name, icon, className }: ActivityLiveryProps) {
    return (
        <span
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full',
                // `overflow-hidden` is load-bearing, not decoration: the tile is
                // a `rounded-md` square sitting at `pl-0.5` inside a pill, so
                // its left corners fall outside the pill's arc without it.
                'overflow-hidden border border-border bg-card py-0.5 pl-0.5 pr-2.5',
                'type-caption whitespace-nowrap text-secondary-foreground',
                className,
            )}>
            <ActivityTile name={name} icon={icon} size='inline' />
            {name}
        </span>
    );
}

/**
 * The tile on its own — list rows and Activity cards, where the Activity name
 * already sits beside it in the row's own text. It carries the name as its
 * accessible label so a dense register never leaves a glyph or an initial to
 * identify the Activity alone.
 */
export function ActivityInitial({ name, icon, className }: ActivityLiveryProps) {
    return <ActivityTile name={name} icon={icon} className={className} />;
}

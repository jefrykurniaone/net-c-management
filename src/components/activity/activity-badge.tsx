import { activityInitial } from '@/lib/activity-initial';
import { cn } from '@/lib/utils';

/**
 * Activity livery, Papan Jadwal: a magnet tile bearing the Activity's initial
 * in ink, with no colour fill. Court Green is the only green the system
 * permits, so a member-configured Activity colour would either compete with
 * the identity or dissolve into it — and an arbitrary hex can carry neither
 * legible lettering nor reliable contrast on both board materials. There is no
 * colour prop to pass: the column behind it has been dropped.
 */

type ActivityLiveryProps = Readonly<{
    name: string;
    className?: string;
}>;

/** The tile itself. Ink on tile, bounded by a visible rule, resting flat. */
function InitialTile({
    name,
    className,
    labelled,
}: Readonly<{ name: string; className?: string; labelled: boolean }>) {
    const label = name.trim();
    const isNamed = label.length > 0;

    return (
        <span
            {...(labelled && isNamed
                ? { role: 'img', 'aria-label': label, title: label }
                : { 'aria-hidden': true })}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-sm',
                'border border-rule bg-tile text-foreground shadow-tile',
                'select-none',
                className,
            )}>
            {activityInitial(name)}
        </span>
    );
}

/**
 * The bare tile, for a control that already carries the Activity name in its
 * own text — a filter chip, an onboarding pill. The name is the identifier
 * there and the tile is the glyph beside it, so the tile stays out of the
 * accessible name rather than doubling it.
 *
 * Inline, the tile is a small mark on the board's furniture, so it takes the
 * Label role; its host is already a bordered chip that clips its overflow, so
 * the tile drops its contact shadow.
 */
export function ActivityTile({ name, className }: ActivityLiveryProps) {
    return (
        <InitialTile
            name={name}
            labelled={false}
            className={cn('size-5 type-label shadow-none', className)}
        />
    );
}

/**
 * Tile plus the Activity name. The name is what tells two Activities sharing
 * an initial apart, so the tile is never the only identifier here.
 *
 * It draws its own pill rather than reaching for the status chip: a chip
 * carries one written state label in Label caps, and an Activity name is a
 * proper noun that must not be uppercased and is not a state. The shape is the
 * chip's — a pill, a hairline, a card face — so the two read as one family.
 */
export function ActivityBadge({ name, className }: ActivityLiveryProps) {
    return (
        <span
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full',
                // `overflow-hidden` is load-bearing, not decoration: the tile is
                // a `rounded-sm` square sitting at `pl-0.5` inside a pill, so
                // its left corners fall outside the pill's arc without it.
                // `ActivityTile` drops its contact shadow on the strength of
                // this clip.
                'overflow-hidden border border-border bg-card py-0.5 pl-0.5 pr-2.5',
                'type-caption whitespace-nowrap text-secondary-foreground',
                className,
            )}>
            <ActivityTile name={name} />
            {name}
        </span>
    );
}

/**
 * The tile on its own — list rows and Activity cards, where the Activity name
 * already sits beside it. It carries the name as its accessible label so a
 * dense register never leaves the initial to identify the Activity alone.
 */
export function ActivityInitial({ name, className }: ActivityLiveryProps) {
    // Standing alone the tile is a stamped letter, not a small mark, so it
    // takes the Title role at the size the board reads it.
    return (
        <InitialTile
            name={name}
            labelled
            className={cn('size-7 type-title', className)}
        />
    );
}

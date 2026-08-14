import { Badge } from '@/components/ui/badge';
import { activityInitial } from '@/lib/activity-initial';
import { cn } from '@/lib/utils';

/**
 * Activity livery, Papan Jadwal: a magnet tile bearing the Activity's initial
 * in ink, with no colour fill. Court Green is the only green the system
 * permits, so a member-configured Activity colour would either compete with
 * the identity or dissolve into it — and an arbitrary hex can carry neither
 * legible lettering nor reliable contrast on both board materials.
 *
 * The `color` prop is still accepted and deliberately ignored: this is the
 * expand half of an expand–contract, so every existing call site keeps
 * compiling while the read sites migrate in the tickets that follow.
 */

type ActivityLiveryProps = Readonly<{
    name: string;
    /** Accepted for call-site compatibility. Ignored — livery carries no colour. */
    color?: string;
    /** Likewise accepted and ignored; call sites still pass it. */
    icon?: string | null;
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

export function ActivityDot({
    color,
    className,
}: Readonly<{ color: string; className?: string }>) {
    return (
        <span
            aria-hidden
            className={cn('inline-block size-2 rounded-full shrink-0', className)}
            style={{ backgroundColor: color }}
        />
    );
}

/**
 * Tile plus the Activity name. The name is what tells two Activities sharing
 * an initial apart, so the tile is never the only identifier here.
 */
export function ActivityBadge({ name, className }: ActivityLiveryProps) {
    return (
        <Badge
            variant='outline'
            className={cn('h-auto gap-1.5 py-0.5 pl-0.5', className)}>
            {/* Inline, the tile is a small mark on the board's furniture, so
                it takes the Label role. The badge is already a bordered chip
                and clips its overflow, so the tile drops its contact shadow. */}
            <InitialTile
                name={name}
                labelled={false}
                className='size-5 type-label shadow-none'
            />
            {name}
        </Badge>
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

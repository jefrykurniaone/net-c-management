import { activityInitial } from '@/lib/activity-initial';
import { toActivityIconKey } from '@/lib/activity-icons';
import { cn } from '@/lib/utils';
import { ACTIVITY_ICON_GLYPHS } from './activity-icon-glyphs';

/**
 * The Activity's livery: one tile on the highlight surface, carrying the
 * Activity's chosen icon or — when it has none — its initial. The seam every
 * surface that names an Activity draws through, so no surface invents a tile of
 * its own; it takes data and never nodes.
 *
 * `--accent` on `--accent-foreground` with a `--border` hairline, because the
 * accent fill is a hue step rather than a lightness one and The Boundary Rule
 * (DESIGN.md) wants an edge a reader who cannot see the hue still gets. Every
 * pair here is asserted in `design-tokens.test.ts`. No shadow: depth in Rally is
 * a card lifted off the ground, and a 20px marker in a table row is not a card.
 */

/**
 * How much room the tile has, which decides both its size and whether it
 * carries the Activity's name into the accessibility tree.
 *
 * - **`inline`** — beside text that already names the Activity: a filter chip,
 *   an onboarding pill, a membership line. Decorative there, so it stays out of
 *   the accessible name rather than doubling it.
 * - **`row`** — the default. Standing alone in a list row or a card header,
 *   where nothing else would identify the Activity to a screen reader.
 * - **`lead`** — the same, one step up, where the tile leads a panel.
 */
export type ActivityTileSize = 'inline' | 'row' | 'lead';

export type ActivityTileProps = Readonly<{
    /** The Activity's name. Also the accessible name where the tile is labelled. */
    name: string;
    /**
     * `Activity.icon` as stored — a curated key, or null for the initial.
     * Deliberately widened to `string`: callers hand a row's column straight
     * in, and a key this build no longer offers falls back to the initial
     * rather than being cast into a lookup that has no entry for it.
     */
    icon?: string | null;
    size?: ActivityTileSize;
    /**
     * Override the labelling `size` implies. Defaults to labelled everywhere
     * except `inline`.
     */
    labelled?: boolean;
    className?: string;
}>;

const TILE_CLASS: Readonly<Record<ActivityTileSize, string>> = {
    inline: 'size-5 type-label',
    row: 'size-7 type-title',
    lead: 'size-9 type-title',
};

const GLYPH_CLASS: Readonly<Record<ActivityTileSize, string>> = {
    inline: 'size-3',
    row: 'size-4',
    lead: 'size-5',
};

const DEFAULT_SIZE: ActivityTileSize = 'row';

/** An `inline` tile sits beside its own name, so it is decoration there. */
function isLabelledBy(size: ActivityTileSize): boolean {
    return size !== 'inline';
}

export function ActivityTile({
    name,
    icon,
    size = DEFAULT_SIZE,
    labelled,
    className,
}: ActivityTileProps) {
    const key = toActivityIconKey(icon);
    const Glyph = key === null ? null : ACTIVITY_ICON_GLYPHS[key];
    const label = name.trim();
    const isLabelled = (labelled ?? isLabelledBy(size)) && label.length > 0;

    return (
        <span
            {...(isLabelled
                ? { role: 'img', 'aria-label': label, title: label }
                : { 'aria-hidden': true })}
            className={cn(
                'flex shrink-0 select-none items-center justify-center rounded-md',
                'border border-border bg-accent text-accent-foreground',
                TILE_CLASS[size],
                className,
            )}>
            {Glyph === null ? (
                activityInitial(name)
            ) : (
                <Glyph aria-hidden='true' className={GLYPH_CLASS[size]} />
            )}
        </span>
    );
}

import {
    Bike,
    CircleSlash,
    Dumbbell,
    Feather,
    Footprints,
    Goal,
    Mountain,
    SportShoe,
    Target,
    Timer,
    Trees,
    Trophy,
    Users,
    Volleyball,
    WavesHorizontal,
    WavesLadder,
    Weight,
    type LucideIcon,
} from 'lucide-react';
import type { ActivityIconKey } from '@/lib/activity-icons';

/**
 * One glyph per key in `ACTIVITY_ICON_KEYS` (`src/lib/activity-icons.ts`), from
 * the icon library the app already ships (`lucide-react`). Typed as a total
 * `Record`, so adding a key without a glyph is a compile error rather than a
 * blank tile.
 *
 * Where the spec named a sport `lucide-react` does not draw, the key is named
 * after the glyph rather than the sport — a key called `racket` pointing at
 * something that is not a racket would lie to the Admin picking it. What the
 * library actually lacks, and what stands in:
 *
 *  - **No racket, paddle or shuttlecock.** Badminton and the racket sports are
 *    served by `feather` — a shuttlecock is a feathered cork, and Indonesian
 *    names the sport for the feather (*bulu tangkis*) — and by `ball`.
 *  - **Exactly one ball.** `Volleyball` is the only ball in the library, so it
 *    carries the generic `ball` key; `goal` covers the goal sports beside it.
 *  - **No table tennis.** Dropped; `Table` is a data table, not a bat.
 *  - **No running figure.** `SportShoe` under the `shoe` key, with
 *    `footprints` beside it for walking and trail activities.
 *  - **No swimmer.** `WavesLadder` — the library's pool ladder — under `pool`.
 *  - **`Waves` was renamed.** It is `WavesHorizontal` in `lucide-react` 1.x.
 */
export const ACTIVITY_ICON_GLYPHS: Readonly<Record<ActivityIconKey, LucideIcon>> =
    {
        ball: Volleyball,
        goal: Goal,
        feather: Feather,
        target: Target,
        dumbbell: Dumbbell,
        weight: Weight,
        bike: Bike,
        shoe: SportShoe,
        footprints: Footprints,
        pool: WavesLadder,
        waves: WavesHorizontal,
        mountain: Mountain,
        trees: Trees,
        trophy: Trophy,
        timer: Timer,
        users: Users,
    };

/** The glyph for the picker's "no icon" choice. Not a stored key. */
export const ACTIVITY_ICON_NONE_GLYPH: LucideIcon = CircleSlash;

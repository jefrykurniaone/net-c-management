/**
 * The curated Activity icon set — the one place the keys are written down.
 *
 * `Activity.icon` stores one of these keys or null. It is deliberately a
 * nullable string column rather than a database enum: the set is a product
 * choice that will move, and an enum would need a migration every time it did.
 * This module is therefore the gate, and it is the *only* gate — the request
 * schema narrows through {@link isActivityIconKey}, so no value outside this
 * list is ever written.
 *
 * Two consequences follow from that, and both are deliberate:
 *
 *  - **An unknown key is dropped, never refused.** A client posting a key this
 *    build does not know keeps working; the field simply does not reach a
 *    column. See `src/lib/validations/activity.ts`.
 *  - **A stored key this build no longer offers reads back as null.** A key
 *    retired from the set here renders as the Activity's initial rather than
 *    breaking the row — {@link toActivityIconKey} is what every render path
 *    goes through, so that fallback is not a call site's decision.
 *
 * This module holds no glyphs and no React on purpose: the API route and the
 * validation schema import it, and neither should pull `lucide-react` in. The
 * key-to-glyph map lives beside the tile in
 * `src/components/activity/activity-icon-glyphs.ts` and is keyed off this list,
 * so the two cannot drift.
 *
 * Substitutions from the set the spec sketched are recorded in the pull request
 * for #164; in short, `lucide-react` ships exactly one ball and no racket,
 * shuttlecock or table-tennis glyph at all.
 */

/**
 * Sixteen keys. Stored verbatim, so a rename here is a data migration — add and
 * retire rather than rename.
 */
export const ACTIVITY_ICON_KEYS = [
    'ball',
    'goal',
    'feather',
    'target',
    'dumbbell',
    'weight',
    'bike',
    'shoe',
    'footprints',
    'pool',
    'waves',
    'mountain',
    'trees',
    'trophy',
    'timer',
    'users',
] as const satisfies readonly string[];

export type ActivityIconKey = (typeof ACTIVITY_ICON_KEYS)[number];

/**
 * A mutable copy, for the callers that cannot take a `readonly` array.
 *
 * Prisma's `in` filter is typed `string[]`, not `readonly string[]`, so passing
 * {@link ACTIVITY_ICON_KEYS} straight into one is a type error. Nothing in this
 * repository filters Activities by icon today; this exists so that the first
 * caller that needs to reaches for a spread of the one list rather than writing
 * a second copy of the keys.
 */
export function activityIconKeyList(): ActivityIconKey[] {
    return [...ACTIVITY_ICON_KEYS];
}

const KEY_LOOKUP: ReadonlySet<string> = new Set<string>(ACTIVITY_ICON_KEYS);

/** Whether an arbitrary value is one of the keys this build offers. */
export function isActivityIconKey(value: unknown): value is ActivityIconKey {
    return typeof value === 'string' && KEY_LOOKUP.has(value);
}

/**
 * The stored column narrowed for rendering: a key this build offers, or null.
 *
 * Every render path goes through this rather than casting, so a key retired
 * from the set above degrades to the initial tile on every surface at once
 * instead of reaching a glyph lookup that has no entry for it.
 */
export function toActivityIconKey(
    value: string | null | undefined,
): ActivityIconKey | null {
    return isActivityIconKey(value) ? value : null;
}

/**
 * The measures a member surface can take.
 *
 * `(main)/layout.tsx` used to impose one column width — `max-w-2xl`, 42rem — on
 * every member route at once. That works while every surface is a single
 * column of text and fields, and stops working the moment one of them is a
 * board: the week lattice needs 80rem, so inside 42rem it scrolled at every
 * desktop width rather than only where a viewport genuinely could not hold it.
 *
 * So the layout no longer decides. Each surface declares the measure its own
 * content needs, from this one list, and the names say what the surface *is*
 * rather than how wide it happens to be:
 *
 * - {@link TASK_MEASURE} — one task, one column. A form the member fills in.
 * - {@link COLUMN_MEASURE} — a reading column. Records, settings, a profile.
 * - {@link STRIP_MEASURE} — a wide multi-column grid. `/sessions`'s Activity
 *   sections; named for the week strip that used to be the only such surface.
 */

/** A single-task column: the Proof upload, onboarding. */
export const TASK_MEASURE = 'mx-auto w-full max-w-[40rem]';

/** A reading column: payments history, profile, session detail. */
export const COLUMN_MEASURE = 'mx-auto w-full max-w-2xl';

/**
 * `/sessions`'s measure — a three-across desktop grid of Activity sections,
 * one column on a phone (`docs/adr/0018-session-cards-outside-a-week.md`).
 * The page is no longer a week strip, but `80rem` is still the right cap for
 * this grid, so the constant keeps its name rather than forcing a rename
 * across its two callers (`src/app/(main)/sessions/page.tsx` and
 * `sessions/loading.tsx`) for a naming tidy-up alone; that rename is left to
 * whichever ticket next touches one of those callers for its own reason.
 *
 * `80rem` is 1280px, which is what a 1440px viewport leaves after the member
 * layout's own `md:p-6` gutter — originally sized to seven day columns and
 * six 10px gaps giving a 174px column with 154px of card content, the
 * measurement 0018 obsoletes. `80rem` is kept because the grid this page now
 * draws needs the same width: three ~380px cells still want the room seven
 * day columns did, and wider would escape the heading and filters above it.
 *
 * Below `lg` the grid is one column and this cap stops applying, which is why
 * it is a `max-w` rather than a fixed width.
 */
export const STRIP_MEASURE = 'mx-auto w-full max-w-[80rem]';

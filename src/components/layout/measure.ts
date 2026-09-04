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
 * - {@link STRIP_MEASURE} — seven day columns side by side. The week strip.
 */

/** A single-task column: the Proof upload, onboarding. */
export const TASK_MEASURE = 'mx-auto w-full max-w-[40rem]';

/** A reading column: payments history, profile, session detail. */
export const COLUMN_MEASURE = 'mx-auto w-full max-w-2xl';

/**
 * The week strip's measure — seven day columns that have to sit beside one
 * another without a horizontal rail (#159).
 *
 * `80rem` is 1280px, which is what a 1440px viewport leaves after the member
 * layout's own `md:p-6` gutter. Seven columns and six 10px gaps inside it give
 * a 174px column, and the Session card's `p-cell` padding leaves 154px of
 * content — enough for the longest chip label this product sets, the
 * Indonesian *Belum Dipasang*, with the card's own dashed and rounded edges
 * still clear of it. Narrower than this and the columns cannot hold a chip;
 * wider and the strip escapes the heading and filters above it.
 *
 * Below `lg` the strip is one column and this cap stops applying, which is why
 * it is a `max-w` rather than a fixed width.
 */
export const STRIP_MEASURE = 'mx-auto w-full max-w-[80rem]';

/**
 * The measures a member surface can take.
 *
 * `(main)/layout.tsx` used to impose one column width — `max-w-2xl`, 42rem — on
 * every member route at once. That works while every surface is a single
 * column of text and fields, and stops working the moment one of them is a
 * board: the week lattice needs 88rem, so inside 42rem it scrolled at every
 * desktop width rather than only where a viewport genuinely could not hold it.
 *
 * So the layout no longer decides. Each surface declares the measure its own
 * content needs, from this one list, and the names say what the surface *is*
 * rather than how wide it happens to be:
 *
 * - {@link TASK_MEASURE} — one task, one column. A form the member fills in.
 * - {@link COLUMN_MEASURE} — a reading column. Records, settings, a profile.
 * - {@link BOARD_MEASURE} — a board. Seven `12.5rem` day columns plus the 6px
 *   of shared rules between them and the 2px outer border (see DESIGN.md,
 *   *the settled decision*).
 *
 * DESIGN.md's own board cap is 72rem, which predates the lattice's measured
 * width; the two want reconciling in the document, not by narrowing the board
 * until its cells reflow.
 */

/** A single-task column: the Proof upload, onboarding. */
export const TASK_MEASURE = 'mx-auto w-full max-w-[40rem]';

/** A reading column: payments history, profile, a Session's detail. */
export const COLUMN_MEASURE = 'mx-auto w-full max-w-2xl';

/** A board surface: the sessions board, and the dashboard that composes it. */
export const BOARD_MEASURE = 'mx-auto w-full max-w-[88rem]';

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
 * - {@link COLUMN_MEASURE} — a reading column. Records, settings, a profile,
 *   and the sessions board, which reads as a week down the page.
 *
 * There is deliberately no board-width measure. The seven-column week lattice
 * needed one — 88rem, wider than this document's own 72rem board cap — and
 * that width was what made the board sit oddly against its own heading and
 * filters. A week read top to bottom needs no more room than any other column.
 */

/** A single-task column: the Proof upload, onboarding. */
export const TASK_MEASURE = 'mx-auto w-full max-w-[40rem]';

/** A reading column: the sessions board, payments history, profile, detail. */
export const COLUMN_MEASURE = 'mx-auto w-full max-w-2xl';

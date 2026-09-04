/**
 * One height for every control in an admin filter row — the search field, the
 * selects beside it and the submit button — so a row reads as one bar rather
 * than three controls of three heights. 40px is `Button`'s own `lg` size, which
 * is what the button in these rows takes.
 *
 * `py-0` is load-bearing: `Input` and `NativeSelect` carry `py-cell` (10px top
 * and bottom), which on a fixed-height, border-box control squeezes the text
 * into what is left of the box.
 */
export const FILTER_FIELD_CLASS = 'h-10 py-0';

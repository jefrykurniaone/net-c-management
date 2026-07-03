import type { ChangeEvent } from 'react';

const DECIMAL_RADIX = 10;

/**
 * Normalize an `<input type="number">` change into an integer form value.
 *
 * Returns `undefined` for an empty box so the field can be cleared while
 * typing (validation decides what a blank submit means), and rewrites the
 * DOM value when parsing strips leading zeros ("05" → "5") — React skips
 * that write because both sides parse as the same number, which would
 * otherwise leave the zero on screen.
 */
export function parseIntInput(
    e: ChangeEvent<HTMLInputElement>,
): number | undefined {
    const raw = e.target.value;
    if (raw === '') return undefined;
    const parsed = Number.parseInt(raw, DECIMAL_RADIX);
    if (Number.isNaN(parsed)) return undefined;
    const normalized = String(parsed);
    if (raw !== normalized) e.target.value = normalized;
    return parsed;
}

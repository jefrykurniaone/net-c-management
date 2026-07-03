import type { ChangeEvent } from 'react';

const DECIMAL_RADIX = 10;

/**
 * Normalize an `<input type="number">` change into an integer form value.
 *
 * Returns `''` for an empty box so the field can be cleared while typing —
 * react-hook-form ignores `onChange(undefined)` and keeps the previous
 * value, so the empty state must be an empty string (validation decides
 * what a blank submit means). Also rewrites the DOM value when parsing
 * strips leading zeros ("05" → "5") — React skips that write because both
 * sides parse as the same number, which would otherwise leave the zero on
 * screen.
 */
export function parseIntInput(
    e: ChangeEvent<HTMLInputElement>,
): number | '' {
    const raw = e.target.value;
    if (raw === '') return '';
    const parsed = Number.parseInt(raw, DECIMAL_RADIX);
    if (Number.isNaN(parsed)) return '';
    const normalized = String(parsed);
    if (raw !== normalized) e.target.value = normalized;
    return parsed;
}

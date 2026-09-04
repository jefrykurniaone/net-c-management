import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { Role } from '@prisma/client';

/**
 * The named steps of the spacing scale in `globals.css` (`--spacing-cell` and
 * its siblings). tailwind-merge knows only the stock numeric scale, so without
 * this it reads `py-cell` as a class from some other group than `py-0` and
 * keeps both — the cascade then decides, and a call site's own padding loses
 * silently. Observed on the per-page `<select>`: `py-0` did not displace the
 * primitive's `py-cell`, leaving 20px of vertical padding in a 28px box and
 * clipping the number.
 */
const SPACING_SCALE = ['hair', 'cell', 'block', 'bay', 'band', 'band-lead'];

const twMerge = extendTailwindMerge({
    extend: { theme: { spacing: SPACING_SCALE } },
});

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Whether a role has admin-level access. ADMIN and OWNER carry exactly the same
 * privileges — OWNER is not a third tier. The two differ only in what may be
 * done *to* the Owner: an OWNER account is refused every modification, and an
 * OWNER's contact details are not shown to an ADMIN. Both rules, and the script
 * that sets the role, are written up in docs/owner-role-immutability.md.
 */
export function isAdminRole(role: Role | string | null | undefined): boolean {
    return role === 'ADMIN' || role === 'OWNER';
}

/**
 * Defensive identity token for a blank community name. The configured name is
 * normally non-blank (getSettings() coalesces a blank value to the locale
 * default), so this is only reached if a blank name bypasses that guard —
 * it keeps the identity mark from rendering an empty/broken circle.
 */
const FALLBACK_ABBR = 'SC';

/**
 * Derive a short abbreviation (≤ 2 chars) from a community name.
 * e.g. "Sports Community" → "SC", "Komunitas Olahraga" → "KO", "Yoga" → "YO".
 * Falls back to a stable token for an empty/whitespace-only name.
 */
export function communityAbbr(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return FALLBACK_ABBR;
    const words = trimmed.split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

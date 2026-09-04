import type { Dictionary } from './i18n/dictionaries';

/**
 * The public page's hero photograph: bucket, upload and remove (#155).
 *
 * Client-side mirror of `/api/settings/hero-image`'s gate, same shape as
 * `src/lib/proof-file.ts`'s proof-upload gate. Catching a bad file on
 * `change` gives instant feedback instead of a round-trip 400; the server
 * stays the source of truth and runs the same function.
 *
 * `HeroImageCandidate` rather than the DOM `File` type: the check only ever
 * reads `type` and `size`, and a narrow structural type lets a test build a
 * candidate without a `File` constructor.
 */
export const HERO_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_HERO_IMAGE_BYTES = 5 * 1024 * 1024;

export interface HeroImageCandidate {
    readonly type: string;
    readonly size: number;
}

/**
 * Returns a localized refusal message, or `null` when the file is
 * acceptable. Reuses `validation.fileTypeInvalid` and `validation.fileSizeProof`
 * rather than a new pair of strings: the mime allow-list and the 5MB cap are
 * exactly what the payment-proof upload already enforces, so the refusal an
 * Admin reads is a string this codebase has already translated and shipped.
 */
export function validateHeroImageFile(
    file: HeroImageCandidate,
    t: Dictionary,
): string | null {
    if (!ALLOWED_TYPES.has(file.type)) {
        return t.validation.fileTypeInvalid;
    }
    if (file.size > MAX_HERO_IMAGE_BYTES) {
        return t.validation.fileSizeProof;
    }
    return null;
}

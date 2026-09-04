import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Client-side mirror of the server's proof-upload gate (see
 * `src/app/api/payments/upload/route.ts`). Catching a bad file on `change`
 * gives instant feedback instead of a round-trip 400; the server stays the
 * source of truth.
 */
export const PROOF_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

/** Returns a localized error message, or null when the file is acceptable. */
export function validateProofFile(file: File, t: Dictionary): string | null {
    if (!ALLOWED_TYPES.has(file.type)) return t.validation.fileTypeInvalid;
    if (file.size > MAX_PROOF_BYTES) return t.validation.fileSizeProof;
    return null;
}

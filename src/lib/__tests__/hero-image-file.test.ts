import { describe, it, expect } from 'vitest';
import { validateHeroImageFile, type HeroImageCandidate } from '../hero-image-file';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The hero-image upload route's validation seam (#155): mime and size, at
 * the same 5MB cap and the same mime allow-list `src/lib/proof-file.ts`
 * already enforces for payment proofs.
 */

const FIVE_MB = 5 * 1024 * 1024;

function candidate(overrides: Partial<HeroImageCandidate> = {}): HeroImageCandidate {
    return { type: 'image/jpeg', size: 4 * 1024 * 1024, ...overrides };
}

describe('validateHeroImageFile', () => {
    it.each(LOCALES)('accepts a 4MB JPEG in %s', (locale) => {
        const t = getDictionary(locale);
        expect(validateHeroImageFile(candidate(), t)).toBeNull();
    });

    it.each(LOCALES)('accepts a PNG and a WebP at the cap in %s', (locale) => {
        const t = getDictionary(locale);
        expect(
            validateHeroImageFile(candidate({ type: 'image/png', size: FIVE_MB }), t),
        ).toBeNull();
        expect(
            validateHeroImageFile(candidate({ type: 'image/webp' }), t),
        ).toBeNull();
    });

    it.each(LOCALES)('refuses a GIF, naming the format rule, in %s', (locale) => {
        const t = getDictionary(locale);
        expect(validateHeroImageFile(candidate({ type: 'image/gif' }), t)).toBe(
            t.validation.fileTypeInvalid,
        );
    });

    it.each(LOCALES)('refuses a file over 5MB, naming the size rule, in %s', (locale) => {
        const t = getDictionary(locale);
        expect(
            validateHeroImageFile(candidate({ size: FIVE_MB + 1 }), t),
        ).toBe(t.validation.fileSizeProof);
    });

    it('checks format before size, so a too-big GIF is refused for its format', () => {
        const t = getDictionary('en');
        const refusal = validateHeroImageFile(
            candidate({ type: 'image/gif', size: FIVE_MB + 1 }),
            t,
        );
        expect(refusal).toBe(t.validation.fileTypeInvalid);
    });
});

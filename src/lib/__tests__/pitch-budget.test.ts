import { describe, it, expect } from 'vitest';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * DESIGN.md, The Pitch Budget Rule. Two limits, not one, because two different
 * things break and neither predicts the other: total length drives line count
 * and therefore the fold, while the longest word drives horizontal overflow at
 * both ends of the `type-hero` clamp.
 *
 * Length needs no judgement, which is why this escapes the false-positive
 * problem that rules out testing whether a string has actually been translated.
 */
const MAX_PITCH_CHARACTERS = 48;
const MAX_WORD_CHARACTERS = 12;

/**
 * Punctuation does not set type wider than the glyphs around it, and the
 * measurement behind the 12-character limit counted letters: `MEMAINKANNYA.` is
 * twelve letters plus a period, and it fits.
 */
function longestWord(pitch: string): string {
    return pitch
        .split(/\s+/)
        .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
        .reduce((longest, word) => (word.length > longest.length ? word : longest), '');
}

describe('The Pitch Budget Rule', () => {
    it('holds the Indonesian pitch inside the character budget', () => {
        const pitch = getDictionary('id').landing.hero.pitch;

        expect(pitch.length, pitch).toBeLessThanOrEqual(MAX_PITCH_CHARACTERS);
    });

    it.each(LOCALES)('carries no word too wide for the measure in %s', (locale) => {
        const word = longestWord(getDictionary(locale).landing.hero.pitch);

        expect(word.length, word).toBeLessThanOrEqual(MAX_WORD_CHARACTERS);
    });
});

import { describe, it, expect } from 'vitest';
import { getDictionary, LOCALES } from '../i18n/dictionaries';
import { PUBLIC_COPY_CAPS } from '../public-copy';

/**
 * DESIGN.md, The Pitch Budget Rule. Two limits, not one, because two different
 * things break and neither predicts the other: total length drives line count
 * and therefore the fold, while the longest word drives horizontal overflow at
 * both ends of the Display clamp.
 *
 * Length needs no judgement, which is why this escapes the false-positive
 * problem that rules out testing whether a string has actually been translated.
 *
 * **Re-measured against Display (#154), and unchanged.** The numbers were set
 * when the pitch ran at the retired Hero role — `5rem`, regular width. Display
 * is `clamp(2rem, 4.6vw, 3.5rem)` at `wdth` 66, so the same string now sets
 * roughly a third narrower per character at the top of the clamp and the top
 * of the clamp is 56px rather than 80px. Both ends of the range therefore got
 * *more* headroom, not less:
 *
 *  - at 390px, the clamp floors at 2rem = 32px and the hero's content box is
 *    358px. Twelve condensed caps land near 170px there, under half the box.
 *  - at 1440px, the clamp ceilings at 3.5rem = 56px inside the hero's 48rem
 *    text measure — 768px. The same twelve land near 300px.
 *  - 48 characters at the 32px floor is two lines of a 30px line box, which is
 *    the count the fold budget was written for.
 *
 * So the assertions keep their numbers. Condensing a role is not a licence to
 * relax a budget it made more comfortable — and since #153 these are not this
 * test's numbers alone.
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
    /**
     * The budget has two authors since #153: this file holds the dictionary
     * fallback to it, and `PUBLIC_COPY_CAPS` refuses an Admin's headline that
     * breaks it. Two independent copies of a number are a number that drifts,
     * and deriving the constants above from the caps would let a raised cap
     * silently take the fallback with it — so both are written down and this
     * asserts they agree.
     */
    it('holds the same numbers the Admin write path enforces', () => {
        expect(PUBLIC_COPY_CAPS.heroHeadline).toBe(MAX_PITCH_CHARACTERS);
        expect(PUBLIC_COPY_CAPS.heroHeadlineWord).toBe(MAX_WORD_CHARACTERS);
    });

    it('holds the Indonesian pitch inside the character budget', () => {
        const pitch = getDictionary('id').landing.hero.pitch;

        expect(pitch.length, pitch).toBeLessThanOrEqual(MAX_PITCH_CHARACTERS);
    });

    it.each(LOCALES)('carries no word too wide for the measure in %s', (locale) => {
        const word = longestWord(getDictionary(locale).landing.hero.pitch);

        expect(word.length, word).toBeLessThanOrEqual(MAX_WORD_CHARACTERS);
    });

    /**
     * The subline is Statement rather than Display, so the word rule does not
     * reach it — but its 120-character cap is what the hero band's three-line
     * allowance was measured against, and the dictionary fallback has to fit
     * the same box an Admin's value does.
     */
    it.each(LOCALES)('holds the %s subline inside the subline cap', (locale) => {
        const lead = getDictionary(locale).landing.hero.lead;

        expect(lead.length, lead).toBeLessThanOrEqual(
            PUBLIC_COPY_CAPS.heroSubline,
        );
    });
});

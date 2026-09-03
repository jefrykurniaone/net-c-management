import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDictionary, LOCALES } from '../i18n/dictionaries';
import { longestWordLength, PUBLIC_COPY_CAPS } from '../public-copy';

/**
 * #209. The community name is the one Settings value that is *typeset* rather
 * than merely stored, and #209 took away the two things that used to absorb an
 * unfamiliar one: `break-words`, which broke it mid-word, and the landing rail's
 * `min-w-0`, which sized the wordmark narrower than its own longest word so that
 * there was something to break. What replaces them is a wrap — the rail yields
 * its control row a second row — plus a bound on the value itself, because no
 * size the design system owns is small enough to hold an unbounded word and both
 * truncation and a mid-word break are refused.
 *
 * Two limits, not one, for the reason `pitch-budget.test.ts` already gives about
 * the hero headline: total length drives line count and therefore the rail's
 * height, while the longest word drives horizontal overflow. Neither predicts
 * the other.
 *
 * **The measurement that chose the numbers.** Headless Chromium, 2026-09-04,
 * against the committed Archivo variable font and the `type-title` role verbatim
 * (17px, weight 700, letter-spacing -0.01em), at a 390px viewport. Scripts under
 * `.claude/scratch/w3-209-*.mjs`.
 *
 *  - Per-glyph advance at that role: `W` 16.218px is the widest in the family,
 *    ahead of `m` 14.977 and `M` 14.654; `a` is 9.69 and `i` 4.369. A cap in
 *    characters only bounds a width if it is measured against the widest glyph,
 *    so `W` is what the word cap is measured against.
 *  - 312px is the narrowest width a rail gives the wordmark at 390px: the
 *    threshold rail's line (390 less 32px of `px-block`, a 36px mark and a 10px
 *    `gap-cell`), which is also what the landing rail yields once its control
 *    row wraps. 18 letters of `W` measure 291.94px there, 19 measure 308.16px
 *    and 20 measure 324.38px — so 19 is the ceiling and 18 is the cap, keeping
 *    20.06px of margin and still admitting every real word tested, including
 *    `Sportgemeinschaft` at 17 letters.
 *  - Total length was measured at the landing rail's *unwrapped* 164.06px in
 *    `en`, the tighter of the two locales: a realistic 46-character name sets 3
 *    line boxes and 49 characters is where a 4th begins.
 *
 * The rail assertions read the components back off disk the same way
 * `form-primitive-roles.test.ts` and `design-tokens.test.ts` do, so a
 * `break-words` creeping back in fails on a string rather than on a screenshot —
 * which is the point, because a mid-word break is invisible to a measure of
 * element boxes.
 */

/** Measured, not assumed. Raising either cap means re-running the probe. */
const WIDEST_GLYPH_ADVANCE_PX = 16.218;
/** `W` x 18 at the role's 17px. */
const MAX_WORD_WIDTH_PX = 291.94;
/** The narrowest width any rail gives the wordmark at a 390px viewport. */
const NARROWEST_WORDMARK_WIDTH_PX = 312;

const SRC_DIR = join(process.cwd(), 'src');
const routeSource = readFileSync(
    join(SRC_DIR, 'app', 'api', 'settings', 'route.ts'),
    'utf8',
);
const identityRailSource = readFileSync(
    join(SRC_DIR, 'components', 'landing', 'identity-rail.tsx'),
    'utf8',
);
const thresholdRailSource = readFileSync(
    join(SRC_DIR, 'components', 'layout', 'threshold-rail.tsx'),
    'utf8',
);

/** One `const NAME = <number>;` out of the route, so the cap has one home. */
function readCap(name: string): number {
    const match = routeSource.match(
        new RegExp(`const ${name} = (\\d+);`),
    );
    if (!match) {
        throw new Error(`${name} not found in src/app/api/settings/route.ts`);
    }
    return Number(match[1]);
}

const MAX_LENGTH = readCap('COMMUNITY_NAME_MAX_LENGTH');
const MAX_WORD_LENGTH = readCap('COMMUNITY_NAME_MAX_WORD_LENGTH');

/** The class attribute of the wordmark span in one rail's source. */
function wordmarkClasses(source: string): string {
    const match = source.match(
        /<span className='([^']*type-title[^']*)'>\s*\{communityName\}/,
    );
    return match?.[1] ?? '';
}

describe('community name caps (#209)', () => {
    it('pins the two caps the settings route enforces', () => {
        expect(MAX_LENGTH).toBe(48);
        expect(MAX_WORD_LENGTH).toBe(18);
    });

    it('caps the word at a width the narrowest rail can hold, measured against the widest glyph in the family', () => {
        // The arithmetic the cap rests on: raise MAX_WORD_LENGTH without
        // re-measuring and this fails rather than shipping a rail that bleeds.
        expect(MAX_WORD_LENGTH * WIDEST_GLYPH_ADVANCE_PX).toBeCloseTo(
            MAX_WORD_WIDTH_PX,
            0,
        );
        expect(MAX_WORD_WIDTH_PX).toBeLessThan(NARROWEST_WORDMARK_WIDTH_PX);
        // 20 letters of `W` measured 324.38px and overflowed, so the cap has to
        // sit below 20 whatever else changes.
        expect(
            (MAX_WORD_LENGTH + 2) * WIDEST_GLYPH_ADVANCE_PX,
        ).toBeGreaterThan(NARROWEST_WORDMARK_WIDTH_PX);
    });

    it('holds the name to no looser a rule than the hero headline on the same page', () => {
        expect(MAX_LENGTH).toBe(PUBLIC_COPY_CAPS.heroHeadline);
    });

    it('admits the default brand and every realistic community name', () => {
        for (const name of [
            'XClub Community',
            'Netral Badminton Community',
            'Perkumpulan Bulutangkis Netral',
            'Komunitas Olahraga Bulutangkis Netral Jakarta',
            'Sportgemeinschaft',
            'PERBULUTANGKISAN',
        ]) {
            expect(name.length).toBeLessThanOrEqual(MAX_LENGTH);
            expect(longestWordLength(name)).toBeLessThanOrEqual(
                MAX_WORD_LENGTH,
            );
        }
    });

    it('refuses the two shapes that cannot fit, and only those', () => {
        // 49 characters: measured as the first length that sets a 4th line box
        // in the landing rail at 390px.
        const tooLong = 'Komunitas Bulutangkis Warga Jakarta Selatan Pusat';
        expect(tooLong.length).toBeGreaterThan(MAX_LENGTH);
        expect(longestWordLength(tooLong)).toBeLessThanOrEqual(MAX_WORD_LENGTH);

        // 20 letters in one word: 324.38px of `W` against a 312px rail.
        const tooWide = 'Bundesligamannschaft';
        expect(tooWide.length).toBeLessThanOrEqual(MAX_LENGTH);
        expect(longestWordLength(tooWide)).toBeGreaterThan(MAX_WORD_LENGTH);
    });

    it('names the cap in both locales, from the number rather than in prose', () => {
        for (const locale of LOCALES) {
            const t = getDictionary(locale);
            expect(t.validation.communityNameTooLong).toContain('{max}');
            expect(t.validation.communityNameWordTooLong).toContain('{max}');
            expect(t.validation.communityNameTooLong).not.toMatch(/\d/);
            expect(t.validation.communityNameWordTooLong).not.toMatch(/\d/);
        }
    });

    it('substitutes the cap into the refusal the Admin reads', () => {
        const t = getDictionary('en');
        expect(
            t.validation.communityNameTooLong.replace(
                '{max}',
                String(MAX_LENGTH),
            ),
        ).toBe('Community name cannot exceed 48 characters');
        expect(
            t.validation.communityNameWordTooLong.replace(
                '{max}',
                String(MAX_WORD_LENGTH),
            ),
        ).toBe('Community name cannot contain a word longer than 18 letters');
    });

    it('enforces both caps in the settings route, from the shared word measure', () => {
        expect(routeSource).toContain('longestWordLength');
        expect(routeSource).toContain('communityNameTooLong');
        expect(routeSource).toContain('communityNameWordTooLong');
        expect(routeSource).toContain('communityNameRequired');
    });
});

describe('wordmark wrapping (#209)', () => {
    it('has no break-words left on either rail', () => {
        expect(identityRailSource).not.toMatch(/className=.*break-words/);
        expect(thresholdRailSource).not.toMatch(/className=.*break-words/);
    });

    it('wears type-title alone on both rails, with no raw size, weight, tracking or transform beside it', () => {
        for (const classes of [
            wordmarkClasses(identityRailSource),
            wordmarkClasses(thresholdRailSource),
        ]) {
            expect(classes).toContain('type-title');
            expect(classes).toContain('text-foreground');
            expect(classes).not.toMatch(/\bbreak-words\b/);
            expect(classes).not.toMatch(/\btext-(xs|sm|base|lg|xl|\[)/);
            expect(classes).not.toMatch(/\bfont-(thin|normal|medium|semibold|bold|extrabold|black)\b/);
            expect(classes).not.toMatch(/\b(tracking|leading|uppercase|lowercase|capitalize)/);
        }
    });

    it('lets the landing rail yield a whole row to the wordmark: flex-wrap on the row, no min-width floor removed from the mark group', () => {
        expect(identityRailSource).toMatch(/flex-wrap/);
        // `min-w-0` on the group or on the span sets the flex item's
        // min-content contribution to zero, which is what let the row size the
        // wordmark below its own longest word. Both are gone.
        expect(identityRailSource).not.toMatch(
            /className='flex min-w-0 flex-1 items-center/,
        );
        expect(wordmarkClasses(identityRailSource)).not.toMatch(/\bmin-w-0\b/);
    });

    it('keeps min-w-0 on the threshold rail, which has no control row to yield', () => {
        expect(wordmarkClasses(thresholdRailSource)).toContain('min-w-0');
    });
});

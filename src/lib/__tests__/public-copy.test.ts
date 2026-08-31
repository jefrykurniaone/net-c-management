import { describe, it, expect } from 'vitest';
import {
    PUBLIC_COPY_CAPS,
    PUBLIC_COPY_KEYS,
    PUBLIC_FEATURE_CARD_COUNT,
    checkPublicCopyPatch,
    checkPublicCopyValue,
    publicCopyCap,
    publicCopyRefusalMessage,
    resolvePublicCopy,
    type PublicCopyKey,
    type PublicCopyRefusal,
    type StoredPublicCopy,
} from '../public-copy';
import { getDictionary, LOCALES } from '../i18n/dictionaries';

/**
 * The caps and the fallbacks an Admin's public copy is judged by (#153).
 *
 * These are outcome tests, not storage tests: what an Admin is refused, and
 * what a stranger ends up reading. The caps themselves are pinned once, because
 * they are numbers the spec names rather than numbers this module is free to
 * choose, and everything below then reads them off the module so the form, the
 * API and these assertions can never disagree about one.
 */

const HEADLINE: PublicCopyKey = 'publicHeroHeadline';
const SUBLINE: PublicCopyKey = 'publicHeroSubline';

/**
 * `length` characters of filler whose longest word is ten letters, so a
 * length case never trips the headline's separate word rule by accident.
 */
const FILLER_UNIT = 'abcdefghij ';

function filler(length: number): string {
    return FILLER_UNIT.repeat(Math.ceil(length / FILLER_UNIT.length)).slice(
        0,
        length,
    );
}

function word(letters: number): string {
    return 'a'.repeat(letters);
}

/** The refusal a value must produce, so the message tests need no null guard. */
function refusalFor(key: PublicCopyKey, value: string): PublicCopyRefusal {
    const refusal = checkPublicCopyValue(key, value);
    if (!refusal) {
        throw new Error(`Expected ${key} to be refused: ${value}`);
    }
    return refusal;
}

/** A `PATCH` body carrying a key this module does not own. */
interface PatchWithOtherKeys extends StoredPublicCopy {
    communityName?: string;
}

const COPY_KEYS: PublicCopyKey[] = [...PUBLIC_COPY_KEYS];

describe('Public copy caps', () => {
    it('pins the caps the spec names', () => {
        expect(PUBLIC_COPY_CAPS).toEqual({
            heroHeadline: 48,
            heroHeadlineWord: 12,
            heroSubline: 120,
            about: 600,
            featureTitle: 32,
            featureLine: 120,
        });
    });

    it('offers four feature cards', () => {
        expect(PUBLIC_FEATURE_CARD_COUNT).toBe(4);
    });

    it.each(COPY_KEYS)('accepts %s at its cap', (key) => {
        expect(checkPublicCopyValue(key, filler(publicCopyCap(key)))).toBeNull();
    });

    it.each(COPY_KEYS)('refuses %s one character over its cap', (key) => {
        const cap = publicCopyCap(key);

        expect(checkPublicCopyValue(key, filler(cap + 1))).toEqual({
            key,
            rule: 'length',
            cap,
        });
    });

    it('accepts a headline word at the word cap', () => {
        const value = word(PUBLIC_COPY_CAPS.heroHeadlineWord);

        expect(checkPublicCopyValue(HEADLINE, value)).toBeNull();
    });

    it('refuses a headline word one letter over the word cap', () => {
        const value = word(PUBLIC_COPY_CAPS.heroHeadlineWord + 1);

        expect(checkPublicCopyValue(HEADLINE, value)).toEqual({
            key: HEADLINE,
            rule: 'word',
            cap: PUBLIC_COPY_CAPS.heroHeadlineWord,
        });
    });

    it('counts letters, not punctuation, in a headline word', () => {
        const value = `${word(PUBLIC_COPY_CAPS.heroHeadlineWord)}.`;

        expect(checkPublicCopyValue(HEADLINE, value)).toBeNull();
    });

    it('applies the word rule to the headline only', () => {
        const value = word(PUBLIC_COPY_CAPS.heroHeadlineWord + 1);

        expect(checkPublicCopyValue(SUBLINE, value)).toBeNull();
    });
});

describe('Public copy refusal', () => {
    it.each(LOCALES)('names the character cap in %s', (locale) => {
        const refusal = refusalFor(
            HEADLINE,
            filler(PUBLIC_COPY_CAPS.heroHeadline + 1),
        );
        const message = publicCopyRefusalMessage(refusal, getDictionary(locale));

        expect(message).toContain(String(PUBLIC_COPY_CAPS.heroHeadline));
        expect(message).not.toContain('{max}');
    });

    it.each(LOCALES)('names the word cap in %s', (locale) => {
        const refusal = refusalFor(
            HEADLINE,
            word(PUBLIC_COPY_CAPS.heroHeadlineWord + 1),
        );
        const message = publicCopyRefusalMessage(refusal, getDictionary(locale));

        expect(message).toContain(String(PUBLIC_COPY_CAPS.heroHeadlineWord));
        expect(message).not.toContain('{max}');
    });

    it('passes a whole body with nothing over a cap', () => {
        const patch: StoredPublicCopy = {
            publicHeroHeadline: filler(PUBLIC_COPY_CAPS.heroHeadline),
            publicAbout: filler(PUBLIC_COPY_CAPS.about),
            publicFeature3Title: filler(PUBLIC_COPY_CAPS.featureTitle),
        };

        expect(checkPublicCopyPatch(patch)).toBeNull();
    });

    it('refuses a body carrying one over-cap field', () => {
        const patch: StoredPublicCopy = {
            publicHeroHeadline: filler(PUBLIC_COPY_CAPS.heroHeadline),
            publicFeature2Line: filler(PUBLIC_COPY_CAPS.featureLine + 1),
        };

        expect(checkPublicCopyPatch(patch)).toEqual({
            key: 'publicFeature2Line',
            rule: 'length',
            cap: PUBLIC_COPY_CAPS.featureLine,
        });
    });

    it('leaves every other Settings key alone', () => {
        const patch: PatchWithOtherKeys = {
            communityName: filler(PUBLIC_COPY_CAPS.about + 1),
        };

        expect(checkPublicCopyPatch(patch)).toBeNull();
    });
});

describe('Public copy fallback resolution', () => {
    it.each(LOCALES)('falls back to the %s dictionary hero', (locale) => {
        const t = getDictionary(locale);

        const copy = resolvePublicCopy({}, t);

        expect(copy.heroHeadline).toBe(t.landing.hero.pitch);
        expect(copy.heroSubline).toBe(t.landing.hero.lead);
    });

    it('treats a whitespace-only headline as unwritten', () => {
        const t = getDictionary('en');

        const copy = resolvePublicCopy({ publicHeroHeadline: '   ' }, t);

        expect(copy.heroHeadline).toBe(t.landing.hero.pitch);
    });

    it("shows the Admin's headline over the dictionary's", () => {
        const copy = resolvePublicCopy(
            { publicHeroHeadline: 'Turn up on Tuesday' },
            getDictionary('en'),
        );

        expect(copy.heroHeadline).toBe('Turn up on Tuesday');
    });

    it('shows one value in both locales, never a translation', () => {
        const stored: StoredPublicCopy = { publicHeroHeadline: 'Ayo main' };

        const both = LOCALES.map(
            (locale) => resolvePublicCopy(stored, getDictionary(locale)).heroHeadline,
        );

        expect(both).toEqual(['Ayo main', 'Ayo main']);
    });

    it('hides the about paragraph when it is unwritten', () => {
        expect(resolvePublicCopy({}, getDictionary('en')).about).toBeNull();
        expect(
            resolvePublicCopy({ publicAbout: '  \n ' }, getDictionary('en')).about,
        ).toBeNull();
    });

    it('keeps the line breaks inside an about paragraph', () => {
        const copy = resolvePublicCopy(
            { publicAbout: '\nWe play on Tuesdays.\n\nEveryone is welcome.\n' },
            getDictionary('en'),
        );

        expect(copy.about).toBe('We play on Tuesdays.\n\nEveryone is welcome.');
    });

    it('drops a feature card with no title', () => {
        const copy = resolvePublicCopy(
            {
                publicFeature1Title: 'A standing slot',
                publicFeature1Line: 'The same time every week.',
                publicFeature2Line: 'A line with no title above it.',
                publicFeature3Title: '   ',
                publicFeature4Title: 'One place for dues',
            },
            getDictionary('en'),
        );

        // The surviving cards keep the slot they were written in, so slot 4 is
        // still position 4 after slots 2 and 3 have been dropped — which is
        // what makes the rendered list's key stable (#154).
        expect(copy.features).toEqual([
            {
                position: 1,
                title: 'A standing slot',
                line: 'The same time every week.',
            },
            { position: 4, title: 'One place for dues', line: '' },
        ]);
    });

    it('renders no feature cards when none carries a title', () => {
        const copy = resolvePublicCopy(
            { publicFeature1Line: 'Orphaned line.' },
            getDictionary('en'),
        );

        expect(copy.features).toEqual([]);
    });
});

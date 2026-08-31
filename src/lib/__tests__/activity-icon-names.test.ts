import { describe, expect, it } from 'vitest';
import {
    ACTIVITY_ICON_KEYS,
    activityIconKeyList,
    isActivityIconKey,
    toActivityIconKey,
} from '../activity-icons';
import { getDictionary, type Locale } from '../i18n/dictionaries';

/**
 * The icon set is stored data with a rendered name, so two things have to stay
 * true of it and neither is self-evident from reading one file:
 *
 *  - **Every key is named in both locales.** An Admin picking from a grid of
 *    sixteen glyphs has nothing but the accessible name to tell two of them
 *    apart, and an English name leaking into the Indonesian back office is the
 *    failure this asserts against. TypeScript already refuses a *missing* key,
 *    because the picker indexes `names` by `ActivityIconKey`; what it cannot
 *    see is a name left blank or copied across untranslated.
 *  - **The keys are unique and stable.** They are written to the database, so a
 *    duplicate would silently collapse two choices into one.
 */
const LOCALES: readonly Locale[] = ['en', 'id'];

const namesFor = (locale: Locale) => getDictionary(locale).activityIcon.names;

describe('the curated Activity icon set', () => {
    it('carries sixteen keys, none repeated', () => {
        expect(new Set(ACTIVITY_ICON_KEYS).size).toBe(
            ACTIVITY_ICON_KEYS.length,
        );
        expect(ACTIVITY_ICON_KEYS).toHaveLength(16);
    });

    it.each(LOCALES)('names every key in %s', (locale) => {
        const names = namesFor(locale);
        const unnamed = ACTIVITY_ICON_KEYS.filter(
            (key) => names[key].trim().length === 0,
        );

        expect(unnamed).toEqual([]);
    });

    it.each(LOCALES)('gives each key its own name in %s', (locale) => {
        const names = namesFor(locale);
        const spoken = ACTIVITY_ICON_KEYS.map((key) => names[key]);

        expect(new Set(spoken).size).toBe(spoken.length);
    });

    it('translates the set rather than reusing the English names', () => {
        const en = namesFor('en');
        const id = namesFor('id');
        const translated = ACTIVITY_ICON_KEYS.filter(
            (key) => en[key] !== id[key],
        );

        // A handful of names are the same word in both — "Target" is one — so
        // this asserts that the block was translated, not that every entry
        // differs.
        expect(translated.length).toBeGreaterThan(
            ACTIVITY_ICON_KEYS.length / 2,
        );
    });

    it('names the "no icon" choice in both locales', () => {
        const spoken = LOCALES.map(
            (locale) => getDictionary(locale).activityIcon.none,
        );

        expect(spoken.every((label) => label.trim().length > 0)).toBe(true);
        expect(new Set(spoken).size).toBe(LOCALES.length);
    });
});

describe('narrowing a stored icon', () => {
    it.each(ACTIVITY_ICON_KEYS)('keeps %s, a key in the set', (key) => {
        expect(toActivityIconKey(key)).toBe(key);
    });

    it.each([
        ['null, the Activity with no icon', null],
        ['undefined, a row read without the column', undefined],
        ['a key this build no longer offers', 'shuttlecock'],
        ['an empty string', ''],
    ])('falls back to the initial for %s', (_label, stored) => {
        expect(toActivityIconKey(stored)).toBeNull();
        expect(isActivityIconKey(stored)).toBe(false);
    });

    /**
     * Prisma's `in` filter is typed `string[]`, not `readonly string[]`, so a
     * caller that needs one has to have a mutable copy to reach for rather than
     * writing a second list of the keys.
     */
    it('hands out a mutable copy that is not the frozen set', () => {
        const list = activityIconKeyList();

        expect(list).toEqual([...ACTIVITY_ICON_KEYS]);
        expect(list).not.toBe(ACTIVITY_ICON_KEYS);
    });
});

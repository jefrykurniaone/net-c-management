import type { Dictionary } from './i18n/dictionaries';

/**
 * The Admin's own words for the public page: the one place in this codebase
 * where a user-facing string is not authored by the dictionary.
 *
 * The spec supersedes the 2026-08-19 copy-authority decision for this route
 * only (`docs/spec-rally-public-v1.md`): the dictionary still authors every
 * label, button and system message, and the Admin authors the community's own
 * statements. Two consequences bind everything below.
 *
 *  - **One value per field, shown in both locales.** Not per-locale fields —
 *    the owner chose this, and the recorded consequence is that an Indonesian
 *    community's copy is shown to an English-locale visitor as written. There
 *    is therefore no locale parameter anywhere on the stored side; the locale
 *    only ever picks a *fallback*.
 *  - **Plain text, nothing interpreted.** No markdown, no links, no images.
 *    The about paragraph keeps its line breaks and nothing else.
 *
 * This module is pure and has no `server-only` marker on purpose: the caps and
 * the refusal they produce have to be the *same* code in three places — the
 * form's live counter, the form's refusal before it saves, and the API's
 * refusal when the form is bypassed. A second copy of a cap is a cap that
 * drifts, so there is exactly one.
 */

/**
 * Every cap the spec names, in characters. `heroHeadlineWord` is the second,
 * independent limit on the headline and is counted in *letters*: total length
 * drives line count and therefore the fold, while the longest word drives
 * horizontal overflow at both ends of the Display clamp. Neither predicts the
 * other, which is why the headline carries both.
 */
export const PUBLIC_COPY_CAPS = {
    heroHeadline: 48,
    heroHeadlineWord: 12,
    heroSubline: 120,
    about: 600,
    featureTitle: 32,
    featureLine: 120,
} as const;

/**
 * One `Settings` key-value row per field. Written out rather than generated so
 * that the key union is exact and a typo fails at the type level; the feature
 * slots below pair them up for rendering.
 */
export const PUBLIC_COPY_KEYS = [
    'publicHeroHeadline',
    'publicHeroSubline',
    'publicAbout',
    'publicFeature1Title',
    'publicFeature1Line',
    'publicFeature2Title',
    'publicFeature2Line',
    'publicFeature3Title',
    'publicFeature3Line',
    'publicFeature4Title',
    'publicFeature4Line',
] as const;

export type PublicCopyKey = (typeof PUBLIC_COPY_KEYS)[number];

/** What the `Settings` table holds. A missing key means empty, never a default. */
export type StoredPublicCopy = Partial<Record<PublicCopyKey, string>>;

/** The headline is the only field the word rule applies to. */
const HEADLINE_KEY: PublicCopyKey = 'publicHeroHeadline';

/** One feature card's pair of keys, and the number the form labels it with. */
export interface PublicFeatureSlot {
    readonly position: number;
    readonly titleKey: PublicCopyKey;
    readonly lineKey: PublicCopyKey;
}

export const PUBLIC_FEATURE_SLOTS: readonly PublicFeatureSlot[] = [
    {
        position: 1,
        titleKey: 'publicFeature1Title',
        lineKey: 'publicFeature1Line',
    },
    {
        position: 2,
        titleKey: 'publicFeature2Title',
        lineKey: 'publicFeature2Line',
    },
    {
        position: 3,
        titleKey: 'publicFeature3Title',
        lineKey: 'publicFeature3Line',
    },
    {
        position: 4,
        titleKey: 'publicFeature4Title',
        lineKey: 'publicFeature4Line',
    },
];

/** Four, as the spec caps it — read off the slots so the two cannot disagree. */
export const PUBLIC_FEATURE_CARD_COUNT = PUBLIC_FEATURE_SLOTS.length;

const CAP_BY_KEY: Readonly<Record<PublicCopyKey, number>> = {
    publicHeroHeadline: PUBLIC_COPY_CAPS.heroHeadline,
    publicHeroSubline: PUBLIC_COPY_CAPS.heroSubline,
    publicAbout: PUBLIC_COPY_CAPS.about,
    publicFeature1Title: PUBLIC_COPY_CAPS.featureTitle,
    publicFeature1Line: PUBLIC_COPY_CAPS.featureLine,
    publicFeature2Title: PUBLIC_COPY_CAPS.featureTitle,
    publicFeature2Line: PUBLIC_COPY_CAPS.featureLine,
    publicFeature3Title: PUBLIC_COPY_CAPS.featureTitle,
    publicFeature3Line: PUBLIC_COPY_CAPS.featureLine,
    publicFeature4Title: PUBLIC_COPY_CAPS.featureTitle,
    publicFeature4Line: PUBLIC_COPY_CAPS.featureLine,
};

/** The cap the form counts against and the API refuses on — one lookup, one table. */
export function publicCopyCap(key: PublicCopyKey): number {
    return CAP_BY_KEY[key];
}

const WORD_SPLIT_PATTERN = /\s+/;
const NON_WORD_PATTERN = /[^\p{L}\p{N}]/gu;

/**
 * The longest run of letters and digits, punctuation stripped. Same measurement
 * as `src/lib/__tests__/pitch-budget.test.ts` makes on the dictionary pitch,
 * and for the same reason: punctuation does not set type wider than the glyphs
 * around it, so `MEMAINKANNYA.` is twelve letters plus a period and it fits.
 */
export function longestWordLength(text: string): number {
    return text
        .split(WORD_SPLIT_PATTERN)
        .reduce(
            (longest, word) =>
                Math.max(longest, word.replace(NON_WORD_PATTERN, '').length),
            0,
        );
}

/** Which limit the value broke. The message names the cap either way. */
export type PublicCopyRule = 'length' | 'word';

export interface PublicCopyRefusal {
    readonly key: PublicCopyKey;
    readonly rule: PublicCopyRule;
    /** The number the refusal message has to name. */
    readonly cap: number;
}

/**
 * `null` when the value is publishable. Length is checked before the word rule
 * so an over-long headline is refused for the reason the Admin will see first
 * on the counter.
 */
export function checkPublicCopyValue(
    key: PublicCopyKey,
    value: string,
): PublicCopyRefusal | null {
    const cap = CAP_BY_KEY[key];
    if (value.length > cap) {
        return { key, rule: 'length', cap };
    }
    if (
        key === HEADLINE_KEY &&
        longestWordLength(value) > PUBLIC_COPY_CAPS.heroHeadlineWord
    ) {
        return { key, rule: 'word', cap: PUBLIC_COPY_CAPS.heroHeadlineWord };
    }
    return null;
}

/**
 * The first refusal in a whole `PATCH` body, or `null`. Iterates the key list
 * rather than the body so the field reported is stable whatever order the
 * client sent, and so a body carrying keys this module does not own — every
 * other `Settings` key — passes straight through untouched.
 */
export function checkPublicCopyPatch(
    patch: StoredPublicCopy,
): PublicCopyRefusal | null {
    for (const key of PUBLIC_COPY_KEYS) {
        const value = patch[key];
        if (value === undefined) {
            continue;
        }
        const refusal = checkPublicCopyValue(key, value);
        if (refusal) {
            return refusal;
        }
    }
    return null;
}

/** The refusal an Admin reads, in their locale, with the cap named in it. */
export function publicCopyRefusalMessage(
    refusal: PublicCopyRefusal,
    t: Dictionary,
): string {
    const template =
        refusal.rule === 'word'
            ? t.publicCopy.wordCapRefusal
            : t.publicCopy.lengthCapRefusal;
    return template.replace('{max}', String(refusal.cap));
}

export interface PublicFeatureCard {
    /**
     * The slot the card was written in, 1 to {@link PUBLIC_FEATURE_CARD_COUNT}.
     * Carried so the rendered list has a stable key that is not its array
     * index: the untitled slots are dropped, so position 3 can be the second
     * card, and two cards may legitimately carry the same title.
     */
    readonly position: number;
    readonly title: string;
    readonly line: string;
}

/** What the public page renders, after every fallback has been applied. */
export interface PublicCopy {
    /** Never empty: the dictionary default stands in. */
    readonly heroHeadline: string;
    /** Never empty: the dictionary default stands in. */
    readonly heroSubline: string;
    /** `null` hides the band — an empty paragraph is not an empty band. */
    readonly about: string | null;
    /** Only the cards that carry a title, in slot order. May be empty. */
    readonly features: readonly PublicFeatureCard[];
}

/** Titled cards only: an untitled card is dropped, whatever its line says. */
function resolveFeatureCards(
    stored: StoredPublicCopy,
): readonly PublicFeatureCard[] {
    const cards: PublicFeatureCard[] = [];
    for (const slot of PUBLIC_FEATURE_SLOTS) {
        const title = stored[slot.titleKey]?.trim() ?? '';
        if (title === '') {
            continue;
        }
        cards.push({
            position: slot.position,
            title,
            line: stored[slot.lineKey]?.trim() ?? '',
        });
    }
    return cards;
}

/**
 * Stored rows to rendered copy, for one visitor's locale.
 *
 * The two hero fields fall back to the dictionary, because a public page with
 * no headline is a broken page; the about paragraph and the feature cards fall
 * back to *nothing*, because an unwritten band is an absent band rather than a
 * band of filler. `trim()` on the about paragraph strips the surrounding
 * whitespace only — the line breaks inside it are the one piece of formatting
 * this field keeps.
 *
 * The locale reaches this function as an already-resolved `Dictionary` so the
 * caller can do the cookie read outside a cache scope, where it is legal.
 */
export function resolvePublicCopy(
    stored: StoredPublicCopy,
    t: Dictionary,
): PublicCopy {
    return {
        heroHeadline: stored.publicHeroHeadline?.trim() || t.landing.hero.pitch,
        heroSubline: stored.publicHeroSubline?.trim() || t.landing.hero.lead,
        about: stored.publicAbout?.trim() || null,
        features: resolveFeatureCards(stored),
    };
}

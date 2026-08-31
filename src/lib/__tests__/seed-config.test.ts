import { describe, expect, it } from 'vitest';
import { ACTIVITY_CONFIGS } from '../../../prisma/seed/config';
import { isActivityIconKey } from '../activity-icons';

/**
 * The Activity form rejects a bankAccountNumber with spaces or other
 * non-digit characters (see `src/lib/validations/activity.ts`'s
 * `/^\d*$/` rule). A seeded value that fails that rule locks an admin out of
 * the Activity edit dialog the moment they open it (#128) — pin the seed
 * data digit-only so that trap cannot come back.
 */
describe('ACTIVITY_CONFIGS bankAccountNumber', () => {
    it.each(ACTIVITY_CONFIGS.map((activity) => [activity.slug, activity.bankAccountNumber]))(
        '%s carries a digit-only bankAccountNumber',
        (_slug, bankAccountNumber) => {
            expect(bankAccountNumber).toMatch(/^\d*$/);
        },
    );
});

/**
 * The seed exists to show both livery paths at once — an Activity with a
 * chosen icon and one falling back to its initial — so the fixture data has to
 * carry both, and every key it carries has to be one the set still offers. A
 * key retired from `src/lib/activity-icons.ts` would otherwise go on seeding a
 * tile nothing draws.
 */
describe('ACTIVITY_CONFIGS icon', () => {
    it.each(ACTIVITY_CONFIGS.map((activity) => [activity.slug, activity.icon]))(
        '%s carries a key in the curated set, or null',
        (_slug, icon) => {
            expect(icon === null || isActivityIconKey(icon)).toBe(true);
        },
    );

    it('seeds both the icon tile and the initial fallback', () => {
        const withIcon = ACTIVITY_CONFIGS.filter(
            (activity) => activity.icon !== null,
        );

        expect(withIcon).toHaveLength(2);
        expect(ACTIVITY_CONFIGS.length - withIcon.length).toBeGreaterThan(0);
    });
});

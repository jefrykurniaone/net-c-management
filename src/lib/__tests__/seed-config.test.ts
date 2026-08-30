import { describe, expect, it } from 'vitest';
import { ACTIVITY_CONFIGS } from '../../../prisma/seed/config';

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

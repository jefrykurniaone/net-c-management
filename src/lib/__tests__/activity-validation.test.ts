import { describe, expect, it } from 'vitest';
import { getDictionary } from '../i18n/dictionaries';
import { buildCreateActivitySchema } from '../validations/activity';

const t = getDictionary('en');

/**
 * The Activity livery is the initial on a magnet tile, so no admin surface
 * supplies a colour any more — the create form has no colour default left to
 * send. The schema has to accept that, or creating an Activity 400s.
 */
const VALID_ACTIVITY = {
    name: 'Badminton',
    slug: 'badminton',
    monthlyFee: 150_000,
    sessionFee: 25_000,
    allowsMonthly: true,
    allowsPerSession: false,
    minMembers: 0,
    maxPlayers: 20,
} as const;

describe('buildCreateActivitySchema', () => {
    it('accepts an Activity created with no colour', () => {
        const parsed = buildCreateActivitySchema(t).safeParse(VALID_ACTIVITY);
        expect(parsed.success).toBe(true);
    });

    it('leaves colour absent rather than substituting a default hex', () => {
        const parsed = buildCreateActivitySchema(t).safeParse(VALID_ACTIVITY);
        // A default here would be the hardcoded hex coming back in by another
        // door; the column's own default is the database's business.
        expect(parsed.success && 'color' in parsed.data).toBe(false);
    });

    it('still rejects a colour that is not a hex value', () => {
        const parsed = buildCreateActivitySchema(t).safeParse({
            ...VALID_ACTIVITY,
            color: 'court green',
        });
        expect(parsed.success).toBe(false);
    });
});

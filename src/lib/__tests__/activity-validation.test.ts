import { describe, expect, it } from 'vitest';
import { getDictionary } from '../i18n/dictionaries';
import {
    buildCreateActivitySchema,
    buildUpdateActivitySchema,
} from '../validations/activity';

const t = getDictionary('en');

/**
 * The Activity livery is the initial on a magnet tile, so the colour is gone
 * from the product entirely — column, type, form control and validation rule.
 * What is worth pinning here is that the schema no longer carries the member at
 * all, and that a stale client still sending one is dropped rather than 400d.
 */
const VALID_ACTIVITY = {
    name: 'Badminton',
    slug: 'badminton',
    duesAmount: 150_000,
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

    it('carries no colour member for a default to land in', () => {
        const parsed = buildCreateActivitySchema(t).safeParse(VALID_ACTIVITY);
        // A default here would be the hardcoded hex coming back in by another
        // door, and there is no column left for it to reach.
        expect(parsed.success && 'color' in parsed.data).toBe(false);
    });

    it('drops a colour a stale client still sends rather than rejecting it', () => {
        const parsed = buildCreateActivitySchema(t).safeParse({
            ...VALID_ACTIVITY,
            color: '#16a34a',
        });
        // A cached admin bundle posting the old shape must still create an
        // Activity — the colour is simply not part of the contract any more.
        expect(parsed.success).toBe(true);
        expect(parsed.success && 'color' in parsed.data).toBe(false);
    });

    it('drops an icon a stale client still sends rather than rejecting it', () => {
        const parsed = buildCreateActivitySchema(t).safeParse({
            ...VALID_ACTIVITY,
            icon: 'dumbbell',
        });
        // The icon column is gone the same way colour's is — a cached admin
        // bundle posting the old shape must still create an Activity.
        expect(parsed.success).toBe(true);
        expect(parsed.success && 'icon' in parsed.data).toBe(false);
    });

    it('drops a monthlyFee a stale client still sends rather than storing it', () => {
        const parsed = buildCreateActivitySchema(t).safeParse({
            ...VALID_ACTIVITY,
            monthlyFee: 150_000,
        });
        // The retired live column has no field left for it to reach — a cached
        // admin bundle still posting the old name must still create an
        // Activity, never silently store the stale field.
        expect(parsed.success).toBe(true);
        expect(parsed.success && 'monthlyFee' in parsed.data).toBe(false);
    });
});

describe('buildUpdateActivitySchema', () => {
    it('drops a monthlyFee a stale client still sends rather than storing it', () => {
        const parsed = buildUpdateActivitySchema(t).safeParse({
            name: 'Badminton',
            monthlyFee: 150_000,
        });
        // `duesAmount` is omitted from the update schema entirely — the Dues
        // figure travels as `duesRate` on update — so the old name is stripped
        // as an unknown key exactly like the current name would be.
        expect(parsed.success).toBe(true);
        expect(parsed.success && 'monthlyFee' in parsed.data).toBe(false);
    });
});

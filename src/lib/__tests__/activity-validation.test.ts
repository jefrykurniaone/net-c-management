import { describe, expect, it } from 'vitest';
import { ACTIVITY_ICON_KEYS } from '../activity-icons';
import { getDictionary } from '../i18n/dictionaries';
import {
    buildCreateActivitySchema,
    buildUpdateActivitySchema,
} from '../validations/activity';

const t = getDictionary('en');

/**
 * The Activity carries no colour: an admin-chosen hex clears neither contrast
 * nor legibility on both themes, so the column, the type, the form control and
 * the validation rule are all gone. What is worth pinning here is that the
 * schema no longer carries the member at all, and that a stale client still
 * sending one is dropped rather than 400d.
 *
 * The icon is the opposite case and is exercised below: it was dropped by #65
 * and returns under #164 with a renderer, so the schema **does** carry it — and
 * the same courtesy applies to a key the schema does not know.
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

/**
 * `Activity.icon` (#164). The rule the whole field turns on: a key this build
 * does not offer is **stripped, never refused**, so an older or a newer client
 * saves the rest of the form instead of getting a 400 it cannot explain.
 *
 * Stripped means the field reaches no column — the parsed value is `undefined`,
 * which Prisma reads as "leave it alone" and `JSON.stringify` drops entirely.
 * It is deliberately not `null`: `null` is the Admin clearing the icon, and a
 * key nobody recognises must never be able to clear one by accident.
 */
function parsedIcon(payload: Record<string, unknown>) {
    const parsed = buildCreateActivitySchema(t).safeParse({
        ...VALID_ACTIVITY,
        ...payload,
    });
    if (!parsed.success) {
        throw new Error(`Refused: ${parsed.error.issues[0]?.message}`);
    }
    return parsed.data.icon;
}

describe('the Activity icon key', () => {
    it.each(ACTIVITY_ICON_KEYS)('accepts %s, a key in the set', (key) => {
        expect(parsedIcon({ icon: key })).toBe(key);
    });

    it('accepts null — the Admin clearing the icon back to the initial', () => {
        expect(parsedIcon({ icon: null })).toBeNull();
    });

    it('accepts a payload carrying no icon at all', () => {
        const parsed = buildCreateActivitySchema(t).safeParse(VALID_ACTIVITY);

        expect(parsed.success).toBe(true);
        expect(parsed.success && 'icon' in parsed.data).toBe(false);
    });

    it.each([
        ['a key this build does not offer', 'racket'],
        ['a retired key', 'shuttlecock'],
        ['a value of the wrong type', 42],
        ['an empty string', ''],
    ])('strips %s rather than refusing the save', (_label, icon) => {
        expect(parsedIcon({ icon })).toBeUndefined();
    });

    it('strips an unknown key all the way out of the request body', () => {
        const parsed = buildCreateActivitySchema(t).safeParse({
            ...VALID_ACTIVITY,
            icon: 'racket',
        });
        // `undefined` is what reaches Prisma, and what Prisma reads as "do not
        // write this column" — so the stored icon of an Activity being updated
        // survives a request that names a key nobody knows.
        expect(parsed.success).toBe(true);
        expect(JSON.stringify(parsed.success ? parsed.data : {})).not.toContain(
            'icon',
        );
    });
});

describe('the Activity icon key on update', () => {
    function updateIcon(icon: unknown) {
        const parsed = buildUpdateActivitySchema(t).safeParse({
            name: 'Badminton',
            icon,
        });
        if (!parsed.success) {
            throw new Error(`Refused: ${parsed.error.issues[0]?.message}`);
        }
        return parsed.data.icon;
    }

    it.each(ACTIVITY_ICON_KEYS)('accepts %s, a key in the set', (key) => {
        expect(updateIcon(key)).toBe(key);
    });

    it('accepts null, which is what clears a stored icon', () => {
        expect(updateIcon(null)).toBeNull();
    });

    it('strips an unknown key, leaving the stored icon untouched', () => {
        expect(updateIcon('racket')).toBeUndefined();
    });

    it('accepts a partial save that names no icon', () => {
        const parsed = buildUpdateActivitySchema(t).safeParse({
            isActive: false,
        });

        expect(parsed.success).toBe(true);
        expect(parsed.success && 'icon' in parsed.data).toBe(false);
    });
});

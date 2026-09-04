import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_COPY_KEYS } from '../public-copy';

/**
 * #302. `PATCH /api/settings` used to upsert every key a caller sent, with
 * no allow-list — a direct `{"heroImageUrl": ""}` call rewrote the row
 * without touching the `hero-images` bucket the dedicated route keeps in
 * step. The route itself is Prisma/auth-backed and out of this project's
 * test scope (`CLAUDE.md`: "Pages, components and anything touching Prisma
 * or Supabase are not covered"), so — like `community-name-length.test.ts`
 * — this reads the route's own source rather than importing it, and derives
 * the arrays under test from that source so a change there cannot silently
 * drift out of step with what this file asserts.
 */
const SRC_DIR = join(process.cwd(), 'src');
const routeSource = readFileSync(
    join(SRC_DIR, 'app', 'api', 'settings', 'route.ts'),
    'utf8',
);

/** The quoted string literals inside a `const NAME = [...]` (optionally
 *  `new Set([...])`) block in the route's own source. */
function readStringArray(constName: string): string[] {
    const match = routeSource.match(
        new RegExp(`const ${constName} = (?:new Set\\()?\\[([\\s\\S]*?)\\]`),
    );
    if (!match) {
        throw new Error(
            `${constName} not found in src/app/api/settings/route.ts`,
        );
    }
    return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

// DECLARED_SETTINGS_KEYS spreads PUBLIC_COPY_KEYS rather than restating it
// (route.ts), so the full declared set is the literals plus that import.
const DECLARED_KEYS = [
    ...readStringArray('DECLARED_SETTINGS_KEYS'),
    ...PUBLIC_COPY_KEYS,
];
const ROUTE_OWNED_KEYS = readStringArray('ROUTE_OWNED_SETTINGS_KEYS');

/** Same shape as `findUndeclaredSettingsKey` in route.ts, run against the
 *  keys extracted from that route's own source above. */
function findUndeclaredSettingsKey(
    body: Record<string, string>,
): string | undefined {
    return Object.keys(body).find((key) => !DECLARED_KEYS.includes(key));
}

describe('PATCH /api/settings allow-list (#302)', () => {
    it('declares every identity and operational key plus every public-copy key, once each', () => {
        expect(new Set(DECLARED_KEYS).size).toBe(DECLARED_KEYS.length);
        for (const key of [
            'communityName',
            'defaultLocation',
            'adminWhatsapp',
            'logoUrl',
            'heroImageUrl',
            'holdDurationMinutes',
        ]) {
            expect(DECLARED_KEYS).toContain(key);
        }
        for (const key of PUBLIC_COPY_KEYS) {
            expect(DECLARED_KEYS).toContain(key);
        }
    });

    it('rejects a body carrying a key the application never declared, and names that key', () => {
        const body = { communityName: 'XClub', notARealSetting: 'y' };
        expect(findUndeclaredSettingsKey(body)).toBe('notARealSetting');
        // The route's own refusal names the key it rejected.
        expect(routeSource).toContain('Unknown settings key:');
        expect(routeSource).toContain('findUndeclaredSettingsKey(body)');
    });

    it('accepts a body whose every key is declared', () => {
        const body = { communityName: 'XClub', defaultLocation: 'Court 1' };
        expect(findUndeclaredSettingsKey(body)).toBeUndefined();
    });

    it('marks exactly heroImageUrl and logoUrl route-owned', () => {
        expect(ROUTE_OWNED_KEYS.sort()).toEqual(
            ['heroImageUrl', 'logoUrl'].sort(),
        );
    });

    it('never refuses the ordinary Save round-trip: heroImageUrl and logoUrl are declared keys, not undeclared ones', () => {
        // use-settings-form.ts always sends both back unchanged; PATCH must
        // not 400 on that, only skip writing them (asserted below).
        const body = { communityName: 'XClub', heroImageUrl: '', logoUrl: '' };
        expect(findUndeclaredSettingsKey(body)).toBeUndefined();
    });

    it('excludes route-owned keys from the write, and only those, from the route source itself', () => {
        expect(routeSource).toMatch(
            /\.filter\(\(\[key\]\) => !ROUTE_OWNED_SETTINGS_KEYS\.has\(key\)\)/,
        );
    });
});

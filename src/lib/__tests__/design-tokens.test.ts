import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
    AA_PAIRS,
    AA_TEXT,
    RECORDED_PAIRS,
    contrastRatio,
    parseThemeTokens,
    referencedTokens,
    relativeLuminance,
    type ThemeName,
} from '../theme-contrast';

/**
 * DESIGN.md, Colours. The contrast table in that document and in the pull
 * request that introduced it is only worth something if a nudged token fails
 * on a number, so these read the committed stylesheet and compute the ratios
 * rather than restating them.
 */
const STYLES_DIR = join(process.cwd(), 'src', 'app', 'styles');
const tokenCss = readFileSync(join(STYLES_DIR, 'colors.css'), 'utf8');
const typeCss = readFileSync(join(STYLES_DIR, 'type-roles.css'), 'utf8');

const themes = parseThemeTokens(tokenCss);
const THEME_NAMES: readonly ThemeName[] = ['light', 'dark'];

const contrastCases = THEME_NAMES.flatMap((theme) =>
    AA_PAIRS.map((pair) => ({ theme, ...pair })),
);

describe('Rally palette contrast', () => {
    it.each(THEME_NAMES)('declares every token the pairs name in %s', (theme) => {
        const missing = referencedTokens().filter((name) => !themes[theme][name]);

        expect(missing).toEqual([]);
    });

    it.each(contrastCases)(
        '$theme: $fg on $bg clears $min:1 — $note',
        ({ theme, fg, bg, min }) => {
            const tokens = themes[theme];

            expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
        },
    );

    /**
     * The one pairing the spec bans outright. Asserting the direction rather
     * than a hex keeps the ban true if the green moves: whatever PBP Green is,
     * its label is the darker of the two, and a light label on it is why the
     * rule exists.
     */
    it.each(THEME_NAMES)('carries dark ink on the action ground in %s', (theme) => {
        const tokens = themes[theme];

        expect(relativeLuminance(tokens['primary-solid-foreground'])).toBeLessThan(
            relativeLuminance(tokens['primary-solid']),
        );
        expect(contrastRatio('#FFFFFF', tokens['primary-solid'])).toBeLessThan(AA_TEXT);
    });

    it.each(THEME_NAMES)('measures every recorded pair in %s', (theme) => {
        const tokens = themes[theme];
        const measured = RECORDED_PAIRS.map(({ fg, bg }) =>
            contrastRatio(tokens[fg], tokens[bg]),
        );

        expect(measured.every((ratio) => ratio >= 1)).toBe(true);
    });
});

/**
 * `type-mark`, the one retired name #174 could not remove: neither
 * `docs/spec-rally-public-v1.md` nor the completion records of #154 and #156
 * assign the community wordmark a Rally role, so its two call sites and its
 * `@utility` stay as they are rather than inventing one. This asserts the
 * alias still names the open decision, so it fails here rather than quietly
 * losing its tracking issue.
 */
const PENDING_DECISION_ISSUE = '#223';

/** True when `needle`'s line, or the line above it, names the given issue. */
function hasNoteFor(source: string, needle: string, issue: string): boolean {
    const lines = source.split('\n');
    const index = lines.findIndex((line) => line.includes(needle));
    if (index === -1) {
        return false;
    }
    const previous = index > 0 ? lines[index - 1] : '';
    return lines[index].includes(issue) || previous.includes(issue);
}

describe('Retired token aliases', () => {
    it('names the open decision beside type-mark', () => {
        expect(
            hasNoteFor(typeCss, '@utility type-mark {', PENDING_DECISION_ISSUE),
        ).toBe(true);
    });

    /**
     * The restriction that confined the retired Hero role to the public route
     * is gone with the role, and Rally's Display is system-wide. A guard that
     * comes back would quietly bar page titles from the one role the spec
     * gives them.
     */
    it('keeps no lint restriction on the retired hero role', () => {
        const eslintConfig = readFileSync(
            join(process.cwd(), 'eslint.config.mjs'),
            'utf8',
        );

        expect(eslintConfig).not.toContain('type-hero');
    });
});

/**
 * The zero-consumer gate #174 exists to add. Every retired Papan Jadwal name
 * except `type-mark` (see above) has to have exactly nothing left naming it
 * anywhere in `src/` — this scans the tree itself rather than trusting a
 * point-in-time count, so a reintroduced name fails here on the next run.
 */
const RETIRED_CLASS_NAMES: readonly string[] = [
    'bg-board',
    'bg-tile',
    'border-rule',
    'bg-wash-ink',
    'bg-wash-tape',
    'bg-wash-strike',
    'shadow-tile',
    'shadow-tile-pressed',
    'type-hero',
];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const SELF_FILE = 'design-tokens.test.ts';

function collectSourceFiles(dir: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            return collectSourceFiles(fullPath);
        }
        if (!SCAN_EXTENSIONS.has(extname(entry.name)) || entry.name === SELF_FILE) {
            return [];
        }
        return [fullPath];
    });
}

/** Maps each retired name to the files under `src/` that still spell it. */
function findRetiredConsumers(
    names: readonly string[],
): Record<string, string[]> {
    const files = collectSourceFiles(join(process.cwd(), 'src'));
    const consumers: Record<string, string[]> = {};
    for (const name of names) {
        consumers[name] = [];
    }
    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        for (const name of names) {
            if (content.includes(name)) {
                consumers[name].push(file);
            }
        }
    }
    return consumers;
}

const retiredConsumers = findRetiredConsumers(RETIRED_CLASS_NAMES);

describe('Retired class names', () => {
    it.each(RETIRED_CLASS_NAMES)('has no consumer of %s left in src/', (name) => {
        expect(retiredConsumers[name]).toEqual([]);
    });
});

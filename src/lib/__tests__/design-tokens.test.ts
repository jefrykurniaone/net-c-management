import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
const tokenCss = readFileSync(join(STYLES_DIR, 'board-materials.css'), 'utf8');
const typeCss = readFileSync(join(STYLES_DIR, 'type-roles.css'), 'utf8');
const globalsCss = readFileSync(
    join(process.cwd(), 'src', 'app', 'globals.css'),
    'utf8',
);

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
 * Retired Papan Jadwal names, kept alive only so the surfaces that still
 * spell them render while the run lands. Each has to say which ticket takes
 * it away, on its own line or the one above it, so that an alias added
 * without a removal plan fails here rather than becoming permanent.
 */
const REMOVAL_TICKET = '#174';

const RETIRED_TOKENS: readonly string[] = [
    '--color-board',
    '--color-tile',
    '--color-rule',
    '--color-wash-ink',
    '--color-wash-tape',
    '--color-wash-strike',
    '--shadow-tile',
    '--shadow-tile-pressed',
];

const RETIRED_UTILITIES: readonly string[] = ['type-hero', 'type-mark'];

/** True when `needle`'s line, or the line above it, names the removal ticket. */
function hasRemovalNote(source: string, needle: string): boolean {
    const lines = source.split('\n');
    const index = lines.findIndex((line) => line.includes(needle));
    if (index === -1) {
        return false;
    }
    const previous = index > 0 ? lines[index - 1] : '';
    return (
        lines[index].includes(REMOVAL_TICKET) || previous.includes(REMOVAL_TICKET)
    );
}

describe('Retired token aliases', () => {
    it.each(RETIRED_TOKENS)('names the removing ticket beside %s', (token) => {
        expect(hasRemovalNote(globalsCss, `${token}:`)).toBe(true);
    });

    it.each(RETIRED_UTILITIES)('names the removing ticket beside %s', (utility) => {
        expect(hasRemovalNote(typeCss, `@utility ${utility} {`)).toBe(true);
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

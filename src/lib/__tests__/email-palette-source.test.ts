import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio, parseThemeTokens } from '../theme-contrast';

/**
 * `src/lib/email/layout.ts` hand-copies a set of hex values out of
 * `src/app/styles/colors.css` because email clients cannot read a CSS
 * custom property. Its header comment says plainly that nothing wires the
 * two files together — this test is that wire: it reads both committed
 * sources and checks the copy against the original, so a token nudged on
 * one side without the other fails on a value, not an opinion.
 */
const STYLES_DIR = join(process.cwd(), 'src', 'app', 'styles');
const tokenCss = readFileSync(join(STYLES_DIR, 'colors.css'), 'utf8');
const layoutSource = readFileSync(
    join(process.cwd(), 'src', 'lib', 'email', 'layout.ts'),
    'utf8',
);

const { light: tokens } = parseThemeTokens(tokenCss);

function extractRole(pattern: RegExp, label: string): string {
    const match = tokenCss.match(pattern);
    if (!match) {
        throw new Error(`Could not find ${label} in colors.css.`);
    }
    return match[1].toUpperCase();
}

/**
 * The named colours from `colors.css`'s own "Roles" comment — the ones the
 * layout module names by family (`Black Green`, `PBP Green`, `White`,
 * `Shells`) rather than by a custom-property name. `Shells` alone covers
 * three hex values, cream/beige/taupe, and cream never became a custom
 * property of its own.
 */
const BLACK_GREEN = extractRole(/Black Green\s+(#[0-9A-Fa-f]{6})/, 'Black Green');
const PBP_GREEN = extractRole(/PBP Green\s+(#[0-9A-Fa-f]{6})/, 'PBP Green');
const WHITE = extractRole(/White\s+(#[0-9A-Fa-f]{6})/, 'White');
const SHELLS_CREAM = extractRole(/(#[0-9A-Fa-f]{6}) cream/, 'Shells cream');
const SHELLS_BEIGE = extractRole(/(#[0-9A-Fa-f]{6}) beige/, 'Shells beige');
const SHELLS_TAUPE = extractRole(/(#[0-9A-Fa-f]{6}) taupe/, 'Shells taupe');

/** `const NAME = '#HEX'; // trailing comment` — every constant in layout.ts. */
const CONSTANT_PATTERN = /^const ([A-Z_]+) = '(#[0-9A-Fa-f]{6})';(.*)$/gm;

function parseLayoutConstants(
    source: string,
): Record<string, { hex: string; comment: string }> {
    const found: Record<string, { hex: string; comment: string }> = {};
    for (const [, name, hex, comment] of source.matchAll(CONSTANT_PATTERN)) {
        found[name] = { hex: hex.toUpperCase(), comment };
    }
    return found;
}

const constants = parseLayoutConstants(layoutSource);

/** Constants that name a colour family from the Roles comment as their source. */
const ROLE_SOURCES: Record<string, string> = {
    HEADER_BG: BLACK_GREEN,
    CARD_INK: BLACK_GREEN,
    BUTTON_INK: BLACK_GREEN,
    CARD_BG: WHITE,
    BUTTON_BG: PBP_GREEN,
    BODY_BG: SHELLS_BEIGE,
    ROWS_BG: SHELLS_CREAM,
    BORDER: SHELLS_TAUPE,
};

/** Constants that name an actual `colors.css` custom property as their source. */
const TOKEN_SOURCES: Record<string, string> = {
    HEADER_INK: 'secondary-solid-foreground', // "off-white ink" beside the same "Black Green ground" — colors.css:76
    MUTED_INK: 'muted-foreground',
    SUBTLE_INK: 'subtle-foreground',
    SETTLED_INK: 'success',
    SETTLED_WASH: 'success-soft',
    VOID_INK: 'destructive',
    VOID_WASH: 'destructive-soft',
};

describe('Email layout palette', () => {
    it('parses exactly the constants both source tables cover', () => {
        const documented = [
            ...Object.keys(ROLE_SOURCES),
            ...Object.keys(TOKEN_SOURCES),
        ].sort();

        expect(Object.keys(constants).sort()).toEqual(documented);
    });

    it.each(Object.entries(ROLE_SOURCES))(
        '%s matches the colour it names from the Roles comment',
        (name, expectedHex) => {
            expect(constants[name].hex).toBe(expectedHex);
        },
    );

    it.each(Object.entries(TOKEN_SOURCES))(
        '%s matches --%s in colors.css',
        (name, token) => {
            expect(constants[name].hex).toBe(tokens[token]);
        },
    );

    /**
     * Every contrast ratio measured in a trailing comment, checked against
     * the pair the comment names ("on card", "on its own wash", the header
     * band, the ink PBP Green carries) rather than restated from memory.
     */
    const RATIO_CLAIMS: ReadonlyArray<{
        owner: string;
        fg: string;
        bg: string;
    }> = [
        { owner: 'HEADER_INK', fg: 'HEADER_INK', bg: 'HEADER_BG' },
        { owner: 'CARD_BG', fg: 'CARD_INK', bg: 'CARD_BG' },
        { owner: 'MUTED_INK', fg: 'MUTED_INK', bg: 'CARD_BG' },
        { owner: 'SUBTLE_INK', fg: 'SUBTLE_INK', bg: 'CARD_BG' },
        { owner: 'BUTTON_INK', fg: 'BUTTON_INK', bg: 'BUTTON_BG' },
        { owner: 'SETTLED_INK', fg: 'SETTLED_INK', bg: 'SETTLED_WASH' },
        { owner: 'VOID_INK', fg: 'VOID_INK', bg: 'VOID_WASH' },
    ];
    const RATIO_PATTERN = /(\d+\.\d+):1/;

    it.each(RATIO_CLAIMS)(
        'the ratio noted on $owner matches $fg on $bg as measured',
        ({ owner, fg, bg }) => {
            const claimed = constants[owner].comment.match(RATIO_PATTERN);

            expect(claimed).not.toBeNull();
            const measured = contrastRatio(constants[fg].hex, constants[bg].hex);
            expect(measured).toBeCloseTo(Number(claimed![1]), 2);
        },
    );
});

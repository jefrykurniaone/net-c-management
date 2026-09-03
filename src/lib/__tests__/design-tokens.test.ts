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

/** Rally's eight roles, in the order `type-roles.css` declares them. */
const LIVE_TYPE_ROLES: readonly string[] = [
    'type-display',
    'type-statement',
    'type-title',
    'type-body',
    'type-caption',
    'type-label',
    'type-figure',
    'type-figure-lead',
];

describe('Retired token aliases', () => {
    /**
     * #223 settled the community wordmark on the Title role and deleted the
     * `type-mark` alias, so the eight live roles are the whole stylesheet.
     * A ninth `@utility` here would be a role nothing decided.
     */
    it('declares the eight live roles and no retired one', () => {
        const declared = [...typeCss.matchAll(/@utility (type-[\w-]+)/g)].map(
            ([, name]) => name,
        );

        expect(declared).toEqual(LIVE_TYPE_ROLES);
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
 * #278: `tailwind-merge` cannot dedupe an opaque Tailwind v4 `@utility` class
 * against a raw size, weight, tracking or transform utility — both survive in
 * the class attribute and stylesheet emission order decides which one paints,
 * which is a half-applied role that a screenshot pair does not show. The
 * community wordmark is the surface #223 took that decision for, so both rails
 * are held to the role and nothing that competes with it. Colour (`text-*` as
 * a token) and the never-bleed utilities (`min-w-0`, `break-words`) declare
 * nothing a `type-*` role declares, so they are not competitors.
 */
const TEXT_SIZE_SUFFIXES = new Set([
    'xs',
    'sm',
    'base',
    'lg',
    'xl',
    '2xl',
    '3xl',
    '4xl',
    '5xl',
    '6xl',
    '7xl',
    '8xl',
    '9xl',
]);
const TRANSFORM_UTILITIES = new Set([
    'uppercase',
    'lowercase',
    'capitalize',
    'normal-case',
]);
const COMPETING_PREFIXES = ['font-', 'tracking-', 'leading-'];
const TEXT_PREFIX = 'text-';

/** True when the class token would fight a `type-*` role's own declarations. */
function isCompetingUtility(token: string): boolean {
    if (TRANSFORM_UTILITIES.has(token)) {
        return true;
    }
    if (COMPETING_PREFIXES.some((prefix) => token.startsWith(prefix))) {
        return true;
    }
    return (
        token.startsWith(TEXT_PREFIX) &&
        TEXT_SIZE_SUFFIXES.has(token.slice(TEXT_PREFIX.length))
    );
}

const WORDMARK_RAILS = [
    { rail: 'landing', file: join('components', 'landing', 'identity-rail.tsx') },
    { rail: 'threshold', file: join('components', 'layout', 'threshold-rail.tsx') },
] as const;

/** The one span in each rail that renders the runtime-configured name. */
const NAME_SPAN_CLASSES = /<span className='([^']*)'>\s*\{communityName\}/;

describe('Community wordmark type', () => {
    it.each(WORDMARK_RAILS)(
        '$rail rail composes type-title with nothing competing',
        ({ file }) => {
            const source = readFileSync(join(process.cwd(), 'src', file), 'utf8');
            const classes =
                NAME_SPAN_CLASSES.exec(source)?.[1].split(/\s+/) ?? [];

            expect(classes).toContain('type-title');
            expect(classes.filter(isCompetingUtility)).toEqual([]);
        },
    );
});

/**
 * The zero-consumer gate #174 exists to add, with no exception left in it.
 * Every retired Papan Jadwal name has to have exactly nothing naming it
 * anywhere in `src/` — this scans the tree itself rather than trusting a
 * point-in-time count, so a reintroduced name fails here on the next run.
 * `type-mark` joined the list when #223 settled the wordmark on Title.
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
    'type-mark',
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

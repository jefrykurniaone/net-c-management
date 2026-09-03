import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #193. `Label`, `FormDescription` and `FormMessage` used to spell a Rally
 * type role out by hand in raw Tailwind size/weight/leading utilities, so a
 * later change to `type-label` or `type-caption` in
 * `src/app/styles/type-roles.css` (DESIGN.md, Typography) would move every
 * other consumer of the role and silently leave these three behind. This
 * reads the components and the token layer back off disk, the same way
 * `design-tokens.test.ts` reads `colors.css`, so a hand-rolled utility
 * creeping back in fails on a string rather than on a screenshot.
 */
const SRC_DIR = join(process.cwd(), 'src');
const labelSource = readFileSync(
    join(SRC_DIR, 'components', 'ui', 'label.tsx'),
    'utf8',
);
const formSource = readFileSync(
    join(SRC_DIR, 'components', 'ui', 'form.tsx'),
    'utf8',
);
const typeCss = readFileSync(
    join(SRC_DIR, 'app', 'styles', 'type-roles.css'),
    'utf8',
);

/** Pulls one `@utility <name> { ... }` block's declarations as a plain map. */
function readUtility(css: string, name: string): Record<string, string> {
    const block = css.match(new RegExp(`@utility ${name} \\{([^}]*)\\}`));
    if (!block) {
        throw new Error(`@utility ${name} not found in type-roles.css`);
    }

    const declarations: Record<string, string> = {};
    for (const line of block[1].split(';')) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
            continue;
        }
        const prop = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (prop) {
            declarations[prop] = value;
        }
    }
    return declarations;
}

const typeLabel = readUtility(typeCss, 'type-label');
const typeCaption = readUtility(typeCss, 'type-caption');

describe('form primitive type roles (#193)', () => {
    it("pins type-label to DESIGN.md's Label role", () => {
        expect(typeLabel['font-size']).toBe('0.6875rem');
        expect(typeLabel['font-weight']).toBe('700');
        expect(typeLabel['line-height']).toBe('1.1');
        expect(typeLabel['letter-spacing']).toBe('0.1em');
        expect(typeLabel['text-transform']).toBe('uppercase');
    });

    it("pins type-caption to DESIGN.md's Caption role", () => {
        expect(typeCaption['font-size']).toBe('0.8125rem');
        expect(typeCaption['font-weight']).toBe('400');
        expect(typeCaption['line-height']).toBe('1.45');
        expect(typeCaption['letter-spacing']).toBe('normal');
    });

    it('Label composes type-label, not a hand-rolled size/weight/leading utility', () => {
        const match = labelSource.match(
            /data-slot="label"[\s\S]*?className=\{cn\(\s*"([^"]+)"/,
        );
        const className = match?.[1] ?? '';

        expect(className).toContain('type-label');
        expect(className).not.toMatch(/\btext-sm\b/);
        expect(className).not.toMatch(/\bleading-none\b/);
        expect(className).not.toMatch(/\bfont-medium\b/);
    });

    it('FormDescription composes type-caption, not text-sm', () => {
        const match = formSource.match(
            /id=\{formDescriptionId\}[\s\S]*?className=\{cn\('([^']+)'/,
        );
        const className = match?.[1] ?? '';

        expect(className).toContain('type-caption');
        expect(className).toContain('text-muted-foreground');
        expect(className).not.toMatch(/\btext-sm\b/);
    });

    it('FormMessage composes type-caption plus the font-medium weight step, matching the validation-message role FieldErrorMessage already established', () => {
        const match = formSource.match(
            /id=\{formMessageId\}[\s\S]*?className=\{cn\('([^']+)'/,
        );
        const className = match?.[1] ?? '';

        expect(className).toContain('type-caption');
        expect(className).toContain('font-medium');
        expect(className).toContain('text-destructive');
        expect(className).not.toMatch(/\btext-sm\b/);
    });
});

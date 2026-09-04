import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_LOCALE, getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicCommunityName } from '@/lib/public-landing';

/**
 * The link-preview card: the community name as a wordmark on the dark ground,
 * and nothing else (ticket 12 decision 5). Generated rather than static or
 * absent because `PRODUCT.md`'s *Evidence on Hand* bars screenshots, photos and
 * any real-world evidence, and its *Brand Commitments* bars sport iconography
 * and says no brand, wordmark or logo exists — the name is the one asset that is
 * *true* for every deployment. It sits at the **root** segment, so every route
 * without its own card inherits it, `/s/[id]` included (decision 6).
 */

/**
 * **This route must stay dynamic.** A generated image file is a Route Handler
 * that Next caches at build time unless it uses a request-time API or dynamic
 * config, and a database read alone does not count as either
 * (`opengraph-image.md`, *Generate images using code*). Left static, the
 * community name would be baked at
 * build and never move again — a rename would change the page, the `<title>` and
 * nothing else, and the card would keep advertising the old name forever.
 *
 * The freshness cost is paid once, not per request: the name comes through the
 * public choke point's `unstable_cache`, so a scraper storm costs CPU rather
 * than Prisma connections, exactly as on `/`.
 */
export const dynamic = 'force-dynamic';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Alt text through the dictionary, not an `opengraph-image.alt.txt` file — a
 * `.txt` file cannot be bilingual (decision 6). It is `en` because this export
 * is static and because a crawler sends no `NEXT_LOCALE` cookie anyway, so `en`
 * is what every scraper reads (ticket 12, F2). It describes the composition
 * rather than naming the community, since the name is runtime configuration and
 * this string is resolved once; DESIGN.md's rule that design vocabulary stays
 * out of user-facing copy is why the ground is named by its colour.
 */
export const alt = getDictionary(DEFAULT_LOCALE).landing.meta.ogAlt;

/**
 * Black Green and the off-white ink it carries — the dark theme's own ground
 * and foreground (`DESIGN.md`, Colours). Hardcoded rather than tokenised
 * because `ImageResponse` renders outside the document and reaches no CSS
 * variable; these two are brand, not layout, so they move with the palette.
 */
const BLACK_GREEN = '#0E1F17';
const OFF_WHITE_INK = '#F1EEE5';

/** The card's content measure: 1200 less an 80px gutter on each side. */
const CONTENT_WIDTH = size.width - 160;

/**
 * Weight, letter-spacing and line-height, copied into inline styles rather
 * than referenced — satori renders to an image and cannot consume a
 * Tailwind `@utility`. Copied from `DESIGN.md`'s `type-title` row, which
 * `src/app/styles/type-roles.css`'s `type-title` utility agrees with
 * exactly: weight 700, letter-spacing -0.01em, line-height 1.3. The role's
 * own 1.0625rem font-size is not copied — it fits a 17px on-screen rail,
 * not a 1200x630 image, so `WORDMARK_RAMP`/`WORDMARK_FLOOR` below still
 * choose the size. `font-stretch`/`font-variation-settings` are not copied
 * either: the role only resets both to `normal`, and `Archivo-900.ttf` is a
 * static weight-only face with no width axis to reset.
 */
const WORDMARK_FONT_WEIGHT = 700;
const WORDMARK_LETTER_SPACING = '-0.01em';
const WORDMARK_LINE_HEIGHT = 1.3;

/**
 * The Never-Bleed Rule's first preference, as a ramp: hold the box by shrinking
 * the type before anything wraps. Character counts are cumulative upper bounds;
 * every step keeps a name inside two lines of the measure above.
 */
const WORDMARK_RAMP: ReadonlyArray<{ maxChars: number; fontSize: number }> = [
    { maxChars: 14, fontSize: 96 },
    { maxChars: 24, fontSize: 72 },
    { maxChars: 40, fontSize: 54 },
];

/**
 * Past the ramp's last step, the floor — long names wrap and break instead.
 * #209 caps the community name at 48 characters, which still exceeds this
 * 40-character threshold, so the floor stays reachable and this branch is
 * not dead.
 */
const WORDMARK_FLOOR = 40;

function wordmarkFontSize(name: string): number {
    const step = WORDMARK_RAMP.find(({ maxChars }) => name.length <= maxChars);
    return step?.fontSize ?? WORDMARK_FLOOR;
}

export default async function Image() {
    // `DEFAULT_LOCALE`, not the cookie: the readers of this image are scrapers,
    // which send none, and reading one here would buy a locale nobody sees.
    const communityName = await getPublicCommunityName(DEFAULT_LOCALE);

    // A custom face must arrive as bytes — `next/font/google` hands over a CSS
    // rule, never the binary — so Archivo 900 is committed to the repository and
    // read from disk. `ImageResponse` caps the whole bundle (markup, styles,
    // fonts) at 500KB; this file is ~111KB of it.
    const archivo900 = await readFile(
        join(process.cwd(), 'assets', 'fonts', 'Archivo-900.ttf'),
    );
    const fontSize = wordmarkFontSize(communityName);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // `overflow: hidden` is the rule's last line: a name past
                    // every other guarantee clips instead of bleeding.
                    overflow: 'hidden',
                    padding: 80,
                    backgroundColor: BLACK_GREEN,
                    fontFamily: 'Archivo',
                }}>
                <div
                    style={{
                        display: 'flex',
                        maxWidth: CONTENT_WIDTH,
                        color: OFF_WHITE_INK,
                        fontSize,
                        fontWeight: WORDMARK_FONT_WEIGHT,
                        lineHeight: WORDMARK_LINE_HEIGHT,
                        letterSpacing: WORDMARK_LETTER_SPACING,
                        textAlign: 'center',
                        // Wrap at spaces first, break mid-word only as a last
                        // resort. A mid-word break in the wordmark is a
                        // visible defect, and that is the point.
                        wordBreak: 'break-word',
                    }}>
                    {communityName}
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Archivo',
                    data: archivo900,
                    style: 'normal',
                    weight: 900,
                },
            ],
        },
    );
}

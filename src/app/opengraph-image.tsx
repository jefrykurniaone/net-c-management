import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_LOCALE, getDictionary } from '@/lib/i18n/dictionaries';
import { getPublicCommunityName } from '@/lib/public-landing';

/**
 * The link-preview card: the community name as a wordmark on the dark ground,
 * and nothing else (ticket 12 decision 5).
 *
 * Why generated rather than static or absent. `PRODUCT.md`'s *Evidence on Hand*
 * bars screenshots, photos and any real-world evidence; its *Brand Commitments*
 * bars sport iconography and says no brand, wordmark or logo exists — `XClub
 * Community` is a placeholder. A static image under those three is a
 * neutral rectangle that says nothing, and no image at all leaves the person who
 * was sent a WhatsApp link with a bare card as the only thing they see before
 * deciding to tap. The name is the one asset that is *true* for every
 * deployment, and the composition was fixed by ticket 01 and kept by Rally:
 * the dark ground, off-white lettering, the community name as the wordmark,
 * nothing else ever scaled up to stand in for one.
 *
 * It sits at the **root** segment, so every route without its own card inherits
 * it — the auth pages, `/onboarding`, `/s/[id]`, and the authenticated pages
 * (decision 6). One community wordmark is true on all of them, and `/s/[id]`
 * keeps its own text metadata while inheriting this image, which beats the bare
 * card it published before.
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
 * The wordmark's tracking. Tracked *out* caps read as a name; the Display
 * role's condensed caps are drawn *in* and read as a headline. Two devices
 * that happen to share capitals, and the card wants the first.
 */
const MARK_TRACKING_EM = 0.14;

/**
 * The Never-Bleed Rule's first preference, as a ramp: hold the box by shrinking
 * the type before anything wraps. Tracked caps at `0.14em` make this the widest
 * element per character in the system, so a name of unknown length is the first
 * thing to fail here. Character counts are cumulative upper bounds; every step
 * keeps a name inside two lines of the measure above.
 */
const WORDMARK_RAMP: ReadonlyArray<{ maxChars: number; fontSize: number }> = [
    { maxChars: 14, fontSize: 96 },
    { maxChars: 24, fontSize: 72 },
    { maxChars: 40, fontSize: 54 },
];

/** Past the ramp's last step, the floor — long names wrap and break instead. */
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
                        fontWeight: 900,
                        lineHeight: 1.05,
                        letterSpacing: fontSize * MARK_TRACKING_EM,
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        // Wrap at spaces first, break mid-word only as a last
                        // resort. A mid-word break in a 900-weight slab is a
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

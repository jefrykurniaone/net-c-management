import { Button } from '@/components/ui/button';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { GridPattern } from '@/components/patterns/GridPattern';
import { continueWithGoogle } from '@/lib/auth-actions';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { QuietJoin } from './quiet-join';

/**
 * The hero band: a dark full-bleed ground, the community's pitch in Display
 * type, and the page's one loud action.
 *
 * `dark` here forces the theme rather than following it. The band renders on a
 * Black Green ground whatever the visitor has set, which is DESIGN.md's
 * Theme-Is-Not-An-Inversion Rule in its second half: every dark value has to
 * hold inside a light-themed page, because a logged-out stranger has never set
 * a preference and a page whose ground depends on a coin flip has no ground.
 * Forcing the *whole* route dark was refused for the opposite reason — it
 * would override a preference the visitor did set and hide a working control —
 * so the rail above and every band below stay themed.
 */
const FORCED_DARK_CLASS = 'dark';

/**
 * The band's content measure. Not the shared 72rem gutter, which is roughly 110
 * characters where prose caps at 65–75 and leaves the headline as a single long
 * line instead of stacked slabs. This is a text measure, and the measure — never
 * a hardcoded `<br>` — is what decides where the headline breaks, because the
 * two locales break at different words.
 */
const HERO_MEASURE_CLASS = 'max-w-[48rem]';

/** Band air one step above the bands below it, collapsing on a phone. */
const HERO_AIR_CLASS = 'py-band md:py-band-lead';

/**
 * The button is described by the sentence beneath it, so a screen-reader user
 * hears the condition rather than the label alone.
 */
const DISCLOSURE_ID = 'landing-hero-disclosure';

/**
 * Five elements, in this order: the headline, the sentence that explains it,
 * the action, the disclosure the action defers to, and the quiet way in for
 * someone who is already a member. The community's name and logo are the
 * header rail's, not a second wordmark here.
 *
 * The band is full-bleed and its content is centred and **top-anchored** —
 * vertical centring stays reserved for interstitials. No `min-height`: the fold
 * law is a budget in pixels, and this band spends about two thirds of it.
 */
export function HeroBand({
    t,
    headline,
    subline,
}: Readonly<{
    t: Dictionary;
    /** Resolved copy, never empty — `getPublicCopy` has already applied the
     *  dictionary fallback, so this band never asks whether one is needed. */
    headline: string;
    subline: string;
}>) {
    return (
        <section
            className={`${FORCED_DARK_CLASS} relative isolate w-full overflow-hidden bg-background px-block ${HERO_AIR_CLASS}`}>
            <HeroBackdrop />
            {/* The headline and the action are **siblings in one flow column**,
                never stacked layers. That is what makes "the headline never
                paints over the action" a structural guarantee rather than a
                measurement that has to be rechecked at every viewport: the only
                thing an over-long value can do here is make the band taller.
                The single positioned layer on this band is the backdrop, and it
                sits behind everything at `-z-10`. */}
            <div
                className={`relative mx-auto flex ${HERO_MEASURE_CLASS} flex-col items-center gap-block text-center`}>
                {/* Display, the same role the app's page titles and this page's
                    band heads take. The fit rules are three, in a fixed order
                    of preference — DESIGN.md, The Never-Bleed Rule:

                      1. hold the budget: 48 characters, no word over 12,
                         enforced on the Admin's input by `public-copy.ts` and
                         on the dictionary fallback by `pitch-budget.test.ts`;
                      2. shrink: the role's own `clamp(2rem, 4.6vw, 3.5rem)`
                         plus `text-wrap: balance`, both properties of the role
                         rather than of this instance;
                      3. break mid-word, last: `break-words` breaks only a word
                         that cannot fit its line, so a value that got past the
                         caps through an older client or a direct API call
                         degrades visibly instead of bleeding out of the band.

                    `min-w-0` is what makes step 3 reachable at all — a flex
                    child's automatic minimum size is its content, so without it
                    the column widens to the longest word instead of breaking
                    it. */}
                <h1 className='type-display min-w-0 max-w-full break-words text-foreground'>
                    {headline}
                </h1>

                {/* Statement, not Body: this is the large line that is not a
                    headline, and the hero is the one surface with the room for
                    it. Body is what the about band below runs at, so the two
                    do not read as the same paragraph twice. Capped at 120
                    characters, which is three lines here at the small end of
                    the clamp. */}
                <p className='type-statement min-w-0 max-w-full break-words text-secondary-foreground'>
                    {subline}
                </p>

                <HeroAction t={t} />

                {/* Body weight and secondary ink, never Caption and never the
                    muted step. The label defers to this sentence, so it is not
                    fine print — a condition disclosed in fine print is not
                    disclosed. */}
                <p
                    id={DISCLOSURE_ID}
                    className='type-body text-secondary-foreground'>
                    {t.landing.hero.disclosure}
                </p>

                {/* The returning member fires the *same* action inline — no
                    navigation and no Google mark, so it stays quiet next to the
                    primary. */}
                <QuietJoin label={t.landing.hero.alreadyMember} />
            </div>
        </section>
    );
}

/**
 * The hero's background layer, and the slot the Admin's photograph fills.
 *
 * Today it is the grid-lines pattern over the dark ground. #155 puts the
 * uploaded photograph in this layer — `object-fit: cover`, centred, with a
 * dark scrim over it — and keeps the pattern as the fallback when no image is
 * set. Everything the layer needs is already true of it: it is the band's own
 * positioned backdrop, it is out of the accessibility tree, it takes no
 * pointer events, and it clips at the band's edges.
 *
 * The pattern draws in `--border` at `PATTERN_OPACITY`, which blends the dark
 * ground to `#1d2e26` where a line sits directly behind a glyph. The headline
 * still measures 12.31:1 there and the subline 7.63:1, against floors of 4.5.
 */
function HeroBackdrop() {
    return (
        <div aria-hidden='true' className='absolute inset-0 -z-10 bg-background'>
            <GridPattern isStretched colorToken='border' />
        </div>
    );
}

/**
 * The page's loud action. Its ground is PBP Green in both themes — the one
 * thing on a page that should not change when the light does — and it carries
 * Black Green, at 8.74:1. Off-white on that green measures 1.69:1 and white
 * 1.96:1: both are banned, and the token layer cannot produce either, so this
 * pairing is the one thing on the public route that must not be overridden.
 *
 * The focus indicator is the `Button` primitive's own — a full-opacity 1px
 * `--ring` border at 7.88:1 on this ground plus a 3px `--ring/50` halo — so
 * this call site sets size and typography and nothing else. The band adds no
 * ring offset: an offset ring needs a colour to sit on, and the previous one
 * named a retired token to get it.
 */
function HeroAction({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <form action={continueWithGoogle} className='mt-cell w-full sm:w-auto'>
            <Button
                type='submit'
                aria-describedby={DISCLOSURE_ID}
                className='type-label h-auto w-full gap-cell px-bay py-block sm:w-auto'>
                <GoogleMark className='size-5' />
                {t.landing.hero.cta}
            </Button>
        </form>
    );
}

import { Button } from '@/components/ui/button';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { continueWithGoogle } from '@/lib/auth-actions';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { QuietJoin } from './quiet-join';

/**
 * The painted board, and the page's one loud action.
 *
 * `dark` here is the **material**, not the mode. The class names the painted
 * dark-green board in this codebase and the theme toggle is one caller of it,
 * not its definition — so applying it to this band renders painted board
 * regardless of the visitor's theme. That is deliberate: a logged-out stranger
 * has never set a preference, and a page whose force depends on a coin flip has
 * no force. Forcing the whole route dark was refused for the opposite reason —
 * it would hide a working control and override a preference the visitor *did*
 * set — which is why the rail above stays themed enamel.
 *
 * Naming the class for the material it is would be correct and touches every
 * surface in the app; until that happens, this comment is what makes the
 * overload honest.
 */
const PAINTED_BOARD_CLASS = 'dark';

/**
 * The band's content measure. Not the shared 72rem gutter, which is roughly 110
 * characters where prose caps at 65–75 and leaves big type as a single long
 * line instead of stacked slabs. This is a text measure, and the measure — never
 * a hardcoded `<br>` — is what decides where the pitch breaks, because the two
 * locales break at different words.
 */
const HERO_MEASURE_CLASS = 'max-w-[48rem]';

/** Band air one step above the bands below the seam, collapsing on a phone. */
const HERO_AIR_CLASS = 'py-band md:py-band-lead';

/**
 * The button is described by the sentence beneath it, so a screen-reader user
 * hears the condition rather than the label alone.
 */
const DISCLOSURE_ID = 'landing-hero-disclosure';

/**
 * Six elements, in this order: the wordmark, the pitch, the sentence that
 * explains it, the action, the disclosure the action defers to, and the quiet
 * way in for someone who is already a member.
 *
 * The band is full-bleed and its content is centred and **top-anchored** —
 * vertical centring stays reserved for interstitials. No `min-height`: the fold
 * law is a budget in pixels, and this band spends about two thirds of it.
 */
export function HeroBand({
    t,
    communityName,
}: Readonly<{ t: Dictionary; communityName: string }>) {
    return (
        <section
            className={`${PAINTED_BOARD_CLASS} w-full bg-board px-block ${HERO_AIR_CLASS}`}>
            <div
                className={`mx-auto flex ${HERO_MEASURE_CLASS} flex-col items-center gap-block text-center`}>
                {/* Identity in the hero is the community name as a wordmark,
                    never the mark scaled up: the name has no length cap, and
                    every step up in size is a step further from surviving one.
                    Same overflow guarantee as the rail's, and found the same
                    way — a long single-word name walked the wordmark off both
                    edges of the screen. */}
                <p className='type-mark min-w-0 max-w-full break-words text-foreground'>
                    {communityName}
                </p>

                <h1 className='type-hero min-w-0 max-w-full break-words text-foreground'>
                    {t.landing.hero.pitch}
                </h1>

                <p className='type-body text-secondary-foreground'>
                    {t.landing.hero.lead}
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
                    primary. This is why the rail above needs no sign-in
                    affordance of its own. */}
                <QuietJoin label={t.landing.hero.alreadyMember} />
            </div>
        </section>
    );
}

/**
 * A loud action is a **large tile**, never a rounded pill — the square edge
 * holds at every size. On the painted board the polarity inverts: the ground is
 * the lit green and the label is the board's own ink, which the token layer
 * already pairs correctly. Both directions measure 6.82:1; chalk on lit green
 * measures 2.29:1 and is banned, so this pairing is the one thing on the public
 * route that must not be overridden.
 */
function HeroAction({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <form action={continueWithGoogle} className='mt-cell w-full sm:w-auto'>
            <Button
                type='submit'
                aria-describedby={DISCLOSURE_ID}
                className='type-label h-auto w-full gap-cell px-bay py-block shadow-tile hover:bg-foreground hover:text-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-board active:shadow-tile-pressed active:not-aria-[haspopup]:translate-y-0 sm:w-auto'>
                <GoogleMark className='size-5' />
                {t.landing.hero.cta}
            </Button>
        </form>
    );
}

import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { continueWithGoogle } from '@/lib/auth-actions';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { BOARD_GUTTER_CLASS } from './band';

/**
 * The public route's header rail: the community's identity, the two controls a
 * visitor may want before they read anything, and sign-in. It carries **no
 * navigation** — there is nowhere for a stranger to go but in.
 *
 * The rail follows the visitor's theme rather than joining the hero's forced
 * dark ground, so the theme toggle it holds has a visible effect where it sits.
 * Its bottom rule is the hero band's top edge; one rule, not two, which is why
 * the band below adds no border of its own, and the rule keeps its ink in both
 * themes so the rail does not dissolve into the hero in the dark one.
 */
export function IdentityRail({
    communityName,
    logoUrl,
    t,
}: Readonly<{ communityName: string; logoUrl: string; t: Dictionary }>) {
    return (
        <header className='border-b border-border bg-background'>
            {/* The rail does not wrap. Letting it wrap pushes the two controls
                onto a second row — a 105px rail on a phone against 57px, with a
                ragged gap under the wordmark — and costs 48px of the fold
                budget. The mark group shrinks instead. */}
            <div
                className={`mx-auto flex ${BOARD_GUTTER_CLASS} items-center gap-block px-block py-cell`}>
                <div className='flex min-w-0 flex-1 items-center gap-cell'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='md'
                    />
                    {/* `min-w-0` + `break-words` is a guarantee, not a
                        preference. The community name is runtime configuration
                        of unknown length, so it is the first thing to fail an
                        unfamiliar name, not the last. Without this a single long
                        word painted straight across the theme toggle, which no
                        measurement of element boxes reports, because a glyph is
                        not clipped by the box that owns it.

                        The order is fixed: wrap at spaces, break mid-word only
                        as a last resort, never bleed and never paint over a
                        control. A mid-word break is a visible defect and that is
                        the point — the guarantee exists so a violation degrades
                        instead of burying a control the visitor needs.

                        The name wears Title (#223), the same role as a card
                        heading: sentence case, no tracking, 17px. It carries no
                        size, weight, tracking or transform of its own, because a
                        raw utility beside a `type-*` role is a second source of
                        truth that tailwind-merge cannot dedupe. */}
                    <span className='type-title min-w-0 break-words text-foreground'>
                        {communityName}
                    </span>
                </div>
                <div className='flex shrink-0 items-center gap-hair'>
                    <ThemeToggle compact />
                    <LanguageSwitcher compact />
                    <RailSignIn t={t} />
                </div>
            </div>
        </header>
    );
}

/**
 * Sign-in in the rail: the **same** server action the hero's loud tile and the
 * page's quiet links fire, so there is one door and no second one to drift out
 * of step with it.
 *
 * It is `outline` rather than the default variant on purpose. PBP Green means
 * *do this* and the page has exactly one of those, in the hero; a second green
 * tile 40 pixels above it would make a stranger choose between two identical
 * promises. `outline` is a real control rather than an underlined line of text,
 * which is what a tap target in a rail needs to be, and it takes its focus
 * ring and its hover from the primitive.
 *
 * `h-8` overrides the `sm` size's own `h-7` so the button stands exactly as
 * tall as the two controls beside it, which resolve to 32px from their
 * `py-1.5` and a 16px glyph. It is in the same tailwind-merge group as `h-7`,
 * so it wins rather than sitting silently beside it.
 */
function RailSignIn({ t }: Readonly<{ t: Dictionary }>) {
    return (
        <form action={continueWithGoogle}>
            <Button type='submit' variant='outline' size='sm' className='h-8'>
                {t.landing.rail.signIn}
            </Button>
        </form>
    );
}

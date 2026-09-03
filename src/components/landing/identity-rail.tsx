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
            {/* The rail wraps only when the name leaves it no choice — #209.
                Re-measured 2026-09-04 against the `type-title` wordmark #223
                landed, at 390px: a wrapped rail is 105px against 57px unwrapped,
                so the 48px of fold budget the old comment defended is real and
                the row still keeps the controls beside the wordmark wherever it
                can. What changed is the condition. The old comment forbade
                wrapping *unconditionally*, and paid for it with `min-w-0` on the
                mark group, which let the row squeeze the wordmark below the
                width of its own longest word and hand the overflow to
                `break-words`. That is the mid-word break #209 came from.

                So the ladder now runs: fit beside the controls (57px, every
                realistic name), wrap the name at its spaces (65-87px), and only
                for a name whose longest word cannot fit the 164.06px the
                controls leave — an 18-letter word needs 174.42px, an 18-letter
                uppercase one 291.94px — yield the whole line to the mark group
                and drop the controls to a second row, where the wordmark gets
                312px. Never a mid-word break, and never a glyph painted over a
                control: without `flex-wrap` that same name bleeds 18.33px to
                95.44px past its box across the theme toggle, which no measure of
                element boxes reports. `justify-end` only has free space to act
                on once the row has wrapped, and it returns the controls to the
                right-hand edge they hold on one row. */}
            <div
                className={`mx-auto flex ${BOARD_GUTTER_CLASS} flex-wrap items-center justify-end gap-block px-block py-cell`}>
                <div className='flex flex-1 items-center gap-cell'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='md'
                    />
                    {/* No `min-w-0` and no `break-words`, and the two go
                        together: `min-w-0` is what let this span be sized
                        narrower than its own longest word, and `break-words` is
                        what then chopped that word in half. Dropping both makes
                        the span's min-content width — its longest word — the
                        floor the flex row has to respect, which is what turns
                        the row's `flex-wrap` above from decoration into the
                        last-resort rung it now carries.

                        The name's own length is bounded where it is authored
                        rather than here: `src/app/api/settings/route.ts` caps it
                        at 48 characters and 18 letters per word, measured so
                        that even 18 letters of `W` — 291.94px, the widest glyph
                        in Archivo at weight 700 — clear the 312px this rail can
                        give the wordmark at 390px. A cap is the only bound that
                        holds for arbitrary input: no size the design system owns
                        is small enough to fit an unbounded word, and truncation
                        and a mid-word break are both refused (#209).

                        The name wears Title (#223), the same role as a card
                        heading: sentence case, no tracking, 17px. It carries no
                        size, weight, tracking or transform of its own, because a
                        raw utility beside a `type-*` role is a second source of
                        truth that tailwind-merge cannot dedupe. */}
                    <span className='type-title text-foreground'>
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

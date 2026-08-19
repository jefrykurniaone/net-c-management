import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BOARD_GUTTER_CLASS } from './band';

/**
 * The public route's header rail: themed enamel, above the seam, and carrying
 * **no navigation** — there is nowhere for a stranger to go but in, and the
 * join action lives in the hero. Its bottom rule *is* the hero band's top edge;
 * one rule, not two, which is why the band below adds no border of its own.
 *
 * The rail stays enamel rather than joining the painted board so the theme
 * toggle it holds has a visible effect where it sits. The rule keeps its ink in
 * both materials, so in dark mode the rail does not dissolve into the hero.
 */
export function IdentityRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-rule bg-background'>
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
                        of unknown length, and tracked caps make it the widest
                        element per character in the system — so it is the first
                        thing to fail an unfamiliar name, not the last. Without
                        this a single long word painted straight across the theme
                        toggle, which no measurement of element boxes reports,
                        because a glyph is not clipped by the box that owns it.

                        The order is fixed: wrap at spaces, break mid-word only
                        as a last resort, never bleed and never paint over a
                        control. A mid-word break in a 900-weight slab is a
                        visible defect and that is the point — the guarantee
                        exists so a violation degrades instead of burying a
                        control the visitor needs. */}
                    <span className='type-mark min-w-0 break-words text-foreground'>
                        {communityName}
                    </span>
                </div>
                <div className='flex shrink-0 items-center gap-hair'>
                    <ThemeToggle compact />
                    <LanguageSwitcher compact />
                </div>
            </div>
        </header>
    );
}

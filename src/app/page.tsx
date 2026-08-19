import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { continueWithGoogle } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { GoogleMark } from '@/components/auth/GoogleMark';

// The landing threshold. Nobody arrives here to be sold to: every
// authenticated visitor is redirected away before this renders, so the only
// people who see it are members of this community who are not signed in, and
// for them signing in *is* signing up. The page is therefore the board's own
// header plate and one way onto it — identity, a statement of what this is with
// the sentence that explains it, one action, and the truth about what that
// action does.

// DESIGN.md: containers max at 72rem for board surfaces and 40rem for
// single-task columns.
const BOARD_WIDTH_CLASS = 'max-w-[72rem]';

/** Full-bleed header rail: identity plate at left, board controls at right. */
function IdentityRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-rule'>
            <div
                className={`mx-auto flex ${BOARD_WIDTH_CLASS} flex-wrap items-center gap-block px-block py-cell`}>
                <div className='flex min-w-0 items-center gap-cell'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='md'
                    />
                    {/* The name wraps at its spaces and never truncates or
                        breaks mid-word: a community that cannot read its own
                        name off the plate is the one thing this page cannot
                        get wrong. A name too wide for the row sends the
                        controls to a second line instead. */}
                    <span className='type-mark text-foreground'>
                        {communityName}
                    </span>
                </div>
                <div className='ml-auto flex shrink-0 items-center gap-hair'>
                    <ThemeToggle compact />
                    <LanguageSwitcher compact />
                </div>
            </div>
        </header>
    );
}

/**
 * One tile resting on the board, divided by a shared rule: what this board is,
 * then the single way onto it and what taking it actually does.
 */
function ThresholdTile({ t }: Readonly<{ t: Dictionary }>) {
    // Flat at rest: DESIGN.md reserves the tile-rest shadow for things that are
    // genuinely movable tiles, which a container is not. Only the action inside
    // it carries one.
    return (
        <div className='w-full max-w-[40rem] border border-rule bg-card'>
            {/* Statement and the sentence explaining it are one block above the
                rule: the rule divides what this is from the way in. The body
                sentence reads auth.signInSubtitle rather than owning a key, so
                both doors are worded identically and cannot drift apart. */}
            <div className='flex flex-col gap-block p-bay'>
                <h1 className='type-display text-balance text-card-foreground'>
                    {t.landing.purpose}
                </h1>
                <p className='type-body max-w-[65ch] text-secondary-foreground'>
                    {t.auth.signInSubtitle}
                </p>
            </div>
            <div className='flex flex-col gap-cell border-t border-rule p-bay'>
                <form action={continueWithGoogle}>
                    <Button
                        type='submit'
                        className='type-label h-auto w-full gap-cell px-5 py-3 shadow-tile hover:bg-foreground hover:text-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:shadow-tile-pressed active:not-aria-[haspopup]:translate-y-0 sm:w-auto'>
                        <GoogleMark className='size-5' />
                        {t.auth.signInButton}
                    </Button>
                </form>
                <p className='type-caption max-w-[65ch] text-muted-foreground'>
                    {t.landing.accountNote}
                </p>
            </div>
        </div>
    );
}

export default async function LandingPage() {
    const [session, settings, locale] = await Promise.all([
        auth(),
        getSettings(),
        getLocale(),
    ]);
    const { communityName, logoUrl } = settings;
    const t = getDictionary(locale);

    if (session?.user) {
        if (!session.user.isProfileComplete) {
            redirect('/onboarding');
        }
        redirect('/dashboard');
    }

    return (
        <div className='flex min-h-dvh flex-col bg-background'>
            <IdentityRail communityName={communityName} logoUrl={logoUrl} />
            {/* Top-anchored inside the board's own 72rem gutter, so the tile's
                left edge is structurally the identity plate's and the footer's.
                Centring here put a 40rem tile in the full viewport width, 240px
                right of the logo at 1440px. DESIGN.md, Layout. */}
            <main
                className={`mx-auto flex w-full ${BOARD_WIDTH_CLASS} flex-1 items-start justify-start px-block py-bay`}>
                <ThresholdTile t={t} />
            </main>
            {/* px-block sits inside the 72rem wrapper, matching the rail: with
                the padding outside it the footer line landed 16px left of the
                identity plate and the tile, breaking the shared gutter. */}
            <footer className='border-t border-rule'>
                <p
                    className={`mx-auto ${BOARD_WIDTH_CLASS} type-caption px-block py-cell text-muted-foreground`}>
                    ©{' '}
                    <span className='tabular-nums'>
                        {new Date().getFullYear()}
                    </span>{' '}
                    {communityName}. {t.landing.footer}
                </p>
            </footer>
        </div>
    );
}

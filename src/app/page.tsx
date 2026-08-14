import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
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
// header plate and one way onto it — identity, one sentence of what the board
// is for, one action, and the truth about what that action does.

const BOARD_WIDTH = 'max-w-[72rem]';
const COLUMN_WIDTH = 'max-w-[40rem]';

/** Full-bleed header rail: identity plate at left, board controls at right. */
function IdentityRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-rule'>
            <div
                className={`mx-auto flex ${BOARD_WIDTH} flex-wrap items-center gap-block px-block py-cell`}>
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
    return (
        <div
            className={`w-full ${COLUMN_WIDTH} border border-rule bg-card shadow-tile`}>
            <h1 className='type-display text-balance p-block text-card-foreground'>
                {t.landing.purpose}
            </h1>
            <div className='flex flex-col gap-cell border-t border-rule p-block'>
                <form
                    action={async () => {
                        'use server';
                        await signIn('google', { redirectTo: '/dashboard' });
                    }}>
                    <Button
                        type='submit'
                        className='type-label h-auto w-full gap-cell px-5 py-3 shadow-tile hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:shadow-tile-pressed active:not-aria-[haspopup]:translate-y-0 sm:w-auto'>
                        <GoogleMark className='size-5' />
                        {t.landing.continueWithGoogle}
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
            <main className='flex flex-1 items-center justify-center px-block py-bay'>
                <ThresholdTile t={t} />
            </main>
            <footer className='border-t border-rule px-block py-cell'>
                <p
                    className={`mx-auto ${BOARD_WIDTH} type-caption text-muted-foreground`}>
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

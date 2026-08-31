import { continueWithGoogle } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { TASK_MEASURE } from '@/components/layout/measure';
import { cn } from '@/lib/utils';

/**
 * Sign-in, restyled onto Rally (#156): identity header, a Display page
 * title and one primary action, on the page ground — the same shape as the
 * waiting room and onboarding.
 *
 * Before the token layer landed, this page sat on a full-page `bg-primary-soft`
 * wash — a lavender ground in light, a deep purple one in dark, once `--primary`
 * became Purple. That was this page's own class choice, not a token defect, and
 * it is not what the spec's threshold pages describe. Decided here: the ground
 * is `bg-background`, the same off-white / Black Green ground every other
 * threshold page sits on, not a tinted wash.
 */
function IdentityRail({
    communityName,
    logoUrl,
}: Readonly<{ communityName: string; logoUrl: string }>) {
    return (
        <header className='border-b border-border bg-background'>
            <div
                className={cn(
                    TASK_MEASURE,
                    'flex items-center gap-cell px-block py-cell',
                )}>
                <CommunityIdentityMark
                    communityName={communityName}
                    logoUrl={logoUrl}
                    size='md'
                />
                {/* Same never-bleed guarantee every other rail carries: the
                    community name is runtime configuration of unknown length. */}
                <span className='type-mark min-w-0 break-words text-foreground'>
                    {communityName}
                </span>
            </div>
        </header>
    );
}

export default async function SignInPage() {
    const [{ communityName, logoUrl }, locale] = await Promise.all([
        getSettings(),
        getLocale(),
    ]);
    const t = getDictionary(locale);

    return (
        <div className='flex min-h-screen flex-col bg-background'>
            <IdentityRail communityName={communityName} logoUrl={logoUrl} />
            <main className='flex flex-1 items-center justify-center px-block py-bay'>
                <div className='flex w-full max-w-sm flex-col items-center gap-block text-center'>
                    <h1 className='type-display text-balance text-foreground'>
                        {t.auth.signInTitle}
                    </h1>
                    <p className='type-body max-w-[40ch] text-secondary-foreground'>
                        {t.auth.signInSubtitle}
                    </p>

                    {/* The Google action is the page's one primary action, so
                        it carries the primary button — PBP Green with Black
                        Green on it — rather than the outline treatment it used
                        to have. */}
                    <Card className='w-full'>
                        <CardContent className='flex flex-col items-center gap-block'>
                            <form action={continueWithGoogle} className='w-full'>
                                <Button
                                    type='submit'
                                    size='lg'
                                    className='w-full gap-3'>
                                    <GoogleMark className='size-5' />
                                    {t.auth.signInButton}
                                </Button>
                            </form>
                            <p className='type-caption text-muted-foreground'>
                                {t.auth.signInNote}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Dev-only shortcut to the OAuth-bypass login page. */}
                    {process.env.NODE_ENV !== 'production' && (
                        <a
                            href='/auth/dev'
                            className='rounded-sm type-caption text-muted-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'>
                            {t.auth.devSignInLink}
                        </a>
                    )}
                </div>
            </main>
        </div>
    );
}

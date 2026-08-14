import { continueWithGoogle } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { GoogleMark } from '@/components/auth/GoogleMark';

export default async function SignInPage() {
    const [{ communityName, logoUrl }, locale] = await Promise.all([
        getSettings(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    return (
        <div className='relative min-h-screen flex items-center justify-center bg-primary-soft px-6 py-10'>
            <div
                aria-hidden
                className='absolute inset-x-0 top-0 h-1.5 bg-primary-solid'
            />
            <div className='w-full max-w-sm flex flex-col items-center gap-6'>
                {/* Logo / Branding */}
                <div className='flex flex-col items-center gap-3'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='lg'
                        className='shadow-[0_8px_24px_rgba(15,118,110,0.25)]'
                    />
                    <div className='flex flex-col items-center gap-1'>
                        <h1 className='text-[22px] font-bold text-foreground'>
                            {communityName}
                        </h1>
                        <p className='text-sm text-primary text-center max-w-[260px] leading-relaxed'>
                            {t.auth.signInSubtitle}
                        </p>
                    </div>
                </div>

                <div className='bg-card rounded-2xl border border-primary-soft-border shadow-[0_4px_16px_rgba(15,118,110,0.08)] p-6 w-full flex flex-col items-center gap-4'>
                    <form action={continueWithGoogle} className='w-full'>
                        <Button
                            type='submit'
                            variant='outline'
                            size='lg'
                            className='w-full flex items-center gap-3 rounded-sm'>
                            <GoogleMark className='size-5' />
                            {t.auth.signInButton}
                        </Button>
                    </form>
                    <p className='text-xs text-subtle-foreground text-center leading-relaxed'>
                        {t.auth.signInNote}
                    </p>
                </div>

                {/* Dev-only shortcut to the OAuth-bypass login page. */}
                {process.env.NODE_ENV !== 'production' && (
                    <a
                        href='/auth/dev'
                        className='text-xs text-muted-foreground hover:underline'>
                        Dev login →
                    </a>
                )}
            </div>
        </div>
    );
}

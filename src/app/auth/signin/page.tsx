import { signIn } from '@/lib/auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/lib/settings';
import { communityAbbr } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function SignInPage() {
    const [{ communityName, logoUrl }, locale] = await Promise.all([
        getSettings(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    return (
        <div className='min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800'>
            <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-6'>
                {/* Logo / Branding */}
                <div className='flex flex-col items-center gap-2'>
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt={communityName}
                            width={64}
                            height={64}
                            className='w-16 h-16 rounded-full object-cover'
                        />
                    ) : (
                        <div className='w-16 h-16 bg-green-600 rounded-full flex items-center justify-center'>
                            <span className='text-white font-bold text-2xl'>
                                {communityAbbr(communityName)}
                            </span>
                        </div>
                    )}
                    <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                        {communityName}
                    </h1>
                    <p className='text-sm text-gray-500 dark:text-gray-400 text-center'>
                        {t.auth.signInSubtitle}
                    </p>
                </div>

                <div className='w-full border-t border-gray-100 dark:border-gray-700' />

                <div className='flex flex-col items-center gap-3 w-full'>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {t.auth.signInTitle}
                    </p>
                    <form
                        action={async () => {
                            'use server';
                            await signIn('google', {
                                redirectTo: '/dashboard',
                            });
                        }}
                        className='w-full'>
                        <Button
                            type='submit'
                            variant='outline'
                            className='w-full flex items-center gap-3'>
                            {/* Google Icon */}
                            <svg
                                viewBox='0 0 24 24'
                                className='w-5 h-5'
                                aria-hidden='true'>
                                <path
                                    d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                    fill='#4285F4'
                                />
                                <path
                                    d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                    fill='#34A853'
                                />
                                <path
                                    d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                    fill='#FBBC05'
                                />
                                <path
                                    d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                    fill='#EA4335'
                                />
                            </svg>
                            {t.auth.signInButton}
                        </Button>
                    </form>
                </div>

                <p className='text-xs text-gray-400 dark:text-gray-500 text-center'>
                    {t.auth.signInNote}
                </p>
            </div>
        </div>
    );
}

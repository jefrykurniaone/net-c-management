import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarDays, CreditCard, Users, ShieldCheck } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { communityAbbr } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';

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

    const featureIcons = [CalendarDays, CreditCard, Users, ShieldCheck];
    const featureColors = [
        'bg-blue-50 text-blue-600',
        'bg-green-50 text-green-600',
        'bg-orange-50 text-orange-600',
        'bg-purple-50 text-purple-600',
    ];

    return (
        <div className='min-h-screen bg-linear-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950'>
            {/* Header */}
            <header className='flex items-center justify-between px-6 py-4 max-w-6xl mx-auto'>
                <div className='flex items-center gap-3'>
                    {logoUrl ? (
                        <Image
                            src={logoUrl}
                            alt={communityName}
                            width={40}
                            height={40}
                            className='w-10 h-10 rounded-full object-cover'
                        />
                    ) : (
                        <div className='w-10 h-10 bg-green-600 rounded-full flex items-center justify-center'>
                            <span className='text-white font-bold'>
                                {communityAbbr(communityName)}
                            </span>
                        </div>
                    )}
                    <span className='text-xl font-bold text-gray-900 dark:text-white'>
                        {communityName}
                    </span>
                </div>
                <Link href='/auth/signin'>
                    <Button variant='outline'>{t.landing.signIn}</Button>
                </Link>
                <LanguageSwitcher compact />
            </header>

            {/* Hero */}
            <section className='text-center py-20 px-6 max-w-4xl mx-auto'>
                <div className='inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6'>
                    <span>🏸</span>
                    <span>
                        {t.landing.badge} {communityName}
                    </span>
                </div>
                <h1 className='text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight'>
                    {t.landing.heroTitle}{' '}
                    <span className='text-green-600'>
                        {t.landing.heroHighlight}
                    </span>
                </h1>
                <p className='text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8'>
                    {t.landing.heroParagraph} {communityName}.
                </p>
                <Link href='/auth/signin'>
                    <Button
                        size='lg'
                        className='bg-green-600 hover:bg-green-700 text-white'>
                        {t.landing.signIn}
                    </Button>
                </Link>
            </section>

            {/* Features */}
            <section className='py-16 px-6 max-w-6xl mx-auto'>
                <h2 className='text-2xl font-bold text-center text-gray-900 dark:text-white mb-10'>
                    {t.landing.featuresTitle}
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                    {t.landing.features.map(({ title, desc }, i) => {
                        const Icon = featureIcons[i];
                        const color = featureColors[i];
                        return (
                            <div
                                key={title}
                                className='bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800'>
                                <div
                                    className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
                                    <Icon className='w-5 h-5' />
                                </div>
                                <h3 className='font-semibold text-gray-900 dark:text-white mb-2'>
                                    {title}
                                </h3>
                                <p className='text-sm text-gray-500 dark:text-gray-400'>
                                    {desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Footer */}
            <footer className='text-center py-8 text-sm text-gray-400 border-t border-gray-100 dark:border-gray-800'>
                © {new Date().getFullYear()} {communityName}.{' '}
                {t.landing.footer}
            </footer>
        </div>
    );
}

import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarDays, CreditCard, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommunityIdentityMark } from '@/components/community/identity-mark';

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

    return (
        <div className='min-h-screen bg-background'>
            {/* Header */}
            <header className='flex items-center justify-between px-6 py-4 max-w-6xl mx-auto'>
                <div className='flex items-center gap-3'>
                    <CommunityIdentityMark
                        communityName={communityName}
                        logoUrl={logoUrl}
                        size='md'
                    />
                    <span className='text-xl font-bold text-foreground'>
                        {communityName}
                    </span>
                </div>
                <div className='flex items-center gap-1'>
                    <ThemeToggle compact />
                    <LanguageSwitcher compact />
                </div>
            </header>

            {/* Hero */}
            <section className='text-center py-20 px-6 max-w-4xl mx-auto'>
                <div className='inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6'>
                    <Sparkles className='w-4 h-4' />
                    <span>{t.landing.badge}</span>
                </div>
                <h1 className='text-4xl md:text-5xl font-extrabold text-foreground mb-4 leading-tight'>
                    {t.landing.heroTitle}{' '}
                    <span className='text-primary'>
                        {t.landing.heroHighlight}
                    </span>
                </h1>
                <p className='text-lg text-muted-foreground max-w-2xl mx-auto mb-8'>
                    {t.landing.heroParagraph} {communityName}.
                </p>
                <Link href='/auth/signin'>
                    <Button size='lg'>
                        {t.landing.signIn}
                    </Button>
                </Link>
            </section>

            {/* Features */}
            <section className='py-16 px-6 max-w-6xl mx-auto'>
                <h2 className='text-2xl font-bold text-center text-foreground mb-10'>
                    {t.landing.featuresTitle}
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                    {t.landing.features.map(({ title, desc }, i) => {
                        const Icon = featureIcons[i];
                        return (
                            <div
                                key={title}
                                className='bg-card rounded-xl p-6 shadow-sm border border-border'>
                                <div className='w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4'>
                                    <Icon className='w-5 h-5' />
                                </div>
                                <h3 className='font-semibold text-foreground mb-2'>
                                    {title}
                                </h3>
                                <p className='text-sm text-muted-foreground'>
                                    {desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Footer */}
            <footer className='text-center py-8 text-sm text-muted-foreground border-t border-border'>
                © {new Date().getFullYear()} {communityName}.{' '}
                {t.landing.footer}
            </footer>
        </div>
    );
}

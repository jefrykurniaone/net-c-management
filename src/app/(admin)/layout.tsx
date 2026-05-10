import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getSettings } from '@/lib/settings';
import { communityAbbr } from '@/lib/utils';

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [session, settings] = await Promise.all([auth(), getSettings()]);

    if (!session?.user) {
        redirect('/auth/signin');
    }

    if (!session.user.isProfileComplete) {
        redirect('/onboarding');
    }

    if (session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    return (
        <div className='flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950'>
            <div className='hidden md:flex md:shrink-0'>
                <Sidebar
                    communityName={settings.communityName}
                    logoUrl={settings.logoUrl}
                />
            </div>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <header className='md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'>
                    <MobileNav
                        communityName={settings.communityName}
                        logoUrl={settings.logoUrl}
                    />
                    <div className='flex items-center gap-2'>
                        {settings.logoUrl ? (
                            <Image
                                src={settings.logoUrl}
                                alt={settings.communityName}
                                width={28}
                                height={28}
                                className='w-7 h-7 rounded-full object-cover'
                            />
                        ) : (
                            <div className='w-7 h-7 bg-green-600 rounded-full flex items-center justify-center'>
                                <span className='text-white font-bold text-xs'>
                                    {communityAbbr(settings.communityName)}
                                </span>
                            </div>
                        )}
                        <span className='font-bold text-gray-900 dark:text-white text-sm'>
                            {settings.communityName}
                        </span>
                    </div>
                </header>
                <main className='flex-1 overflow-y-auto p-4 md:p-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}

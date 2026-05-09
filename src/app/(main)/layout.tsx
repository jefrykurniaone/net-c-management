import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { getSettings } from '@/lib/settings';
import { communityAbbr } from '@/lib/utils';

export default async function MainLayout({
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

    return (
        <div className='flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950'>
            {/* Sidebar — desktop */}
            <div className='hidden md:flex md:shrink-0'>
                <Sidebar communityName={settings.communityName} />
            </div>

            {/* Main content */}
            <div className='flex flex-col flex-1 overflow-hidden'>
                {/* Mobile topbar */}
                <header className='md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'>
                    <MobileNav communityName={settings.communityName} />
                    <div className='flex items-center gap-2'>
                        <div className='w-7 h-7 bg-green-600 rounded-full flex items-center justify-center'>
                            <span className='text-white font-bold text-xs'>
                                {communityAbbr(settings.communityName)}
                            </span>
                        </div>
                        <span className='font-bold text-gray-900 dark:text-white text-sm'>
                            {settings.communityName}
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className='flex-1 overflow-y-auto p-4 md:p-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}

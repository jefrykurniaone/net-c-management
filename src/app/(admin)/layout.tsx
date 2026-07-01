import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getSettings } from '@/lib/settings';
import { isAdminRole } from '@/lib/utils';

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

    if (!isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }

    return (
        <div className='flex h-screen overflow-hidden bg-muted'>
            <div className='hidden md:flex md:shrink-0'>
                <Sidebar
                    communityName={settings.communityName}
                    logoUrl={settings.logoUrl}
                />
            </div>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <header className='md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border'>
                    <MobileNav
                        communityName={settings.communityName}
                        logoUrl={settings.logoUrl}
                    />
                    <div className='flex items-center gap-2'>
                        <CommunityIdentityMark
                            communityName={settings.communityName}
                            logoUrl={settings.logoUrl}
                            size='sm'
                        />
                        <span className='font-bold text-foreground text-sm'>
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

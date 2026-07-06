import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
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

    // Pending-payment count powers the Payments nav badge (Club Premium).
    const pendingPayments = await prisma.payment.count({
        where: { status: 'PENDING' },
    });

    return (
        <div className='flex h-screen overflow-hidden bg-background'>
            <div className='hidden md:flex md:shrink-0'>
                <Sidebar
                    communityName={settings.communityName}
                    logoUrl={settings.logoUrl}
                    pendingPayments={pendingPayments}
                />
            </div>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <header className='md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border'>
                    <MobileNav
                        communityName={settings.communityName}
                        logoUrl={settings.logoUrl}
                        pendingPayments={pendingPayments}
                    />
                    <div className='flex items-center gap-2'>
                        <CommunityIdentityMark
                            communityName={settings.communityName}
                            logoUrl={settings.logoUrl}
                            size='sm'
                        />
                        <span className='font-heading font-semibold text-foreground text-sm'>
                            {settings.communityName}
                        </span>
                    </div>
                </header>
                <main className='flex-1 overflow-y-auto p-4 md:px-8 md:py-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}

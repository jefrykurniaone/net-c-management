import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MemberTopBar, MemberBottomNav } from '@/components/layout/member-nav';
import { getSettings } from '@/lib/settings';
import { isAdminRole } from '@/lib/utils';

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

    const isAdmin = isAdminRole(session.user.role);

    return (
        <div className='flex flex-col h-screen overflow-hidden bg-muted'>
            <MemberTopBar
                communityName={settings.communityName}
                logoUrl={settings.logoUrl}
                isAdmin={isAdmin}
            />

            {/* Single centered column; bottom padding clears the fixed mobile nav. */}
            <main className='flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6'>
                <div className='mx-auto w-full max-w-2xl'>{children}</div>
            </main>

            <MemberBottomNav isAdmin={isAdmin} />
        </div>
    );
}

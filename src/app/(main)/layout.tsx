import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MemberTopBar, MemberBottomNav } from '@/components/layout/member-nav';
import { getSettings } from '@/lib/settings';
import { isAdmittedSession } from '@/lib/admission';
import { isAdminRole } from '@/lib/utils';

// Nothing behind auth belongs in a search index (ticket 12 decision 7). The root
// layout already default-denies; this restates it on the group itself so a member
// surface cannot be made indexable by accident, and pairs with the disallow list
// in `src/app/robots.ts` — robots.txt is advisory, this tag is not.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

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

    // Layer two of the admission gate. Middleware already routes an Applicant
    // (and a revoked member) to `/pending`; this is the guard that holds if the
    // matcher ever stops covering a member path, in the same shape the auth
    // checks above already use.
    if (!isAdmittedSession(session)) {
        redirect('/pending');
    }

    const isAdmin = isAdminRole(session.user.role);

    return (
        <div className='flex flex-col h-screen overflow-hidden bg-background'>
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

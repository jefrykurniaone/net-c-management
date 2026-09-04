import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommunityIdentityMark } from '@/components/community/identity-mark';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { isAdmittedSession, WAITING_APPLICANT_WHERE } from '@/lib/admission';
import { isAdminRole } from '@/lib/utils';

// See `(main)/layout.tsx`: the admin surfaces are `noindex` for the same reason,
// stated on the group as well as at the root (ticket 12 decision 7).
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

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

    // Layer two of the admission gate — see `(main)/layout.tsx`. An admin who
    // has not been admitted (or was revoked) waits at the same door a stranger
    // does; the production OWNER is admitted by the seed scripts, so this cannot
    // lock the first admin out.
    if (!isAdmittedSession(session)) {
        redirect('/pending');
    }

    if (!isAdminRole(session.user.role)) {
        redirect('/dashboard');
    }

    // Two nav badges, counted here and threaded through `getAdminNav`:
    // pending payment proofs, and Applicants waiting for a decision. The queue
    // count is the *only* signal a new person has asked — 05 decided the Admin
    // gets a badge rather than an email per signup.
    const [pendingPayments, waitingApplicants] = await Promise.all([
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.user.count({ where: WAITING_APPLICANT_WHERE }),
    ]);

    return (
        <div className='flex h-screen overflow-hidden bg-background'>
            <div className='hidden md:flex md:shrink-0'>
                <Sidebar
                    communityName={settings.communityName}
                    logoUrl={settings.logoUrl}
                    pendingPayments={pendingPayments}
                    waitingApplicants={waitingApplicants}
                />
            </div>
            <div className='flex flex-col flex-1 overflow-hidden'>
                <header className='md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border'>
                    <MobileNav
                        communityName={settings.communityName}
                        logoUrl={settings.logoUrl}
                        pendingPayments={pendingPayments}
                        waitingApplicants={waitingApplicants}
                    />
                    <div className='flex items-center gap-2'>
                        <CommunityIdentityMark
                            communityName={settings.communityName}
                            logoUrl={settings.logoUrl}
                            size='sm'
                        />
                        <span className='font-semibold text-foreground text-sm'>
                            {settings.communityName}
                        </span>
                    </div>
                </header>
                {/* `relative`: this is the page's scroller, so it must also be
                    the containing block for absolutely positioned descendants.
                    Without it an `sr-only` span resolves against the initial
                    containing block, escapes the scroller and grows the
                    document — a second, page-level scrollbar beside this one. */}
                <main className='relative flex-1 overflow-y-auto p-4 md:px-8 md:py-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}

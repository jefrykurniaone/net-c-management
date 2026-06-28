'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export function AuthProvider({
    children,
    session,
}: Readonly<{ children: React.ReactNode; session: Session | null }>) {
    // Pass the server-resolved session so useSession() has the user (incl. role)
    // on the first client render — otherwise role-gated UI (e.g. the admin nav)
    // flashes its logged-out/member state until /api/auth/session resolves.
    return <SessionProvider session={session}>{children}</SessionProvider>;
}

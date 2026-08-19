'use client';

import { signOut } from 'next-auth/react';

/**
 * The door out — one of the waiting room's two affordances. An Applicant who is
 * not getting in must be able to leave, and the page has nothing else to offer
 * them: signing out returns them to the public route they came from.
 */
export function SignOutAction({ label }: Readonly<{ label: string }>) {
    return (
        <button
            type='button'
            onClick={() => signOut({ callbackUrl: '/' })}
            className='inline-flex min-h-11 items-center justify-center rounded-[2px] px-cell type-label text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
            {label}
        </button>
    );
}

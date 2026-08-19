'use client';

/** PROTOTYPE — throwaway (wayfinder ticket 11). The one control every variant
 *  agrees the waiting room needs: a way back out. */

import { signOut } from 'next-auth/react';

export function SignOutAction({ label }: Readonly<{ label: string }>) {
    return (
        <button
            type='button'
            onClick={() => signOut({ callbackUrl: '/' })}
            className='inline-flex min-h-11 items-center justify-center px-3 type-label text-muted-foreground underline'>
            {label}
        </button>
    );
}

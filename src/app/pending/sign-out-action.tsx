'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

/**
 * The door out — one of the waiting room's two affordances. An Applicant who is
 * not getting in must be able to leave, and the page has nothing else to offer
 * them: signing out returns them to the public route they came from.
 */
export function SignOutAction({ label }: Readonly<{ label: string }>) {
    return (
        <Button
            type='button'
            variant='ghost'
            size='lg'
            className='min-h-11 text-muted-foreground underline underline-offset-4 hover:text-foreground'
            onClick={() => signOut({ callbackUrl: '/' })}>
            {label}
        </Button>
    );
}

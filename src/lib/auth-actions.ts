'use server';

import { signIn } from '@/lib/auth';

/**
 * The one way in, shared by the landing threshold and the sign-in page so both
 * doors behave identically. Google login creates the account on first use:
 * there is no separate registration step and no invite gate in front of it.
 */
export async function continueWithGoogle() {
    await signIn('google', { redirectTo: '/dashboard' });
}

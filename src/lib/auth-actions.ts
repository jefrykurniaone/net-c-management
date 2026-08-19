'use server';

import { signIn } from '@/lib/auth';

/**
 * The one way in, shared by the landing threshold and the sign-in page so both
 * doors behave identically. Google login creates the account on first use:
 * there is no separate registration step.
 *
 * It does not, however, make you a member. Joining is approval-gated — signing
 * in makes you an **Applicant**, and an Admin admits you. `/dashboard` stays the
 * target because it is where an admitted member belongs; middleware routes
 * everyone else from there to `/onboarding` or `/pending`, so this action never
 * has to know which of the three the caller is. Both doors disclose the gate
 * before the click.
 */
export async function continueWithGoogle() {
    await signIn('google', { redirectTo: '/dashboard' });
}

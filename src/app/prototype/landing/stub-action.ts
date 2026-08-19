'use server';

/**
 * PROTOTYPE — throwaway (wayfinder ticket 07).
 *
 * The hero carries a real `<form>` because ticket 06 decision 8 made the CTA an
 * action rather than a link, and composing a band around a form is different
 * from composing around an anchor. But this is a prototype: wiring the real
 * `continueWithGoogle()` would send anyone poking at variants through a live
 * Google OAuth round trip. Nothing here writes, redirects, or authenticates.
 */
export async function stubJoin(formData: FormData): Promise<void> {
    const intent = formData.get('intent');
    console.log(`[prototype/landing] ${String(intent)} pressed — no-op`);
}

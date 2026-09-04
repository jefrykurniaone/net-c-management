/**
 * The deployment's own public URL, in one place.
 *
 * Two callers that must agree: the CTA links inside notification emails, and
 * `metadataBase` in the root layout — the base every relative metadata URL
 * (the OG card among them) is resolved against. A link-preview image served
 * from one host while the email CTA points at another is the same deployment
 * telling a member two different things about where it lives.
 *
 * Ticket 12 decision 9: no new environment variable. `NEXT_PUBLIC_APP_URL`
 * already ships (`.env.example`, `NEXT_PUBLIC_APP_URL`) and the localhost
 * fallback is the value
 * that file documents for development.
 *
 * Not `server-only`: it reads a `NEXT_PUBLIC_` variable, which is inlined for
 * the browser by design, and the email module that used to own this function
 * pulls in nodemailer — a dependency the root layout has no business loading.
 */
export function getAppUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

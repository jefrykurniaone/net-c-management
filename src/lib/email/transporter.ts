import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;

/** Whether the Gmail SMTP credentials are present. Senders should no-op when false. */
export function isEmailConfigured(): boolean {
    return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter(): Transporter {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
        throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD is not set.');
    }
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: { user, pass },
        });
    }
    return _transporter;
}

/**
 * Public base URL used for CTA links inside emails. It moved to
 * `src/lib/app-url.ts` when the root layout's `metadataBase` became a second
 * caller (ticket 12 decision 9) — importing it from here would have dragged
 * nodemailer into every page render. Re-exported so the six email templates
 * keep their existing import.
 */
export { getAppUrl } from '../app-url';

export interface SendEmailInput {
    to: string;
    subject: string;
    html: string;
    /** Display name on the From header (Gmail keeps the authenticated address). */
    communityName: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
    const transporter = getTransporter();
    // Gmail rewrites the From to the authenticated account; use it as sender
    // with the community name as the display label.
    const from = `"${input.communityName}" <${process.env.GMAIL_USER}>`;
    await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
    });
}

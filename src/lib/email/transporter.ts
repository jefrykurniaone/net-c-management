import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { formatSendFailure } from './send-error';

let _transporter: Transporter | null = null;

// Verified against installed nodemailer 7.0.13 (node_modules/nodemailer/lib/smtp-connection/index.js):
// each option is read as `this.options.<name> || <DEFAULT>`, so an explicit value here always wins
// over the library default. The Gmail well-known preset (lib/well-known/services.json) only sets
// host/port/secure, so it never overrides these.
/** How long to wait for the TCP connection to establish before failing (ms). */
const CONNECTION_TIMEOUT_MS = 15_000;
/** How long to wait for the SMTP greeting after connecting before failing (ms). */
const GREETING_TIMEOUT_MS = 10_000;
/** How long a connected socket may sit idle before it is torn down as stalled (ms). */
const SOCKET_TIMEOUT_MS = 30_000;
/** How long to wait for the DNS lookup of the SMTP host before failing (ms). */
const DNS_TIMEOUT_MS = 10_000;

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
            connectionTimeout: CONNECTION_TIMEOUT_MS,
            greetingTimeout: GREETING_TIMEOUT_MS,
            socketTimeout: SOCKET_TIMEOUT_MS,
            dnsTimeout: DNS_TIMEOUT_MS,
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
    const startedAt = Date.now();
    try {
        await transporter.sendMail({
            from,
            to: input.to,
            subject: input.subject,
            html: input.html,
        });
    } catch (error) {
        throw formatSendFailure(error, Date.now() - startedAt);
    }
}

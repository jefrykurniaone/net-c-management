import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    adminFooter,
    renderBody,
    renderEmailHtml,
    type EmailLocale,
} from './layout';

export interface AdmissionParams {
    to: string;
    name: string;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Sent when an Admin admits an Applicant.
 *
 * This email is not optional decoration: joining is approval-gated, the waiting
 * room shows nothing and holds nobody, and an Applicant has closed the tab. A
 * landing page that converts into silence is worse than no landing page — this
 * is the only thing that brings them back, so it is the one notification the
 * gate cannot ship without.
 *
 * No details card: there is one fact to carry, and the door is the CTA.
 */
export async function sendAdmission(p: AdmissionParams): Promise<void> {
    const isId = p.locale === 'id';
    const subject = isId
        ? `Kamu diterima di ${p.communityName}`
        : `You are in — ${p.communityName}`;

    const message = isId
        ? `Pengelola sudah <strong>menerimamu</strong> di ${p.communityName}.
            Sekarang kamu bisa melihat jadwal, mengambil tempat di sesi, dan
            mengurus iuranmu.`
        : `An organizer has <strong>let you in</strong> to ${p.communityName}.
            You can now see the schedule, claim a seat in a session, and handle
            your dues.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Kamu Diterima' : 'You Are In',
        rows: [],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Buka Komunitas' : 'Open the Community',
            url: `${getAppUrl()}/dashboard`,
        },
        // A person decided this, so the footer says a person sent it.
        footerNote: adminFooter(p.locale),
    });

    await sendEmail({
        to: p.to,
        subject,
        html,
        communityName: p.communityName,
    });
}

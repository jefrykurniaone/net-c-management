import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    adminFooter,
    formatLongDate,
    formatShortDate,
    renderBody,
    renderEmailHtml,
    type EmailLocale,
} from './layout';

export interface SessionReminderParams {
    to: string;
    name: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: Date;
    startTime: string;
    location: string;
    registered: number;
    max: number;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Admin-triggered "session needs players" nudge, sent to active members who
 * have not RSVP'd yet (POST /api/sessions/[id]/remind).
 */
export async function sendSessionReminder(
    p: SessionReminderParams,
): Promise<void> {
    const isId = p.locale === 'id';
    const dateShort = formatShortDate(p.sessionDate, p.locale);
    const subject = isId
        ? `Pengingat: ${p.sessionTitle} — ${dateShort}`
        : `Reminder: ${p.sessionTitle} — ${dateShort}`;

    const spotsLeft = p.max - p.registered;
    const message = isId
        ? `Sesi <strong>${p.sessionTitle}</strong> masih membutuhkan peserta. Masih ada
            <strong>${spotsLeft} tempat tersisa</strong> — yuk daftar sebelum penuh!`
        : `The <strong>${p.sessionTitle}</strong> session still needs more players. There are
            <strong>${spotsLeft} spots left</strong> — join before it fills up!`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: p.sessionTitle,
        rows: [
            {
                label: isId ? '📅 Tanggal' : '📅 Date',
                value: formatLongDate(p.sessionDate, p.locale),
            },
            { label: isId ? '⏰ Waktu' : '⏰ Time', value: p.startTime },
            { label: isId ? '📍 Lokasi' : '📍 Location', value: p.location },
            {
                label: isId ? '👥 Peserta' : '👥 Players',
                value: isId
                    ? `${p.registered} / ${p.max} terdaftar`
                    : `${p.registered} / ${p.max} registered`,
            },
        ],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Lihat &amp; Daftar Sesi' : 'View &amp; Join Session',
            url: `${getAppUrl()}/s/${p.sessionId}`,
        },
        footerNote: adminFooter(p.locale),
    });

    await sendEmail({
        to: p.to,
        subject,
        html,
        communityName: p.communityName,
    });
}

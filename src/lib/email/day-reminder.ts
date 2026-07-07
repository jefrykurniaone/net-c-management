import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    autoFooter,
    formatLongDate,
    renderBody,
    renderEmailHtml,
    type EmailLocale,
} from './layout';

export interface DayReminderParams {
    to: string;
    name: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: Date;
    startTime: string;
    endTime: string;
    location: string;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Day-of reminder for registered members: sent by the daily cron on the
 * morning of the session, asking them to show up.
 */
export async function sendDayReminder(p: DayReminderParams): Promise<void> {
    const isId = p.locale === 'id';
    const subject = isId
        ? `Hari ini: ${p.sessionTitle} — ${p.startTime}`
        : `Today: ${p.sessionTitle} — ${p.startTime}`;

    const message = isId
        ? `Sesi <strong>${p.sessionTitle}</strong> berlangsung <strong>hari ini</strong>
            dan kamu sudah terdaftar. Sampai jumpa di lokasi — datang tepat waktu ya!`
        : `The <strong>${p.sessionTitle}</strong> session is happening <strong>today</strong>
            and you are registered. See you there — please arrive on time!`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Sampai Jumpa Hari Ini!' : 'See You Today!',
        rows: [
            { label: isId ? '🏷️ Sesi' : '🏷️ Session', value: p.sessionTitle },
            {
                label: isId ? '📅 Tanggal' : '📅 Date',
                value: formatLongDate(p.sessionDate, p.locale),
            },
            {
                label: isId ? '⏰ Waktu' : '⏰ Time',
                value: `${p.startTime} – ${p.endTime}`,
            },
            { label: isId ? '📍 Lokasi' : '📍 Location', value: p.location },
        ],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Lihat Detail Sesi' : 'View Session Details',
            url: `${getAppUrl()}/s/${p.sessionId}`,
        },
        footerNote: autoFooter(p.locale),
    });

    await sendEmail({
        to: p.to,
        subject,
        html,
        communityName: p.communityName,
    });
}

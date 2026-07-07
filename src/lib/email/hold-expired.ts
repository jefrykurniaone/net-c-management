import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    autoFooter,
    formatLongDate,
    formatShortDate,
    renderBody,
    renderEmailHtml,
    type EmailLocale,
} from './layout';

export interface HoldExpiredParams {
    to: string;
    name: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: Date;
    startTime: string;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Sent when an unpaid reservation hold lapses and the sweep releases the seat:
 * the registration has expired and the member should register again.
 */
export async function sendHoldExpired(p: HoldExpiredParams): Promise<void> {
    const isId = p.locale === 'id';
    const dateShort = formatShortDate(p.sessionDate, p.locale);
    const subject = isId
        ? `Registrasi kedaluwarsa: ${p.sessionTitle} — ${dateShort}`
        : `Registration expired: ${p.sessionTitle} — ${dateShort}`;

    const message = isId
        ? `Registrasimu untuk sesi <strong>${p.sessionTitle}</strong> telah
            <strong>kedaluwarsa</strong> karena pembayaran belum kami terima dalam batas waktu.
            Tempatmu sudah dilepas. Jika masih ingin ikut, silakan lakukan registrasi ulang
            selama tempat masih tersedia.`
        : `Your registration for <strong>${p.sessionTitle}</strong> has
            <strong>expired</strong> because we did not receive your payment in time.
            Your seat has been released. If you still want to join, please register
            again while seats are available.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Registrasi Kedaluwarsa' : 'Registration Expired',
        rows: [
            { label: isId ? '🏷️ Sesi' : '🏷️ Session', value: p.sessionTitle },
            {
                label: isId ? '📅 Tanggal' : '📅 Date',
                value: formatLongDate(p.sessionDate, p.locale),
            },
            { label: isId ? '⏰ Waktu' : '⏰ Time', value: p.startTime },
        ],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Daftar Ulang' : 'Register Again',
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

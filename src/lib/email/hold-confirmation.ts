import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    autoFooter,
    formatLongDate,
    formatRupiah,
    formatShortDate,
    renderBody,
    renderEmailHtml,
    type EmailLocale,
} from './layout';

export interface HoldConfirmationParams {
    to: string;
    name: string;
    sessionTitle: string;
    sessionDate: Date;
    startTime: string;
    location: string;
    fee: number;
    /** Minutes the member has to complete payment before the seat is released. */
    holdMinutes: number;
    /** App-relative URL of the bill to settle (e.g. /payments/upload). */
    payPath: string;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Sent right after a seat is reserved with a payment hold: confirm the payment
 * within the hold window or the registration expires and the seat is released.
 */
export async function sendHoldConfirmation(
    p: HoldConfirmationParams,
): Promise<void> {
    const isId = p.locale === 'id';
    const dateShort = formatShortDate(p.sessionDate, p.locale);
    const subject = isId
        ? `Selesaikan pembayaran: ${p.sessionTitle} pada ${dateShort}`
        : `Complete your payment: ${p.sessionTitle} on ${dateShort}`;

    const message = isId
        ? `Tempatmu di sesi <strong>${p.sessionTitle}</strong> sudah dipesan. Selesaikan
            pembayaran dalam <strong>${p.holdMinutes} menit</strong>. Jika tidak,
            registrasimu akan <strong>kedaluwarsa</strong> dan tempatmu dilepas untuk member lain.`
        : `Your spot in <strong>${p.sessionTitle}</strong> is reserved. Complete your
            payment within <strong>${p.holdMinutes} minutes</strong>. Otherwise your
            registration <strong>expires</strong> and the seat is released to other members.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Konfirmasi Pembayaran' : 'Confirm Your Payment',
        rows: [
            { label: isId ? '🏷️ Sesi' : '🏷️ Session', value: p.sessionTitle },
            {
                label: isId ? '📅 Tanggal' : '📅 Date',
                value: formatLongDate(p.sessionDate, p.locale),
            },
            { label: isId ? '⏰ Waktu' : '⏰ Time', value: p.startTime },
            { label: isId ? '📍 Lokasi' : '📍 Location', value: p.location },
            {
                label: isId ? '💸 Tagihan' : '💸 Amount due',
                value: formatRupiah(p.fee),
            },
        ],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Bayar Sekarang' : 'Pay Now',
            url: `${getAppUrl()}${p.payPath}`,
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

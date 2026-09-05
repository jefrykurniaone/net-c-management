import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    autoFooter,
    formatMonthYear,
    formatRupiah,
    renderBody,
    renderEmailHtml,
} from './layout';
import type { DuesChangeParams } from './dues-change-params';

/**
 * Sent when an Admin replaces a Dues change that was already queued — a
 * different figure, a different month, or both.
 *
 * A replace is **one** event and sends **only** this template: the member never
 * receives a withdrawal followed by a fresh queue for the same act, which would
 * read as two decisions where an Admin made one.
 */
export async function sendDuesChangeReplaced(p: DuesChangeParams): Promise<void> {
    const isId = p.locale === 'id';
    const from = formatMonthYear(p.month, p.year, p.locale);
    const amount = formatRupiah(p.amount);

    const subject = isId
        ? `Perubahan iuran diperbarui: ${p.activityName} mulai ${from}`
        : `Updated Dues change: ${p.activityName} from ${from}`;

    const message = isId
        ? `Perubahan iuran <strong>${p.activityName}</strong> yang akan datang
            diperbarui: iuran menjadi <strong>${amount}</strong> mulai
            <strong>${from}</strong>. Angka inilah yang berlaku, bukan yang
            dikabarkan sebelumnya.`
        : `The upcoming Dues change for <strong>${p.activityName}</strong> was
            updated: Dues become <strong>${amount}</strong> from
            <strong>${from}</strong>. This figure replaces the one you were told
            before.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Perubahan Iuran Diperbarui' : 'Dues Change Updated',
        rows: [
            {
                label: isId ? '🏷️ Aktivitas' : '🏷️ Activity',
                value: p.activityName,
            },
            { label: isId ? '💸 Iuran baru' : '💸 New Dues', value: amount },
            { label: isId ? '📅 Mulai' : '📅 From', value: from },
        ],
        bodyHtml: renderBody(p.locale, p.name, message),
        cta: {
            label: isId ? 'Lihat Pembayaran Saya' : 'View My Payments',
            url: `${getAppUrl()}/payments`,
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

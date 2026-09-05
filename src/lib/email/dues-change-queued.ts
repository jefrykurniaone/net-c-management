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
 * Sent when an Admin queues a Dues change for a later Billing Period, to every
 * member of that Activity who is billed Monthly for the month it starts.
 *
 * Member vocabulary throughout: "Dues", a figure and a month. "Rate" is the
 * Admin's word for the stored row and never reaches a member.
 */
export async function sendDuesChangeQueued(p: DuesChangeParams): Promise<void> {
    const isId = p.locale === 'id';
    const from = formatMonthYear(p.month, p.year, p.locale);
    const amount = formatRupiah(p.amount);

    const subject = isId
        ? `Perubahan iuran: ${p.activityName} mulai ${from}`
        : `Dues change: ${p.activityName} from ${from}`;

    const message = isId
        ? `Iuran <strong>${p.activityName}</strong> berubah menjadi
            <strong>${amount}</strong> mulai <strong>${from}</strong>.
            Sampai bulan itu tiba, tidak ada yang berubah.`
        : `Dues for <strong>${p.activityName}</strong> change to
            <strong>${amount}</strong> from <strong>${from}</strong>.
            Nothing changes until that month arrives.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Perubahan Iuran' : 'Dues Change Coming',
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

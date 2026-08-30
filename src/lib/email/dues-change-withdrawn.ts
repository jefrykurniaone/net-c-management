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
 * Sent when an Admin withdraws a queued Dues change.
 *
 * `amount` is **the figure that stays** — what the current Billing Period
 * charges — never the withdrawn figure, which is the one that will now never
 * apply. The cancelled month is named too, so a member who was told "from
 * October" knows exactly which message this undoes.
 */
export async function sendDuesChangeWithdrawn(p: DuesChangeParams): Promise<void> {
    const isId = p.locale === 'id';
    const cancelled = formatMonthYear(p.month, p.year, p.locale);
    const amount = formatRupiah(p.amount);

    const subject = isId
        ? `Perubahan iuran dibatalkan: ${p.activityName}`
        : `Dues change cancelled: ${p.activityName}`;

    const message = isId
        ? `Perubahan iuran <strong>${p.activityName}</strong> untuk
            <strong>${cancelled}</strong> dibatalkan. Iuran tetap
            <strong>${amount}</strong>.`
        : `The Dues change for <strong>${p.activityName}</strong> planned for
            <strong>${cancelled}</strong> is cancelled. Dues stay at
            <strong>${amount}</strong>.`;

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isId ? 'Perubahan Iuran Dibatalkan' : 'Dues Change Cancelled',
        rows: [
            {
                label: isId ? '🏷️ Aktivitas' : '🏷️ Activity',
                value: p.activityName,
            },
            { label: isId ? '💸 Iuran tetap' : '💸 Dues stay at', value: amount },
            {
                label: isId ? '📅 Dibatalkan untuk' : '📅 Cancelled for',
                value: cancelled,
            },
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

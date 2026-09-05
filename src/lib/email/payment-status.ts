import 'server-only';
import { getAppUrl, sendEmail } from './transporter';
import {
    autoFooter,
    formatRupiah,
    renderBody,
    renderEmailHtml,
    type DetailRow,
    type EmailLocale,
} from './layout';

export interface PaymentStatusParams {
    to: string;
    name: string;
    status: 'CONFIRMED' | 'REJECTED';
    amount: number;
    /** What the payment covers, e.g. "Badminton — Juli 2026" or a session title. */
    billedFor: string;
    /** Admin note (rejection reason) — shown when present. */
    notes: string | null;
    communityName: string;
    locale: EmailLocale;
}

/**
 * Sent to the member when an admin reviews their payment proof: approved
 * (CONFIRMED) or rejected (REJECTED, seat released where applicable).
 */
export async function sendPaymentStatus(p: PaymentStatusParams): Promise<void> {
    const isId = p.locale === 'id';
    const isApproved = p.status === 'CONFIRMED';

    const subject = isId
        ? isApproved
            ? `Pembayaran diterima: ${p.billedFor}`
            : `Pembayaran ditolak: ${p.billedFor}`
        : isApproved
            ? `Payment approved: ${p.billedFor}`
            : `Payment rejected: ${p.billedFor}`;

    const approvedMsg = isId
        ? `Pembayaranmu untuk <strong>${p.billedFor}</strong> telah
            <strong>disetujui</strong> oleh admin. Tempat/iuranmu sudah terkonfirmasi. Terima kasih!`
        : `Your payment for <strong>${p.billedFor}</strong> has been
            <strong>approved</strong> by the admin. Your seat/dues are confirmed. Thank you!`;
    const rejectedMsg = isId
        ? `Pembayaranmu untuk <strong>${p.billedFor}</strong>
            <strong>ditolak</strong> oleh admin. Registrasi yang terkait telah dilepas.
            Silakan periksa bukti pembayaranmu dan unggah ulang jika perlu.`
        : `Your payment for <strong>${p.billedFor}</strong> was
            <strong>rejected</strong> by the admin. Any linked registration has been released.
            Please check your payment proof and re-upload if needed.`;

    const rows: DetailRow[] = [
        { label: isId ? '🧾 Tagihan' : '🧾 Billed for', value: p.billedFor },
        { label: isId ? '💸 Nominal' : '💸 Amount', value: formatRupiah(p.amount) },
        {
            label: isId ? '📋 Status' : '📋 Status',
            value: isApproved
                ? isId ? '✅ Disetujui' : '✅ Approved'
                : isId ? '❌ Ditolak' : '❌ Rejected',
            chip: isApproved ? 'settled' : 'void',
        },
    ];
    if (p.notes) {
        rows.push({
            label: isId ? '📝 Catatan admin' : '📝 Admin note',
            value: p.notes,
        });
    }

    const html = renderEmailHtml({
        lang: p.locale,
        communityName: p.communityName,
        heading: isApproved
            ? isId ? 'Pembayaran Disetujui' : 'Payment Approved'
            : isId ? 'Pembayaran Ditolak' : 'Payment Rejected',
        rows,
        bodyHtml: renderBody(p.locale, p.name, isApproved ? approvedMsg : rejectedMsg),
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

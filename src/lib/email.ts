import 'server-only';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';

const FROM_ADDRESS =
    process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

let _resend: Resend | null = null;

function getResend(): Resend {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not set.');
    }
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    return _resend;
}

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
    locale: 'en' | 'id';
}

function buildSubject(p: SessionReminderParams): string {
    const dateStr = format(
        p.sessionDate,
        'd MMM yyyy',
        { locale: p.locale === 'id' ? localeId : enUS },
    );
    return p.locale === 'id'
        ? `Pengingat: ${p.sessionTitle} — ${dateStr}`
        : `Reminder: ${p.sessionTitle} — ${dateStr}`;
}

function buildHtml(p: SessionReminderParams, appUrl: string): string {
    const dateStr = format(
        p.sessionDate,
        'EEEE, d MMMM yyyy',
        { locale: p.locale === 'id' ? localeId : enUS },
    );
    const spotsLeft = p.max - p.registered;
    const sessionUrl = `${appUrl}/s/${p.sessionId}`;

    if (p.locale === 'id') {
        return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${p.communityName}</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">${p.sessionTitle}</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">📅 Tanggal</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">⏰ Waktu</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.startTime}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 Lokasi</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.location}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">👥 Peserta</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.registered} / ${p.max} terdaftar</td>
            </tr>
          </table>
          <p style="margin:24px 0 8px;font-size:15px;color:#111827;">Hei <strong>${p.name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            Sesi <strong>${p.sessionTitle}</strong> masih membutuhkan peserta. Masih ada
            <strong>${spotsLeft} tempat tersisa</strong> — yuk daftar sebelum penuh!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${sessionUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                Lihat &amp; Daftar Sesi
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 32px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${p.communityName} · pesan ini dikirim oleh admin komunitas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${p.communityName}</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">${p.sessionTitle}</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">📅 Date</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">⏰ Time</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.startTime}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 Location</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.location}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">👥 Players</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${p.registered} / ${p.max} registered</td>
            </tr>
          </table>
          <p style="margin:24px 0 8px;font-size:15px;color:#111827;">Hi <strong>${p.name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            The <strong>${p.sessionTitle}</strong> session still needs more players. There are
            <strong>${spotsLeft} spots left</strong> — join before it fills up!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${sessionUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                View &amp; Join Session
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px 32px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${p.communityName} · this message was sent by your community admin</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSessionReminder(
    p: SessionReminderParams,
): Promise<void> {
    const resend = getResend();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await resend.emails.send({
        from: FROM_ADDRESS,
        to: p.to,
        subject: buildSubject(p),
        html: buildHtml(p, appUrl),
    });
}

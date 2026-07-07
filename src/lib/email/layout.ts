import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';

export type EmailLocale = 'en' | 'id';

/** One label/value line in the details card at the top of an email. */
export interface DetailRow {
    label: string;
    value: string;
}

export interface EmailLayoutInput {
    lang: EmailLocale;
    communityName: string;
    heading: string;
    rows: DetailRow[];
    /** Greeting + message paragraphs (inner HTML of the body block). */
    bodyHtml: string;
    cta: { label: string; url: string } | null;
    footerNote: string;
}

export function formatLongDate(date: Date, locale: EmailLocale): string {
    return format(date, 'EEEE, d MMMM yyyy', {
        locale: locale === 'id' ? localeId : enUS,
    });
}

export function formatShortDate(date: Date, locale: EmailLocale): string {
    return format(date, 'd MMM yyyy', {
        locale: locale === 'id' ? localeId : enUS,
    });
}

export function formatRupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** "Juli 2026" / "July 2026" for a 1-based month + year billing period. */
export function formatMonthYear(
    month: number,
    year: number,
    locale: EmailLocale,
): string {
    return format(new Date(Date.UTC(year, month - 1, 1)), 'MMMM yyyy', {
        locale: locale === 'id' ? localeId : enUS,
    });
}

function renderRows(rows: DetailRow[]): string {
    if (rows.length === 0) return '';
    const cells = rows
        .map(
            (r) => `            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">${r.label}</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;text-align:right;">${r.value}</td>
            </tr>`,
        )
        .join('\n');
    return `          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:20px;">
${cells}
          </table>`;
}

function renderCta(cta: { label: string; url: string } | null): string {
    if (!cta) return '';
    return `          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${cta.url}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                ${cta.label}
              </a>
            </td></tr>
          </table>`;
}

/** Shared HTML shell used by every transactional email. */
export function renderEmailHtml(input: EmailLayoutInput): string {
    return `<!DOCTYPE html>
<html lang="${input.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${input.communityName}</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">${input.heading}</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
${renderRows(input.rows)}
${input.bodyHtml}
${renderCta(input.cta)}
        </td></tr>
        <tr><td style="padding:16px 32px 32px;text-align:center;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${input.communityName} · ${input.footerNote}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Standard greeting + message paragraphs used as `bodyHtml`. */
export function renderBody(
    lang: EmailLocale,
    name: string,
    messageHtml: string,
): string {
    const hello = lang === 'id' ? 'Hei' : 'Hi';
    return `          <p style="margin:24px 0 8px;font-size:15px;color:#111827;">${hello} <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            ${messageHtml}
          </p>`;
}

/** Default footer line: "sent by your community admin". */
export function adminFooter(lang: EmailLocale): string {
    return lang === 'id'
        ? 'pesan ini dikirim oleh admin komunitas'
        : 'this message was sent by your community admin';
}

/** Footer line for automated notifications (no human sender). */
export function autoFooter(lang: EmailLocale): string {
    return lang === 'id'
        ? 'notifikasi otomatis — tidak perlu dibalas'
        : 'automated notification — no reply needed';
}

import { format } from 'date-fns';
import { id as localeId, enUS } from 'date-fns/locale';

export type EmailLocale = 'en' | 'id';

/**
 * The Rally palette, inlined for email clients.
 *
 * Email clients cannot read a CSS custom property, so the hex values below are
 * duplicated here on purpose — this is the **one permitted duplication** of a
 * palette hex in the repo. The token layer, and the only other place these
 * values are allowed to live, is `src/app/styles/colors.css`; a value
 * changed there must be changed here too, by hand — `src/lib/__tests__/email-palette-source.test.ts`
 * reads both files and fails if one drifts from the other. Every ratio below is measured with `src/lib/theme-contrast.ts`
 * against the exact ground it renders on, not assumed from the app's token
 * roles: an email backdrop is its own surface, not `--background`.
 */
const HEADER_BG = '#0E1F17'; // Black Green — the header band's ground
const HEADER_INK = '#F1EEE5'; // off-white — ink on the header band (14.75:1)
const BODY_BG = '#F0E9DB'; // Shells, beige — the page ground around the card
const CARD_BG = '#FFFFFF'; // White — the card face (17.11:1 body ink on it)
const CARD_INK = '#0E1F17'; // Black Green — running ink on light grounds
const ROWS_BG = '#FBF8F1'; // Shells, cream — the details table's wash
const MUTED_INK = '#4A5C52'; // muted-foreground — row labels (7.13:1 on card)
const SUBTLE_INK = '#55675D'; // subtle-foreground — footer (6.03:1 on card)
const BORDER = '#8B7E68'; // shell-taupe — the footer's top divider
const BUTTON_BG = '#3ED27E'; // PBP Green — the primary action's ground
const BUTTON_INK = '#0E1F17'; // Black Green — the only ink PBP Green carries (8.74:1)
const SETTLED_INK = '#136B3F'; // settled chip ink (5.59:1 on its wash)
const SETTLED_WASH = '#DDF2E4';
const VOID_INK = '#9E2B25'; // void chip ink (6.04:1 on its wash)
const VOID_WASH = '#F8E3E1';

/** Which chip variant a status word renders as. See DESIGN.md, Chips. */
export type StatusChipVariant = 'settled' | 'void';

/** One label/value line in the details card at the top of an email. */
export interface DetailRow {
    label: string;
    value: string;
    /** Renders `value` as a labelled status chip instead of plain text. */
    chip?: StatusChipVariant;
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

function renderValueCell(row: DetailRow): string {
    if (!row.chip) {
        return `<td style="padding:6px 0;font-size:14px;color:${CARD_INK};font-weight:500;text-align:right;">${row.value}</td>`;
    }
    const [ink, wash] = row.chip === 'settled'
        ? [SETTLED_INK, SETTLED_WASH]
        : [VOID_INK, VOID_WASH];
    return `<td style="padding:6px 0;text-align:right;">
                <span style="display:inline-block;background:${wash};color:${ink};font-size:13px;font-weight:700;padding:4px 12px;border-radius:9999px;">${row.value}</span>
              </td>`;
}

function renderRows(rows: DetailRow[]): string {
    if (rows.length === 0) return '';
    const cells = rows
        .map(
            (r) => `            <tr>
              <td style="padding:6px 0;font-size:14px;color:${MUTED_INK};">${r.label}</td>
              ${renderValueCell(r)}
            </tr>`,
        )
        .join('\n');
    return `          <table width="100%" cellpadding="0" cellspacing="0" style="background:${ROWS_BG};border-radius:8px;padding:20px;">
${cells}
          </table>`;
}

function renderCta(cta: { label: string; url: string } | null): string {
    if (!cta) return '';
    return `          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${cta.url}"
                 style="display:inline-block;background:${BUTTON_BG};color:${BUTTON_INK};font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
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
<body style="margin:0;padding:0;background:${BODY_BG};font-family:Archivo,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BODY_BG};padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 28px;text-align:center;background:${HEADER_BG};">
          <p style="margin:0 0 4px;font-size:13px;color:${HEADER_INK};text-transform:uppercase;letter-spacing:0.05em;">${input.communityName}</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:${HEADER_INK};">${input.heading}</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;background:${CARD_BG};">
${renderRows(input.rows)}
${input.bodyHtml}
${renderCta(input.cta)}
        </td></tr>
        <tr><td style="padding:16px 32px 32px;text-align:center;border-top:1px solid ${BORDER};background:${CARD_BG};">
          <p style="margin:0;font-size:12px;color:${SUBTLE_INK};">${input.communityName} · ${input.footerNote}</p>
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
    return `          <p style="margin:24px 0 8px;font-size:15px;color:${CARD_INK};">${hello} <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:${MUTED_INK};line-height:1.6;">
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
        ? 'notifikasi otomatis, tidak perlu dibalas'
        : 'automated notification, no reply needed';
}

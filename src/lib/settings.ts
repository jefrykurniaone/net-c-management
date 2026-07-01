import 'server-only';
import { prisma } from './prisma';
import { getLocale } from './i18n/locale';
import { getDictionary } from './i18n/dictionaries';

export interface AppSettings {
    communityName: string;
    defaultLocation: string;
    adminWhatsapp: string;
    logoUrl: string;
}

/**
 * Static fallbacks for settings whose default is locale-independent.
 * `communityName` is intentionally excluded — its neutral default is
 * locale-resolved through the i18n dictionary (AD-10): "Sports Community"
 * (en) / "Komunitas Olahraga" (id). No sport-specific or "PB Net-C" brand
 * string is baked in here.
 */
const DEFAULTS: Omit<AppSettings, 'communityName'> = {
    defaultLocation: '',
    adminWhatsapp: '',
    logoUrl: '',
};

/**
 * Server-side helper: fetch all app settings from the DB.
 * Falls back to defaults if a key is missing; the community-name default is
 * sourced from the i18n dictionary so a fresh deployment shows a neutral,
 * locale-appropriate name.
 * Only call from Server Components or Route Handlers.
 */
export async function getSettings(): Promise<AppSettings> {
    const [rows, locale] = await Promise.all([
        prisma.settings.findMany(),
        getLocale(),
    ]);
    const t = getDictionary(locale);
    const map = Object.fromEntries(rows.map((s) => [s.key, s.value]));
    return {
        // A blank/whitespace-only stored value falls back to the neutral
        // dictionary default so a saved empty name never propagates an empty
        // identity across the app (AD-10; FR-4). `?.trim()` also strips stray
        // surrounding whitespace from a real configured name.
        communityName: map.communityName?.trim() || t.brand.defaultCommunityName,
        defaultLocation: map.defaultLocation ?? DEFAULTS.defaultLocation,
        adminWhatsapp: map.adminWhatsapp ?? DEFAULTS.adminWhatsapp,
        logoUrl: map.logoUrl ?? DEFAULTS.logoUrl,
    };
}

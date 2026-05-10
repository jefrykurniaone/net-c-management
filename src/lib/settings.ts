import 'server-only';
import { prisma } from './prisma';

export interface AppSettings {
    communityName: string;
    defaultMonthlyFee: number;
    defaultLocation: string;
    adminWhatsapp: string;
    maxPlayers: number;
    logoUrl: string;
}

const DEFAULTS: AppSettings = {
    communityName: 'PB Net-C',
    defaultMonthlyFee: 50000,
    defaultLocation: '',
    adminWhatsapp: '',
    maxPlayers: 20,
    logoUrl: '',
};

/**
 * Server-side helper: fetch all app settings from the DB.
 * Falls back to defaults if a key is missing.
 * Only call from Server Components or Route Handlers.
 */
export async function getSettings(): Promise<AppSettings> {
    const rows = await prisma.settings.findMany();
    const map = Object.fromEntries(rows.map((s) => [s.key, s.value]));
    return {
        communityName: map.communityName ?? DEFAULTS.communityName,
        defaultMonthlyFee: Number(
            map.defaultMonthlyFee ?? DEFAULTS.defaultMonthlyFee,
        ),
        defaultLocation: map.defaultLocation ?? DEFAULTS.defaultLocation,
        adminWhatsapp: map.adminWhatsapp ?? DEFAULTS.adminWhatsapp,
        maxPlayers: Number(map.maxPlayers ?? DEFAULTS.maxPlayers),
        logoUrl: map.logoUrl ?? DEFAULTS.logoUrl,
    };
}

/**
 * Derive a short abbreviation (≤ 2 chars) from a community name.
 * e.g. "PB Net-C" → "PB", "Badminton Club" → "BC"
 */
export function communityAbbr(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

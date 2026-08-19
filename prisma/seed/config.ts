/** Static seed data: settings, activities, member names, rosters. */

export const SETTINGS: Record<string, string> = {
    communityName: 'XClub Community',
    defaultLocation: 'GOR Cempaka',
    adminWhatsapp: '6281200000001',
    logoUrl: '',
    holdDurationMinutes: '60',
};

export const SUNDAY = 0;
export const TUESDAY = 2;
export const THURSDAY = 4;
export const FRIDAY = 5;
export const SATURDAY = 6;

const BADMINTON = {
    slug: 'badminton',
    name: 'Badminton',
    monthlyFee: 75_000,
    sessionFee: 25_000,
    allowsMonthly: true,
    allowsPerSession: true,
    minMembers: 0,
    recurringDay: SUNDAY,
    recurringStartTime: '19:00',
    recurringEndTime: '21:00',
    defaultLocation: 'GOR Cempaka Court 3',
    maxPlayers: 24,
    adminWhatsapp: '6281200000001',
    bankName: 'BCA',
    bankAccountNumber: '1234 567 890',
    bankAccountHolder: 'XClub Community',
} as const;

const FUTSAL = {
    slug: 'futsal',
    name: 'Futsal',
    monthlyFee: 40_000,
    sessionFee: 15_000,
    allowsMonthly: true,
    allowsPerSession: true,
    minMembers: 4,
    recurringDay: FRIDAY,
    recurringStartTime: '20:00',
    recurringEndTime: '22:00',
    defaultLocation: 'Champions Arena B',
    maxPlayers: 12,
    adminWhatsapp: '6281200000002',
    bankName: 'Mandiri',
    bankAccountNumber: '1370 0099 8877',
    bankAccountHolder: 'XClub Futsal',
} as const;

const BASKET = {
    slug: 'basket',
    name: 'Basket',
    monthlyFee: 60_000,
    sessionFee: 20_000,
    allowsMonthly: true,
    allowsPerSession: true,
    minMembers: 6,
    recurringDay: TUESDAY,
    recurringStartTime: '19:30',
    recurringEndTime: '21:30',
    defaultLocation: 'GBK Basketball Hall',
    maxPlayers: 10,
    adminWhatsapp: '6281200000001',
    bankName: 'BNI',
    bankAccountNumber: '0345 6789 012',
    bankAccountHolder: 'XClub Basket',
} as const;

const TENNIS = {
    slug: 'tennis',
    name: 'Tennis',
    monthlyFee: 55_000,
    sessionFee: 20_000,
    allowsMonthly: true,
    allowsPerSession: true,
    minMembers: 2,
    recurringDay: THURSDAY,
    recurringStartTime: '17:00',
    recurringEndTime: '19:00',
    defaultLocation: 'Senayan Tennis Court 2',
    maxPlayers: 8,
    adminWhatsapp: '6281200000002',
    bankName: 'BRI',
    bankAccountNumber: '0021 0104 5566',
    bankAccountHolder: 'XClub Tennis',
} as const;

export const ACTIVITY_CONFIGS = [BADMINTON, FUTSAL, BASKET, TENNIS] as const;
export { BADMINTON, FUTSAL, BASKET, TENNIS };

/** Login member — shown as "Adi Pratama (you)", first in the players list. */
export const LOGIN_EMAIL = process.env.SEED_MEMBER_EMAIL?.trim() || 'member@xclub.local';

/** 17 other GOING players (with Adi = 18 seat-holders → rally header 18/24). */
export const GOING_NAMES = [
    'Sari Rahma',
    'Bima Wicaksono',
    'Rizki Hidayat',
    'Putri Anggraini',
    'Fajar Nugroho',
    'Maya Sari',
    'Dimas Prakoso',
    'Nadia Putri',
    'Yoga Saputra',
    'Intan Permata',
    'Reza Fauzi',
    'Lestari Wulandari',
    'Andi Setiawan',
    'Galih Ramadhan',
    'Citra Dewi',
    'Bagus Wijaya',
    'Wulan Sari',
];

/** Tentative RSVP — renders the "Maybe" pill in the list preview. */
export const MAYBE_NAME = 'Dewi Lestari';

/** Joins Futsal with paymentMode = null → tests the "choose a mode" flow. */
export const UNSELECTED_MODE_NAME = 'Eka Saputri';

/** Every seeded member (Adi is added separately with the login email). */
export const MEMBER_NAMES = [...GOING_NAMES, MAYBE_NAME, UNSELECTED_MODE_NAME];

/**
 * Badminton members whose Membership.paymentMode is PER_SESSION. They never
 * get MONTHLY dues — their seats are funded by SESSION payments instead.
 */
export const PER_SESSION_NAMES = [
    'Yoga Saputra',
    'Intan Permata',
    'Reza Fauzi',
    'Galih Ramadhan',
];

/** Badminton MONTHLY member with a queued switch to PER_SESSION next month. */
export const PENDING_SWITCH_NAME = 'Citra Dewi';

/** Named members per activity (Adi joins all four separately). */
export const ROSTERS: Record<string, string[]> = {
    badminton: [...GOING_NAMES, MAYBE_NAME],
    futsal: ['Sari Rahma', 'Bima Wicaksono', 'Rizki Hidayat', 'Putri Anggraini', 'Fajar Nugroho', 'Maya Sari'],
    basket: ['Rizki Hidayat', 'Dimas Prakoso', 'Galih Ramadhan', 'Bagus Wijaya', 'Andi Setiawan'],
    tennis: ['Putri Anggraini', 'Nadia Putri', 'Citra Dewi', 'Wulan Sari'],
};

/** Roster for "Morning Drills" — a subset that does NOT include Adi. */
export const DRILLS_NAMES = [
    'Dimas Prakoso',
    'Nadia Putri',
    'Yoga Saputra',
    'Intan Permata',
    'Reza Fauzi',
    'Andi Setiawan',
];

// Past attendance — Adi PRESENT in PAST_PRESENT of PAST_TOTAL → ~92% tile.
export const PAST_TOTAL = 13;
export const PAST_PRESENT = 12;
export const PAST_SLUGS = ['badminton', 'futsal', 'basket', 'tennis'];
export const PAST_TITLES = ['Practice', 'Scrimmage', 'Friendly Match', 'Drills', 'Open Court'];
export const PAST_PRESENT_OTHERS = 2; // roster members marked PRESENT per past session
export const PAST_ABSENT_INDEX = 2; // roster index marked ABSENT per past session

export function slugEmail(name: string): string {
    const slug = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
    return `${slug}@xclub.local`;
}

export function configBySlug(slug: string) {
    const cfg = ACTIVITY_CONFIGS.find((c) => c.slug === slug);
    if (!cfg) throw new Error(`Unknown activity ${slug}`);
    return cfg;
}

export const PER_SESSION_EMAILS = new Set(PER_SESSION_NAMES.map(slugEmail));

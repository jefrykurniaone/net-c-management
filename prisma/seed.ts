/**
 * Local development seed — DASHBOARD DESIGN SIMULATION.
 *
 * Reproduces the member dashboard for the logged-in member "Adi Pratama":
 *   - Four activities Adi belongs to: Badminton (dues UNPAID, Rp 75,000/mo),
 *     Futsal, Basket and Tennis (all PAID) → dashboard shows "Dues: 1 unpaid".
 *   - Five upcoming sessions (→ "Upcoming 5" tile):
 *       • Badminton "Weekly Rally Night" Sun 19:00 · GOR Cempaka Court 3 — GOING
 *       • Badminton "Morning Drills"     Sat 07:00 · GOR Cempaka Court 1 — RSVP
 *       • Futsal    "Futsal Friday"      Fri 20:00 · Champions Arena B  — GOING
 *       • Basket    "Pickup Game"        Tue 19:30 · GBK Basketball Hall — GOING
 *       • Tennis     "Singles Ladder"     Thu 17:00 · Senayan Court 2     — GOING
 *   - Dues banner: "Badminton dues unpaid · <month> · Rp 75,000".
 *   - Weekly Rally Night drives the session-detail mockup: 18/24 seats
 *     (Adi + 17 going, Dewi Lestari MAYBE), list ordered
 *     Adi Pratama (you) · Sari Rahma · Bima Wicaksono · Dewi Lestari (Maybe).
 *   - Past COMPLETED sessions this month (Adi PRESENT in 12 of 13) → the
 *     Attendance tile reads ~92%.
 *
 * Every player except Adi-in-Badminton has the current period's dues CONFIRMED,
 * so seats stay consistent with the seat-lock-follows-money rule.
 *
 * Run after a fresh schema:
 *   npx prisma db push --force-reset --accept-data-loss
 *   npx prisma db execute --file prisma/payment-monthly-unique.sql
 *   npm run db:seed
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import {
    PrismaClient,
    PaymentMode,
    Role,
    AttendanceStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SETTINGS: Record<string, string> = {
    communityName: 'XClub Community',
    defaultLocation: 'GOR Cempaka',
    adminWhatsapp: '6281200000001',
    logoUrl: '',
};

const SUNDAY = 0;
const TUESDAY = 2;
const THURSDAY = 4;
const FRIDAY = 5;
const DAYS_PER_WEEK = 7;
const MIN_DAYS_OUT = 2;
const DRILLS_OFFSET_DAYS = 6; // Saturday after the Sunday rally
const FUTSAL_OFFSET_DAYS = 5; // Friday after the Sunday rally

const BADMINTON = {
    slug: 'badminton',
    name: 'Badminton',
    color: '#0EA5E9',
    monthlyFee: 75_000,
    sessionFee: 25_000,
    allowsMonthly: true,
    allowsPerSession: true,
    // No cost-sharing minimum — keeps the design's detail card free of the
    // "quota" row (the mockup shows only date/time/location/fee).
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
    color: '#F97316',
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
    color: '#7C3AED',
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
    color: '#16A34A',
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

const ACTIVITY_CONFIGS = [BADMINTON, FUTSAL, BASKET, TENNIS] as const;

/** Login member — shown as "Adi Pratama (you)", first in the players list. */
const LOGIN_EMAIL = process.env.SEED_MEMBER_EMAIL?.trim() || 'member@xclub.local';

/** 17 other GOING players (with Adi = 18 seat-holders → header 18/24). */
const GOING_NAMES = [
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
const MAYBE_NAME = 'Dewi Lestari';

/** Every seeded member (Adi is added separately with the login email). */
const MEMBER_NAMES = [...GOING_NAMES, MAYBE_NAME];

/** Named members per activity (Adi joins all four separately). */
const ROSTERS: Record<string, string[]> = {
    badminton: [...GOING_NAMES, MAYBE_NAME],
    futsal: ['Sari Rahma', 'Bima Wicaksono', 'Rizki Hidayat', 'Putri Anggraini', 'Fajar Nugroho', 'Maya Sari'],
    basket: ['Rizki Hidayat', 'Dimas Prakoso', 'Galih Ramadhan', 'Bagus Wijaya', 'Andi Setiawan'],
    tennis: ['Putri Anggraini', 'Nadia Putri', 'Citra Dewi', 'Wulan Sari'],
};

/** Roster for "Morning Drills" — a subset that does NOT include Adi. */
const DRILLS_NAMES = [
    'Dimas Prakoso',
    'Nadia Putri',
    'Yoga Saputra',
    'Intan Permata',
    'Reza Fauzi',
    'Andi Setiawan',
];

function slugEmail(name: string): string {
    const slug = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
    return `${slug}@xclub.local`;
}

/** Next occurrence of `weekday` at least MIN_DAYS_OUT days ahead of `from`. */
function nextWeekday(from: Date, weekday: number): Date {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    const delta = (weekday - d.getDay() + DAYS_PER_WEEK) % DAYS_PER_WEEK;
    const add = delta < MIN_DAYS_OUT ? delta + DAYS_PER_WEEK : delta;
    d.setDate(d.getDate() + add);
    return d;
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

interface Period {
    month: number;
    year: number;
}

function periodOf(date: Date): Period {
    return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function periodKey(p: Period): number {
    return p.year * 100 + p.month;
}

/** Distinct monthly periods a payment must cover for the given dates. */
function uniquePeriods(dates: Date[]): Period[] {
    const byKey = new Map<number, Period>();
    for (const d of dates) {
        const p = periodOf(d);
        byKey.set(periodKey(p), p);
    }
    return [...byKey.values()];
}

const now = new Date();
const CURRENT_KEY = periodKey(periodOf(now));

const RALLY_DATE = nextWeekday(now, SUNDAY);
const DRILLS_DATE = addDays(RALLY_DATE, DRILLS_OFFSET_DAYS);
const FUTSAL_DATE = addDays(RALLY_DATE, FUTSAL_OFFSET_DAYS);
const BASKET_DATE = nextWeekday(now, TUESDAY);
const TENNIS_DATE = nextWeekday(now, THURSDAY);

interface SessionSpec {
    key: string;
    slug: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    maxPlayers: number;
    fee: number;
}

const UPCOMING_SPECS: SessionSpec[] = [
    { key: 'rally', slug: 'badminton', title: 'Weekly Rally Night', date: RALLY_DATE, startTime: '19:00', endTime: '21:00', location: 'GOR Cempaka Court 3', maxPlayers: 24, fee: 25_000 },
    { key: 'drills', slug: 'badminton', title: 'Morning Drills', date: DRILLS_DATE, startTime: '07:00', endTime: '09:00', location: 'GOR Cempaka Court 1', maxPlayers: 24, fee: 25_000 },
    { key: 'futsal', slug: 'futsal', title: 'Futsal Friday', date: FUTSAL_DATE, startTime: '20:00', endTime: '22:00', location: 'Champions Arena B', maxPlayers: 12, fee: 15_000 },
    { key: 'basket', slug: 'basket', title: 'Pickup Game', date: BASKET_DATE, startTime: '19:30', endTime: '21:30', location: 'GBK Basketball Hall', maxPlayers: 10, fee: 20_000 },
    { key: 'tennis', slug: 'tennis', title: 'Singles Ladder', date: TENNIS_DATE, startTime: '17:00', endTime: '19:00', location: 'Senayan Tennis Court 2', maxPlayers: 8, fee: 20_000 },
];

// Past attendance — Adi PRESENT in PAST_PRESENT of PAST_TOTAL → ~92% tile.
const PAST_TOTAL = 13;
const PAST_PRESENT = 12;
const PAST_SLUGS = ['badminton', 'futsal', 'basket', 'tennis'];
const PAST_TITLES = ['Practice', 'Scrimmage', 'Friendly Match', 'Drills', 'Open Court'];
const PAST_OTHERS = 2; // other roster members marked present per past session

interface Attendee {
    email: string;
    status: AttendanceStatus;
}

/** Deterministic, increasing createdAt so player-list order is stable. */
const ORDER_BASE = new Date('2020-01-01T00:00:00Z').getTime();
let attendanceSeq = 0;
function nextCreatedAt(): Date {
    return new Date(ORDER_BASE + attendanceSeq++ * 1000);
}

function configBySlug(slug: string) {
    const cfg = ACTIVITY_CONFIGS.find((c) => c.slug === slug);
    if (!cfg) throw new Error(`Unknown activity ${slug}`);
    return cfg;
}

/** Monthly periods a member's dues must cover for an activity. */
function activityPeriods(slug: string): Period[] {
    const dates = UPCOMING_SPECS.filter((s) => s.slug === slug).map((s) => s.date);
    return uniquePeriods([now, ...dates]);
}

async function seedSettings() {
    for (const [key, value] of Object.entries(SETTINGS)) {
        await prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    console.log(`[ok] Settings: ${SETTINGS.communityName}`);
}

async function seedActivities(): Promise<Map<string, string>> {
    const idBySlug = new Map<string, string>();
    for (const e of ACTIVITY_CONFIGS) {
        const { slug, ...data } = e;
        const activity = await prisma.activity.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        idBySlug.set(slug, activity.id);
        console.log(`[ok] Activity: ${activity.name}`);
    }
    return idBySlug;
}

/** Upsert the three staff accounts; returns the owner id (payment confirmer). */
async function seedStaff(): Promise<string> {
    const staff = [
        {
            email: process.env.SEED_OWNER_EMAIL?.trim() || 'owner@xclub.local',
            name: 'Owner',
            role: Role.OWNER,
            phone: '6281200000000',
        },
        {
            email: process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@xclub.local',
            name: 'Admin Satu',
            role: Role.ADMIN,
            phone: '6281200000001',
        },
        {
            email: 'admin2@xclub.local',
            name: 'Admin Dua',
            role: Role.ADMIN,
            phone: '6281200000002',
        },
    ];
    let ownerId = '';
    for (const u of staff) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role, phone: u.phone, isActive: true, isProfileComplete: true },
            create: { ...u, isActive: true, isProfileComplete: true },
        });
        if (u.role === Role.OWNER) ownerId = user.id;
        console.log(`[ok] ${u.role}: ${u.email}`);
    }
    return ownerId;
}

async function upsertMember(
    email: string,
    name: string,
    phone: string,
): Promise<string> {
    const user = await prisma.user.upsert({
        where: { email },
        update: { name, isActive: true, isProfileComplete: true },
        create: {
            email,
            name,
            role: Role.MEMBER,
            phone,
            isActive: true,
            isProfileComplete: true,
        },
    });
    return user.id;
}

/** Upsert Adi + every named member; returns an email → userId map. */
async function seedMembers(): Promise<Map<string, string>> {
    const idByEmail = new Map<string, string>();
    idByEmail.set(LOGIN_EMAIL, await upsertMember(LOGIN_EMAIL, 'Adi Pratama', '6281200000010'));
    let phoneSeq = 20;
    for (const name of MEMBER_NAMES) {
        const email = slugEmail(name);
        const phone = `628120000${String(phoneSeq++).padStart(4, '0')}`;
        idByEmail.set(email, await upsertMember(email, name, phone));
    }
    console.log(`[ok] Members: ${idByEmail.size} (incl. Adi Pratama)`);
    return idByEmail;
}

async function upsertMembership(userId: string, activityId: string) {
    await prisma.membership.upsert({
        where: { userId_activityId: { userId, activityId } },
        update: {
            isActive: true,
            paymentMode: PaymentMode.MONTHLY,
            effectiveFrom: CURRENT_KEY,
            pendingMode: null,
            pendingEffectiveFrom: null,
        },
        create: {
            userId,
            activityId,
            isActive: true,
            paymentMode: PaymentMode.MONTHLY,
            effectiveFrom: CURRENT_KEY,
        },
    });
}

async function createMonthlyPayment(
    userId: string,
    activityId: string,
    amount: number,
    period: Period,
    ownerId: string,
) {
    await prisma.payment.create({
        data: {
            userId,
            activityId,
            type: 'MONTHLY',
            amount,
            month: period.month,
            year: period.year,
            status: 'CONFIRMED',
            notes: 'Seeded payment',
            confirmedBy: ownerId || null,
            confirmedAt: now,
        },
    });
}

/**
 * Join every email to the activity as a MONTHLY member and confirm dues for each
 * given period — except `unpaidEmail`, whose membership is created but left
 * unpaid (this is how Adi's Badminton renders the dashboard "Pay now" banner).
 */
async function joinActivity(
    idByEmail: Map<string, string>,
    emails: string[],
    activityId: string,
    monthlyFee: number,
    periods: Period[],
    ownerId: string,
    unpaidEmail: string | null,
) {
    for (const email of emails) {
        const userId = idByEmail.get(email);
        if (!userId) throw new Error(`Missing seeded user for ${email}`);
        await upsertMembership(userId, activityId);
        if (email === unpaidEmail) continue;
        for (const period of periods) {
            await createMonthlyPayment(userId, activityId, monthlyFee, period, ownerId);
        }
    }
}

/** First-day-ish instant in the month `back` months before `now`. */
function monthsAgo(back: number, day: number): Date {
    return new Date(now.getFullYear(), now.getMonth() - back, day, 9, 0, 0);
}

/**
 * Extra history rows for Adi so the payments History list shows more than
 * "Approved": one PENDING (In review) and one REJECTED submission in the
 * previous month, where no monthly dues exist yet (keeps the monthly-unique
 * constraint happy).
 */
async function seedHistoryExtras(
    idByEmail: Map<string, string>,
    idBySlug: Map<string, string>,
) {
    const adiId = idByEmail.get(LOGIN_EMAIL);
    if (!adiId) throw new Error('Missing seeded Adi');
    const proofUrl = 'https://placehold.co/600x800/png?text=Transfer+Receipt';
    const prev = periodOf(monthsAgo(1, 2));

    const rows = [
        { slug: 'tennis', fee: TENNIS.monthlyFee, status: 'PENDING' as const, notes: null, createdAt: monthsAgo(1, 2) },
        { slug: 'futsal', fee: FUTSAL.monthlyFee, status: 'REJECTED' as const, notes: 'wrong amount', createdAt: monthsAgo(1, 1) },
    ];
    for (const r of rows) {
        const activityId = idBySlug.get(r.slug);
        if (!activityId) throw new Error(`Missing activity ${r.slug}`);
        await prisma.payment.create({
            data: {
                userId: adiId,
                activityId,
                type: 'MONTHLY',
                amount: r.fee,
                month: prev.month,
                year: prev.year,
                status: r.status,
                proofUrl,
                notes: r.notes,
                createdAt: r.createdAt,
            },
        });
    }
    console.log('[ok] History extras: 1 PENDING (Tennis) + 1 REJECTED (Futsal)');
}

async function seedMemberships(
    idByEmail: Map<string, string>,
    idBySlug: Map<string, string>,
    ownerId: string,
) {
    for (const cfg of ACTIVITY_CONFIGS) {
        const activityId = idBySlug.get(cfg.slug);
        if (!activityId) throw new Error(`Missing activity ${cfg.slug}`);
        const emails = [LOGIN_EMAIL, ...ROSTERS[cfg.slug].map(slugEmail)];
        // Adi's Badminton dues stay unpaid; every other seat is paid.
        const unpaid = cfg.slug === 'badminton' ? LOGIN_EMAIL : null;
        await joinActivity(
            idByEmail, emails, activityId,
            cfg.monthlyFee, activityPeriods(cfg.slug), ownerId, unpaid,
        );
    }
    console.log('[ok] Memberships + dues (Adi: Badminton UNPAID, rest PAID)');
}

function going(email: string): Attendee {
    return { email, status: AttendanceStatus.REGISTERED };
}

/** Ordered attendee rosters per upcoming-session key. */
function buildRosters(): Map<string, Attendee[]> {
    const [sari, bima, ...rest] = GOING_NAMES;
    const rally: Attendee[] = [
        going(LOGIN_EMAIL),
        going(slugEmail(sari)),
        going(slugEmail(bima)),
        { email: slugEmail(MAYBE_NAME), status: AttendanceStatus.MAYBE },
        ...rest.map((n) => going(slugEmail(n))),
    ];
    const withAdi = (names: string[]) => [
        going(LOGIN_EMAIL),
        ...names.map((n) => going(slugEmail(n))),
    ];
    return new Map([
        ['rally', rally],
        ['drills', DRILLS_NAMES.map((n) => going(slugEmail(n)))],
        ['futsal', withAdi(ROSTERS.futsal)],
        ['basket', withAdi(ROSTERS.basket)],
        ['tennis', withAdi(ROSTERS.tennis)],
    ]);
}

async function seedAttendances(
    sessionId: string,
    attendees: Attendee[],
    idByEmail: Map<string, string>,
) {
    for (const a of attendees) {
        const userId = idByEmail.get(a.email);
        if (!userId) throw new Error(`Missing seeded user for ${a.email}`);
        await prisma.attendance.create({
            data: {
                userId,
                sessionId,
                status: a.status,
                createdAt: nextCreatedAt(),
            },
        });
    }
}

async function seedUpcomingSessions(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const rosters = buildRosters();
    for (const spec of UPCOMING_SPECS) {
        const activityId = idBySlug.get(spec.slug);
        if (!activityId) throw new Error(`Missing activity ${spec.slug}`);
        const session = await prisma.activitySession.create({
            data: {
                title: spec.title,
                date: spec.date,
                startTime: spec.startTime,
                endTime: spec.endTime,
                location: spec.location,
                maxPlayers: spec.maxPlayers,
                fee: spec.fee,
                status: 'SCHEDULED',
                activityId,
            },
        });
        const attendees = rosters.get(spec.key) ?? [];
        await seedAttendances(session.id, attendees, idByEmail);
        const seats = attendees.filter(
            (a) => a.status === AttendanceStatus.REGISTERED,
        ).length;
        console.log(
            `[ok] Session "${spec.title}" ${spec.date.toDateString()} ` +
                `— ${seats}/${spec.maxPlayers} going (/sessions/${session.id})`,
        );
    }
}

/** Evenly spaced instants within [monthStart, now) — all already elapsed. */
function pastSessionDates(count: number): Date[] {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const span = now.getTime() - monthStart.getTime();
    const dates: Date[] = [];
    for (let i = 1; i <= count; i++) {
        dates.push(new Date(monthStart.getTime() + Math.floor((span * i) / (count + 1))));
    }
    return dates;
}

/**
 * Seed COMPLETED sessions in the current month with Adi PRESENT in PAST_PRESENT
 * of PAST_TOTAL, so the dashboard's Attendance tile computes ~92%.
 */
async function seedPastSessions(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const dates = pastSessionDates(PAST_TOTAL);
    for (let i = 0; i < PAST_TOTAL; i++) {
        const cfg = configBySlug(PAST_SLUGS[i % PAST_SLUGS.length]);
        const activityId = idBySlug.get(cfg.slug);
        if (!activityId) throw new Error(`Missing activity ${cfg.slug}`);
        const session = await prisma.activitySession.create({
            data: {
                title: PAST_TITLES[i % PAST_TITLES.length],
                date: dates[i],
                startTime: cfg.recurringStartTime,
                endTime: cfg.recurringEndTime,
                location: cfg.defaultLocation,
                maxPlayers: cfg.maxPlayers,
                fee: cfg.sessionFee,
                status: 'COMPLETED',
                activityId,
            },
        });
        const present = (email: string): Attendee => ({
            email,
            status: AttendanceStatus.PRESENT,
        });
        const attendees: Attendee[] = ROSTERS[cfg.slug]
            .slice(0, PAST_OTHERS)
            .map((n) => present(slugEmail(n)));
        if (i < PAST_PRESENT) attendees.unshift(present(LOGIN_EMAIL));
        await seedAttendances(session.id, attendees, idByEmail);
    }
    console.log(
        `[ok] Past sessions: ${PAST_TOTAL} this month ` +
            `(Adi PRESENT in ${PAST_PRESENT} → ~${Math.round((PAST_PRESENT / PAST_TOTAL) * 100)}%)`,
    );
}

async function main() {
    await seedSettings();
    const idBySlug = await seedActivities();
    const ownerId = await seedStaff();

    const idByEmail = await seedMembers();
    await seedMemberships(idByEmail, idBySlug, ownerId);
    await seedHistoryExtras(idByEmail, idBySlug);
    await seedUpcomingSessions(idBySlug, idByEmail);
    await seedPastSessions(idBySlug, idByEmail);

    console.log('Done. Seed complete.');
    console.log(`Log in as ${LOGIN_EMAIL} — you appear as "Adi Pratama (you)".`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

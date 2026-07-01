/**
 * Local development seed.
 *
 * Populates a *local* database (`.env.local` → Docker Postgres) with the minimum
 * data the app needs to be usable right after `npm run db:migrate`: the default
 * Badminton ekskul, the community Settings rows, and a couple of sample sessions
 * so the dashboard isn't empty.
 *
 * Idempotent — re-running only fills in what's missing.
 *
 * It also seeds one user per Role (MEMBER, ADMIN, OWNER), each with a default
 * placeholder email so you always have one of every role to test with. Override
 * any email via SEED_MEMBER_EMAIL / SEED_ADMIN_EMAIL / SEED_OWNER_EMAIL — set one
 * to your real Google address and you can log in straight as that role. Logging
 * in via Google links to the pre-seeded user because
 * `allowDangerousEmailAccountLinking` is enabled in dev only (see src/lib/auth.ts)
 * — without it, a pre-seeded email triggers `OAuthAccountNotLinked`. In production
 * that linking is off; use `npm run db:promote -- <email>` to promote a user.
 *
 *   SEED_OWNER_EMAIL=you@gmail.com npm run db:seed
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULTS = {
    communityName: 'Xclub Badminton',
    defaultMonthlyFee: 50000,
    defaultLocation: 'GOR Net-C',
    adminWhatsapp: '',
    maxPlayers: 20,
    logoUrl: '',
};

const SAMPLE_SESSION_FEE = 25000;
const DAYS_PER_WEEK = 7;
const SESSION_START = '08:00';
const SESSION_END = '10:00';

// One user per Role. Default emails are placeholders; override any of them via
// the matching env var to use a real (e.g. Google) address for that role.
const SEED_USERS = [
    { role: 'MEMBER', name: 'Member', defaultEmail: 'member@netc.local', envKey: 'SEED_MEMBER_EMAIL' },
    { role: 'ADMIN', name: 'Admin', defaultEmail: 'admin@netc.local', envKey: 'SEED_ADMIN_EMAIL' },
    { role: 'OWNER', name: 'Owner', defaultEmail: 'owner@netc.local', envKey: 'SEED_OWNER_EMAIL' },
] as const;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(0, 0, 0, 0);
    return date;
}

async function seedEkskul() {
    const ekskul = await prisma.ekskul.upsert({
        where: { slug: 'badminton' },
        update: {},
        create: {
            name: DEFAULTS.communityName,
            slug: 'badminton',
            color: '#16a34a',
            monthlyFee: DEFAULTS.defaultMonthlyFee,
            sessionFee: SAMPLE_SESSION_FEE,
            allowsMonthly: true,
            allowsPerSession: false,
            defaultLocation: DEFAULTS.defaultLocation,
            maxPlayers: DEFAULTS.maxPlayers,
            adminWhatsapp: DEFAULTS.adminWhatsapp,
            logoUrl: DEFAULTS.logoUrl,
            isActive: true,
        },
    });
    console.log(`✔ Ekskul: ${ekskul.name} (${ekskul.slug})`);
    return ekskul;
}

async function seedSettings() {
    const entries: Record<string, string> = {
        communityName: DEFAULTS.communityName,
        defaultLocation: DEFAULTS.defaultLocation,
        adminWhatsapp: DEFAULTS.adminWhatsapp,
        logoUrl: DEFAULTS.logoUrl,
    };
    for (const [key, value] of Object.entries(entries)) {
        await prisma.settings.upsert({
            where: { key },
            update: {},
            create: { key, value },
        });
    }
    console.log(`✔ Settings: ${Object.keys(entries).length} keys`);
}

async function seedSampleSessions(ekskulId: string) {
    const existing = await prisma.activitySession.count({ where: { ekskulId } });
    if (existing > 0) {
        console.log(`• Sessions: ${existing} already present, skipping samples`);
        return;
    }
    const samples = [
        { title: 'Latihan Rutin', date: daysFromNow(2) },
        { title: 'Sparring Gabungan', date: daysFromNow(DAYS_PER_WEEK + 2) },
    ];
    await prisma.activitySession.createMany({
        data: samples.map((s) => ({
            title: s.title,
            date: s.date,
            startTime: SESSION_START,
            endTime: SESSION_END,
            location: DEFAULTS.defaultLocation,
            maxPlayers: DEFAULTS.maxPlayers,
            fee: SAMPLE_SESSION_FEE,
            ekskulId,
        })),
    });
    console.log(`✔ Sessions: ${samples.length} sample sessions created`);
}

async function seedUsers(ekskulId: string) {
    for (const u of SEED_USERS) {
        const email = process.env[u.envKey]?.trim() || u.defaultEmail;
        const user = await prisma.user.upsert({
            where: { email },
            update: { role: u.role, isActive: true, isProfileComplete: true },
            create: {
                email,
                name: u.name,
                role: u.role,
                isActive: true,
                isProfileComplete: true,
            },
        });
        await prisma.membership.upsert({
            where: { userId_ekskulId: { userId: user.id, ekskulId } },
            update: {},
            create: { userId: user.id, ekskulId },
        });
        console.log(`✔ ${u.role}: ${user.email} (active, profile complete)`);
    }
}

async function main() {
    const ekskul = await seedEkskul();
    await seedSettings();
    await seedSampleSessions(ekskul.id);
    await seedUsers(ekskul.id);
    console.log('Done. Seed complete.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

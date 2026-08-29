/**
 * PRODUCTION seed — settings, the two real Activities, and owner promotion.
 *
 * Reads `.env.prod` directly (never `.env.local`); this file is the production
 * counterpart of `prisma/seed.ts`, which stays local/testing-only. No sample
 * users, sessions, or payments are created here.
 *
 *   npm run db:seed:prod
 *
 * Owner note: production disables `allowDangerousEmailAccountLinking`
 * (src/lib/auth.ts), so seeding a User row for a Google email that has never
 * signed in would BREAK that login (OAuthAccountNotLinked). This seeder
 * therefore only PROMOTES the owner if the user already exists — sign in with
 * Google once, then re-run this seeder (or `npm run db:promote:prod`).
 *
 * Idempotent — safe to re-run; it only upserts what is listed below.
 */
import { config } from 'dotenv';
config({ path: '.env.prod' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { BEGINNING_OF_TIME } from '../src/lib/billing-period';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL?.trim() || 'jefrykurniaone@gmail.com';
const ADMIN_WHATSAPP = '6282126229978';

// Names, locations, and fees intentionally mirror the local seeder
// (prisma/seed.ts) so both environments start from the same catalog.
const SETTINGS: Record<string, string> = {
    communityName: 'XClub Community',
    defaultLocation: 'GOR XClub',
    adminWhatsapp: ADMIN_WHATSAPP,
    logoUrl: '',
};

/**
 * Both Activities offer Monthly AND Per-session modes. Recurring times encode
 * the session length (badminton 3h, futsal 2h); `recurringDay` stays null so
 * no sessions auto-generate until an admin picks the weekday in the admin UI.
 */
const ACTIVITIES = [
    {
        slug: 'badminton',
        name: 'Badminton',
        monthlyFee: 50_000,
        sessionFee: 25_000,
        allowsMonthly: true,
        allowsPerSession: true,
        recurringDay: null,
        recurringStartTime: '08:00',
        recurringEndTime: '11:00', // 3-hour session
        defaultLocation: 'GOR XClub',
        maxPlayers: 20,
        adminWhatsapp: ADMIN_WHATSAPP,
    },
    {
        slug: 'futsal',
        name: 'Futsal',
        monthlyFee: 40_000,
        sessionFee: 15_000,
        allowsMonthly: true,
        allowsPerSession: true,
        recurringDay: null,
        recurringStartTime: '19:00',
        recurringEndTime: '21:00', // 2-hour session
        defaultLocation: 'Lapangan Futsal XClub',
        maxPlayers: 12,
        adminWhatsapp: ADMIN_WHATSAPP,
    },
] as const;

async function seedSettings() {
    for (const [key, value] of Object.entries(SETTINGS)) {
        await prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value },
        });
    }
    console.log(`[ok] Settings: ${SETTINGS.communityName} (WA ${ADMIN_WHATSAPP})`);
}

/**
 * Each Activity also gets its beginning-of-time Dues Rate, so a Billing Period
 * resolves to an amount on a database this seeder built as surely as on one the
 * migration seeded. Upserted on `(activityId, effectiveFrom)` to stay
 * re-runnable; `setById` stays null because nobody set this rate — it is the
 * Activity's price from the beginning.
 */
async function seedActivities() {
    for (const e of ACTIVITIES) {
        const { slug, ...data } = e;
        const activity = await prisma.activity.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        await prisma.duesRate.upsert({
            where: {
                activityId_effectiveFrom: {
                    activityId: activity.id,
                    effectiveFrom: BEGINNING_OF_TIME,
                },
            },
            update: { amount: activity.monthlyFee },
            create: {
                activityId: activity.id,
                amount: activity.monthlyFee,
                effectiveFrom: BEGINNING_OF_TIME,
            },
        });
        console.log(
            `[ok] Activity: ${activity.name} (${activity.recurringStartTime}–${activity.recurringEndTime}, monthly + per-session, Dues Rate ${activity.monthlyFee})`,
        );
    }
}

async function promoteOwner() {
    const user = await prisma.user.findUnique({
        where: { email: OWNER_EMAIL },
        select: { id: true },
    });
    if (!user) {
        console.warn(
            `[!!] ${OWNER_EMAIL} has no User row yet — NOT creating one (it would ` +
                'break the Google sign-in, see the header comment). Sign in via ' +
                'Google once, then re-run this seeder.',
        );
        return;
    }
    // `admittedAt` must be set here: joining is approval-gated, and a null
    // `admittedAt` makes even the OWNER an Applicant waiting at /pending — with
    // nobody on the other side of the door to let them in.
    await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'OWNER',
            phone: ADMIN_WHATSAPP,
            isActive: true,
            isProfileComplete: true,
            admittedAt: new Date(),
        },
    });
    console.log(`[ok] OWNER: ${OWNER_EMAIL} (phone ${ADMIN_WHATSAPP}, admitted)`);
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL missing — is .env.prod present?');
    }
    await seedSettings();
    await seedActivities();
    await promoteOwner();
    console.log('Done. Production seed complete.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

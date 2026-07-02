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

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL?.trim() || 'jefrykurniaone@gmail.com';
const ADMIN_WHATSAPP = '6282126229978';

const SETTINGS: Record<string, string> = {
    communityName: 'PB Net-C',
    defaultLocation: '',
    adminWhatsapp: ADMIN_WHATSAPP,
    logoUrl: '',
};

/**
 * Both Activities offer Monthly AND Per-session modes. Recurring times encode
 * the session length (badminton 3h, futsal 2h); `recurringDay` stays null so
 * no sessions auto-generate until an admin picks the weekday in the admin UI.
 */
const EKSKULS = [
    {
        slug: 'badminton',
        name: 'Badminton',
        color: '#0EA5E9',
        allowsMonthly: true,
        allowsPerSession: true,
        recurringDay: null,
        recurringStartTime: '08:00',
        recurringEndTime: '11:00', // 3-hour session
        maxPlayers: 20,
        adminWhatsapp: ADMIN_WHATSAPP,
    },
    {
        slug: 'futsal',
        name: 'Futsal',
        color: '#F97316',
        allowsMonthly: true,
        allowsPerSession: true,
        recurringDay: null,
        recurringStartTime: '19:00',
        recurringEndTime: '21:00', // 2-hour session
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

async function seedEkskuls() {
    for (const e of EKSKULS) {
        const { slug, ...data } = e;
        const ekskul = await prisma.ekskul.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        console.log(
            `[ok] Activity: ${ekskul.name} (${ekskul.recurringStartTime}–${ekskul.recurringEndTime}, monthly + per-session)`,
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
    await prisma.user.update({
        where: { id: user.id },
        data: {
            role: 'OWNER',
            phone: ADMIN_WHATSAPP,
            isActive: true,
            isProfileComplete: true,
        },
    });
    console.log(`[ok] OWNER: ${OWNER_EMAIL} (phone ${ADMIN_WHATSAPP})`);
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL missing — is .env.prod present?');
    }
    await seedSettings();
    await seedEkskuls();
    await promoteOwner();
    console.log('Done. Production seed complete.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

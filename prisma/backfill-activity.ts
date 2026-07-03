/**
 * One-off backfill: migrate all existing data into a default "Badminton" activity.
 *
 * Run BETWEEN the two `prisma db push` steps (while `activityId` is still optional
 * on ActivitySession/Payment):
 *
 *   1. schema: activityId optional  → npx prisma generate && npx prisma db push
 *   2. npx tsx prisma/backfill-activity.ts        ← this script
 *   3. schema: activityId required  → npx prisma generate && npx prisma db push
 *
 * It is idempotent: re-running it only fills in rows that are still missing an
 * activity. The FK updates use raw SQL so the script works whether the generated
 * client currently types `activityId` as nullable or not.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULTS = {
    communityName: 'Xclub Badminton',
    defaultMonthlyFee: 50000,
    defaultLocation: '',
    adminWhatsapp: '',
    maxPlayers: 20,
    logoUrl: '',
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Seed the default Badminton activity from the current global Settings.
    const rows = await prisma.settings.findMany();
    const settings = Object.fromEntries(rows.map((s) => [s.key, s.value]));

    const activity = await prisma.activity.upsert({
        where: { slug: 'badminton' },
        update: {},
        create: {
            name: settings.communityName ?? DEFAULTS.communityName,
            slug: 'badminton',
            color: '#16a34a',
            monthlyFee: Number(
                settings.defaultMonthlyFee ?? DEFAULTS.defaultMonthlyFee,
            ),
            defaultLocation:
                settings.defaultLocation ?? DEFAULTS.defaultLocation,
            maxPlayers: Number(settings.maxPlayers ?? DEFAULTS.maxPlayers),
            adminWhatsapp: settings.adminWhatsapp ?? DEFAULTS.adminWhatsapp,
            logoUrl: settings.logoUrl ?? DEFAULTS.logoUrl,
            isActive: true,
        },
    });
    console.log(`✔ Badminton activity: ${activity.id} (${activity.name})`);

    // 2. Point every existing session/payment without an activity at Badminton.
    // Raw SQL targets the physical column name, which is still "ekskulId"
    // (the Prisma field `activityId` is @map-ped onto it).
    const sessionsUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "ActivitySession" SET "ekskulId" = $1 WHERE "ekskulId" IS NULL`,
        activity.id,
    );
    const paymentsUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "Payment" SET "ekskulId" = $1 WHERE "ekskulId" IS NULL`,
        activity.id,
    );
    console.log(`✔ Sessions backfilled: ${sessionsUpdated}`);
    console.log(`✔ Payments backfilled: ${paymentsUpdated}`);

    // 3. Give every existing user a Badminton membership.
    const users = await prisma.user.findMany({ select: { id: true } });
    const membershipResult = await prisma.membership.createMany({
        data: users.map((u) => ({ userId: u.id, activityId: activity.id })),
        skipDuplicates: true,
    });
    console.log(
        `✔ Memberships created: ${membershipResult.count} (of ${users.length} users)`,
    );

    // 4. Verify no session/payment is left without an activity.
    const [{ count: nullSessions }] = await prisma.$queryRawUnsafe<
        { count: bigint }[]
    >(`SELECT COUNT(*)::bigint AS count FROM "ActivitySession" WHERE "ekskulId" IS NULL`);
    const [{ count: nullPayments }] = await prisma.$queryRawUnsafe<
        { count: bigint }[]
    >(`SELECT COUNT(*)::bigint AS count FROM "Payment" WHERE "ekskulId" IS NULL`);

    if (Number(nullSessions) > 0 || Number(nullPayments) > 0) {
        throw new Error(
            `Backfill incomplete: ${nullSessions} sessions, ${nullPayments} payments still have no activity. Do NOT make activityId required yet.`,
        );
    }

    console.log('✔ Verified: all sessions and payments have an activity.');
    console.log('Done. You can now make activityId required and db push again.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

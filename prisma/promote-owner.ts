/**
 * Promote a user to OWNER.
 *
 * Run once after your first Google login — logging in creates your User row;
 * this flips it to an active, profile-complete OWNER so you can reach `/admin`
 * without going through onboarding.
 *
 *   npm run db:promote -- your-email@gmail.com        (local DB)
 *   npm run db:promote:prod -- your-email@gmail.com   (production DB)
 */
import { config } from 'dotenv';
// Same target selection as prisma.config.ts: prod is an explicit opt-in.
const envFile = process.env.DATABASE_TARGET === 'prod' ? '.env.prod' : '.env.local';
config({ path: envFile });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const RECORD_NOT_FOUND = 'P2025';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = process.argv[2];
    if (!email) {
        throw new Error('Usage: npm run db:promote -- <email>');
    }

    // `admittedAt` is not optional here. Joining is approval-gated, and an
    // OWNER with a null `admittedAt` is an Applicant: they would be redirected
    // to /pending and could not reach the queue to admit themselves.
    const user = await prisma.user.update({
        where: { email },
        data: {
            role: 'OWNER',
            isActive: true,
            isProfileComplete: true,
            admittedAt: new Date(),
        },
    });
    console.log(`✔ ${user.email} is now OWNER (active, admitted, profile complete).`);
}

main()
    .catch((err) => {
        if (err?.code === RECORD_NOT_FOUND) {
            console.error(
                'No user with that email. Log in via Google first, then re-run.',
            );
        } else {
            console.error(err);
        }
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

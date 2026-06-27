/**
 * Promote a user to OWNER on the *local* database.
 *
 * Run once after your first Google login locally — logging in creates your User
 * row; this flips it to an active, profile-complete OWNER so you can reach
 * `/admin` without going through onboarding.
 *
 *   npm run db:promote -- your-email@gmail.com
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

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

    const user = await prisma.user.update({
        where: { email },
        data: { role: 'OWNER', isActive: true, isProfileComplete: true },
    });
    console.log(`✔ ${user.email} is now OWNER (active, profile complete).`);
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

/**
 * Dev helper: create ONE PENDING monthly payment so the admin Payments nav badge
 * (and pending-review flows) have data to render. Idempotent — re-running reuses
 * the existing pending row. Uses a future month to avoid colliding with the
 * current-month CONFIRMED payments from seed.ts. Run: npx tsx prisma/seed-pending-payment.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Next month, so it never clashes with seeded current-month CONFIRMED rows.
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month = next.getMonth() + 1;
    const year = next.getFullYear();

    const membership = await prisma.membership.findFirst({
        where: { isActive: true, user: { role: 'MEMBER' } },
        include: {
            user: { select: { id: true, name: true } },
            activity: { select: { id: true, name: true, monthlyFee: true } },
        },
    });
    if (!membership) throw new Error('No active member membership found — run db:seed first.');

    const { user, activity } = membership;

    const existing = await prisma.payment.findFirst({
        where: { userId: user.id, activityId: activity.id, month, year, type: 'MONTHLY' },
        select: { id: true, status: true },
    });

    if (existing) {
        const updated = await prisma.payment.update({
            where: { id: existing.id },
            data: { status: 'PENDING', confirmedBy: null, confirmedAt: null },
        });
        console.log(`[ok] Reused payment ${updated.id} → PENDING (${user.name} · ${activity.name} · ${month}/${year})`);
        return;
    }

    const created = await prisma.payment.create({
        data: {
            userId: user.id,
            activityId: activity.id,
            type: 'MONTHLY',
            amount: activity.monthlyFee,
            month,
            year,
            status: 'PENDING',
            notes: 'Seeded pending payment (dev)',
        },
    });
    console.log(`[ok] Created PENDING payment ${created.id} (${user.name} · ${activity.name} · ${month}/${year})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

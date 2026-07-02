/**
 * Local development seed for the cost-sharing / join-at-session schema.
 *
 * Seeds the "XClub Community" with:
 *   - Settings (community name, default location, admin WhatsApp)
 *   - 2 Activities: Badminton (min 5 members, weekly Saturday) and
 *     Futsal (min 4 members, weekly Wednesday) - both offer Monthly AND
 *     Per-session modes, so every join-flow branch is testable.
 *   - 1 OWNER, 2 ADMINs (both with phone numbers, so PhonePicker has data)
 *   - Members sized around the quotas:
 *       Badminton quota MET   (5/5): Admin Satu + member2..5, all Monthly
 *       Futsal    quota UNMET (2/4): Admin Dua + member6, both Monthly
 *       member@xclub.local has NO membership - use it to test the
 *       join-at-session dialog (register free = Monthly, pay = Per-session).
 *
 * No sessions are seeded: the app auto-generates this month's weekly sessions
 * on first load of a sessions page (ensureRecurringSessions), which is itself
 * part of what you want to test.
 *
 * Idempotent - re-running only fills in what's missing. Override the main
 * role emails via SEED_MEMBER_EMAIL / SEED_ADMIN_EMAIL / SEED_OWNER_EMAIL.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, PaymentMode, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SETTINGS: Record<string, string> = {
    communityName: 'XClub Community',
    defaultLocation: 'GOR XClub',
    adminWhatsapp: '6281200000001',
    logoUrl: '',
};

/** Billing-period key (YYYYMM) the monthly memberships are effective from. */
const now = new Date();
const CURRENT_PERIOD = now.getFullYear() * 100 + (now.getMonth() + 1);

const SATURDAY = 6;
const WEDNESDAY = 3;

const EKSKULS = [
    {
        slug: 'badminton',
        name: 'Badminton',
        color: '#0EA5E9',
        monthlyFee: 50_000,
        sessionFee: 25_000,
        allowsMonthly: true,
        allowsPerSession: true,
        minMembers: 5,
        recurringDay: SATURDAY,
        // One badminton session runs 3 hours.
        recurringStartTime: '08:00',
        recurringEndTime: '11:00',
        defaultLocation: 'GOR XClub',
        maxPlayers: 20,
        adminWhatsapp: '6281200000001',
    },
    {
        slug: 'futsal',
        name: 'Futsal',
        color: '#F97316',
        monthlyFee: 40_000,
        sessionFee: 15_000,
        allowsMonthly: true,
        allowsPerSession: true,
        minMembers: 4,
        recurringDay: WEDNESDAY,
        // One futsal session runs 2 hours.
        recurringStartTime: '19:00',
        recurringEndTime: '21:00',
        defaultLocation: 'Lapangan Futsal XClub',
        maxPlayers: 12,
        adminWhatsapp: '6281200000002',
    },
] as const;

interface SeedMembership {
    slug: string;
    mode: PaymentMode | null;
}

interface SeedUser {
    email: string;
    name: string;
    role: Role;
    phone: string;
    memberships: SeedMembership[];
}

function envOr(envKey: string, fallback: string): string {
    return process.env[envKey]?.trim() || fallback;
}

const USERS: SeedUser[] = [
    {
        email: envOr('SEED_OWNER_EMAIL', 'owner@xclub.local'),
        name: 'Owner',
        role: Role.OWNER,
        phone: '6281200000000',
        memberships: [],
    },
    {
        email: envOr('SEED_ADMIN_EMAIL', 'admin@xclub.local'),
        name: 'Admin Satu',
        role: Role.ADMIN,
        phone: '6281200000001',
        memberships: [{ slug: 'badminton', mode: PaymentMode.MONTHLY }],
    },
    {
        email: 'admin2@xclub.local',
        name: 'Admin Dua',
        role: Role.ADMIN,
        phone: '6281200000002',
        memberships: [{ slug: 'futsal', mode: PaymentMode.MONTHLY }],
    },
    // Free agent: no membership - tests the join-at-session mode dialog.
    {
        email: envOr('SEED_MEMBER_EMAIL', 'member@xclub.local'),
        name: 'Member Baru',
        role: Role.MEMBER,
        phone: '6281200000010',
        memberships: [],
    },
    // Badminton monthly regulars (with Admin Satu: 5/5, quota MET).
    ...[2, 3, 4, 5].map((n) => ({
        email: `member${n}@xclub.local`,
        name: `Member ${n}`,
        role: Role.MEMBER,
        phone: `62812000000${10 + n}`,
        memberships: [{ slug: 'badminton', mode: PaymentMode.MONTHLY }],
    })),
    // Futsal monthly member (with Admin Dua: 2/4, quota UNMET).
    {
        email: 'member6@xclub.local',
        name: 'Member 6',
        role: Role.MEMBER,
        phone: '6281200000016',
        memberships: [{ slug: 'futsal', mode: PaymentMode.MONTHLY }],
    },
];

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

async function seedEkskuls(): Promise<Map<string, string>> {
    const idBySlug = new Map<string, string>();
    for (const e of EKSKULS) {
        const { slug, ...data } = e;
        const ekskul = await prisma.ekskul.upsert({
            where: { slug },
            update: data,
            create: { slug, ...data },
        });
        idBySlug.set(slug, ekskul.id);
        console.log(
            `[ok] Activity: ${ekskul.name} (min ${ekskul.minMembers} members, weekly day ${ekskul.recurringDay})`,
        );
    }
    return idBySlug;
}

async function seedUsers(
    ekskulIdBySlug: Map<string, string>,
): Promise<Map<string, string>> {
    const userIdByEmail = new Map<string, string>();
    for (const u of USERS) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role,
                phone: u.phone,
                isActive: true,
                isProfileComplete: true,
            },
            create: {
                email: u.email,
                name: u.name,
                role: u.role,
                phone: u.phone,
                isActive: true,
                isProfileComplete: true,
            },
        });

        for (const m of u.memberships) {
            const ekskulId = ekskulIdBySlug.get(m.slug);
            if (!ekskulId) continue;
            const modeFields = {
                paymentMode: m.mode,
                effectiveFrom: m.mode ? CURRENT_PERIOD : 0,
                pendingMode: null,
                pendingEffectiveFrom: null,
            };
            await prisma.membership.upsert({
                where: { userId_ekskulId: { userId: user.id, ekskulId } },
                update: { isActive: true, ...modeFields },
                create: { userId: user.id, ekskulId, ...modeFields },
            });
        }
        const joined = u.memberships.map((m) => `${m.slug}:${m.mode}`).join(', ');
        console.log(`[ok] ${u.role}: ${user.email}${joined ? ` -> ${joined}` : ''}`);
        userIdByEmail.set(u.email, user.id);
    }
    return userIdByEmail;
}

/**
 * Every seeded MONTHLY member has this month's dues CONFIRMED, so the app's
 * auto-registration (paid month = registered for all of the month's sessions)
 * kicks in the moment the weekly sessions are generated on first page load.
 */
async function seedMonthlyPayments(
    ekskulIdBySlug: Map<string, string>,
    userIdByEmail: Map<string, string>,
) {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const confirmedBy = userIdByEmail.get(USERS[0].email) ?? null; // Owner

    let count = 0;
    for (const u of USERS) {
        for (const m of u.memberships) {
            if (m.mode !== PaymentMode.MONTHLY) continue;
            const ekskulId = ekskulIdBySlug.get(m.slug);
            const userId = userIdByEmail.get(u.email);
            const ekskul = EKSKULS.find((e) => e.slug === m.slug);
            if (!ekskulId || !userId || !ekskul) continue;

            const existing = await prisma.payment.findFirst({
                where: { userId, ekskulId, month, year, type: 'MONTHLY' },
                select: { id: true },
            });
            if (existing) continue;

            await prisma.payment.create({
                data: {
                    userId,
                    ekskulId,
                    type: 'MONTHLY',
                    amount: ekskul.monthlyFee,
                    month,
                    year,
                    status: 'CONFIRMED',
                    notes: 'Seeded payment',
                    confirmedBy,
                    confirmedAt: now,
                },
            });
            count++;
        }
    }
    console.log(`[ok] Monthly payments: ${count} CONFIRMED for ${month}/${year}`);
}

async function main() {
    await seedSettings();
    const ekskulIdBySlug = await seedEkskuls();
    const userIdByEmail = await seedUsers(ekskulIdBySlug);
    await seedMonthlyPayments(ekskulIdBySlug, userIdByEmail);
    console.log('Done. Seed complete.');
    console.log(
        'Sessions + attendances appear on first sessions-page load: paid monthly',
    );
    console.log(
        'members are auto-registered. Quotas: Badminton 5/5 (met), Futsal 2/4.',
    );
    console.log('member@xclub.local has no membership - use it for the join-dialog flow.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

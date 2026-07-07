/**
 * Dev helper: seed a FREE session (fee = 0) with mixed RSVP states so the
 * "Maybe" button scenario is fully testable in the UI.
 *
 * What it creates:
 *   - 1 upcoming free Badminton session titled "Free Play (Maybe Test)"
 *   - Adi Pratama (login member)  → MAYBE
 *   - Sari Rahma                  → REGISTERED (Going)
 *   - Bima Wicaksono              → REGISTERED (Going)
 *   - Dewi Lestari                → MAYBE
 *   - Rizki Hidayat               → no attendance row (NONE state in UI)
 *
 * Idempotent — re-running deletes the old session and recreates it fresh.
 * Run: npx tsx prisma/seed-maybe.ts
 *
 * Prerequisites: npm run db:seed must have been run at least once so that
 * users and the Badminton activity already exist.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const LOGIN_EMAIL = process.env.SEED_MEMBER_EMAIL?.trim() || 'member@xclub.local';
const SESSION_TITLE = 'Free Play (Maybe Test)';
const ACTIVITY_SLUG = 'badminton';

/** Miliseconds offset so attendance list order is deterministic. */
const ORDER_BASE = new Date('2021-06-01T00:00:00Z').getTime();

function slugEmail(name: string): string {
    const slug = name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
    return `${slug}@xclub.local`;
}

/** Next Saturday at least 3 days from now — gives a comfortable RSVP window. */
function nextSaturday(): Date {
    const SATURDAY = 6;
    const MIN_DAYS = 3;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const daysUntilSat = ((SATURDAY - d.getDay() + 7) % 7) || 7;
    const add = daysUntilSat < MIN_DAYS ? daysUntilSat + 7 : daysUntilSat;
    d.setDate(d.getDate() + add);
    return d;
}

interface AttendeeSpec {
    email: string;
    status: AttendanceStatus;
}

const ATTENDEES: AttendeeSpec[] = [
    { email: LOGIN_EMAIL,                    status: AttendanceStatus.MAYBE },
    { email: slugEmail('Sari Rahma'),        status: AttendanceStatus.REGISTERED },
    { email: slugEmail('Bima Wicaksono'),    status: AttendanceStatus.REGISTERED },
    { email: slugEmail('Dewi Lestari'),      status: AttendanceStatus.MAYBE },
    // Rizki Hidayat intentionally has NO attendance row → renders as "None"
];

async function main() {
    const activity = await prisma.activity.findUnique({
        where: { slug: ACTIVITY_SLUG },
        select: { id: true, name: true },
    });
    if (!activity) {
        throw new Error(
            `Activity "${ACTIVITY_SLUG}" not found — run npm run db:seed first.`,
        );
    }

    // Clean up any previous run of this seeder so re-runs are safe.
    const existing = await prisma.activitySession.findFirst({
        where: { activityId: activity.id, title: SESSION_TITLE },
        select: { id: true },
    });
    if (existing) {
        await prisma.attendance.deleteMany({ where: { sessionId: existing.id } });
        await prisma.activitySession.delete({ where: { id: existing.id } });
        console.log(`[ok] Removed previous "${SESSION_TITLE}" session`);
    }

    const sessionDate = nextSaturday();
    const session = await prisma.activitySession.create({
        data: {
            title: SESSION_TITLE,
            date: sessionDate,
            startTime: '10:00',
            endTime: '12:00',
            location: 'GOR Cempaka Court 2',
            maxPlayers: 20,
            fee: 0, // FREE — this is what makes the Maybe button appear
            status: 'SCHEDULED',
            activityId: activity.id,
        },
    });
    console.log(
        `[ok] Session "${session.title}" ${sessionDate.toDateString()} ` +
            `fee=0 → id ${session.id}`,
    );

    let seq = 0;
    for (const a of ATTENDEES) {
        const user = await prisma.user.findUnique({
            where: { email: a.email },
            select: { id: true, name: true },
        });
        if (!user) {
            console.warn(`[skip] User not found: ${a.email} — run db:seed first`);
            continue;
        }
        await prisma.attendance.create({
            data: {
                userId: user.id,
                sessionId: session.id,
                status: a.status,
                createdAt: new Date(ORDER_BASE + seq++ * 1000),
            },
        });
        console.log(`[ok]   ${user.name} → ${a.status}`);
    }

    const rizki = await prisma.user.findUnique({
        where: { email: slugEmail('Rizki Hidayat') },
        select: { name: true },
    });
    if (rizki) {
        console.log(`[ok]   ${rizki.name} → (no row = NONE in UI)`);
    }

    console.log('');
    console.log('Done. Open this session to test the Maybe button:');
    console.log(`  http://localhost:3000/sessions/${session.id}`);
    console.log('');
    console.log('Expected UI states:');
    console.log('  Adi Pratama   → Maybe button active, Going clickable');
    console.log('  Sari Rahma    → Going button active (logged in as that user)');
    console.log('  Dewi Lestari  → Maybe button active');
    console.log('  Rizki Hidayat → No button active (all options available)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

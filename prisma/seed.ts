/**
 * Local development seed — covers EVERY feature/scenario the app supports.
 *
 * Usage (anchor date is optional — defaults to the real today):
 *   npm run db:seed                                          # anchor = today
 *   npm run db:seed -- --date=2026-08-15                     # pretend today is Aug 15
 *   npm run db:seed -- --date=2026-08-15 --from=2026-07-01 --to=2026-08-14
 *
 *   --date  the day treated as "today"; all relative dates shift with it
 *   --from / --to  the range past COMPLETED sessions are spread over
 *                  (defaults: 1st of the anchor month → anchor)
 *   Env fallbacks: SEED_DATE / SEED_FROM / SEED_TO.
 *
 * Re-running is safe: all Attendance, Payment and ActivitySession rows are
 * wiped first (users/activities/memberships/settings are upserted), so you can
 * reseed at a different anchor date without a full `db:reset`.
 *
 * What it seeds (login as member@xclub.local → "Adi Pratama (you)"):
 *   Gate    - applicant@xclub.local waiting in the admission queue and
 *             declined@xclub.local turned away, so /admin/applicants and both
 *             states of /pending have data (dev login lists both).
 *   Base    - 4 activities, owner + 2 admins, 19 members, dashboard sim:
 *             5 upcoming sessions, Adi's Badminton dues UNPAID (banner),
 *             past sessions in the --from/--to range → ~92% attendance tile,
 *             plus one ABSENT roster member per past session.
 *   Modes   - 4 Badminton PER_SESSION members (Yoga, Intan, Reza, Galih),
 *             Citra Dewi MONTHLY with a queued switch to PER_SESSION next month,
 *             Eka Saputri in Futsal with paymentMode = null (mode not chosen).
 *   Payments- MONTHLY CONFIRMED for every funded seat, Adi's prev-month
 *             PENDING (Tennis) + REJECTED (Futsal), SESSION payments
 *             CONFIRMED/PENDING (admin review queue has data).
 *   Holds   - "Hold Lab" session: Reza live hold (expires in 1h, unpaid →
 *             outstanding bill), Galih expired hold (released by next sweep).
 *   Sessions- free session (Maybe button, mixed RSVPs), FULL session (Adi
 *             locked out), under-booked futsal (admin remind), CANCELLED
 *             session, ONGOING session today, and a today session with
 *             dayReminderSentAt = null for the day-reminder cron.
 *
 * Run after a fresh schema:
 *   npm run db:reset   (or: npx prisma migrate dev)
 *   npm run db:seed
 */
import { prisma } from './seed/client';
import { now, PAST_FROM, PAST_TO } from './seed/dates';
import { LOGIN_EMAIL } from './seed/config';
import {
    seedSettings,
    seedActivities,
    seedStaff,
    seedMembers,
    seedApplicants,
} from './seed/core';
import {
    seedMemberships,
    seedUnselectedModeMember,
    seedHistoryExtras,
} from './seed/memberships';
import { seedUpcomingSessions, seedPastSessions } from './seed/sessions';
import {
    seedFreeMaybeSession,
    seedHoldLab,
    seedFullSession,
    seedUnderbookedSession,
    seedCancelledSession,
    seedTodaySessions,
} from './seed/scenarios';

/**
 * Wipe transactional rows so re-runs (or a different anchor date) start clean.
 * Payments must go before sessions (Payment.sessionId is Restrict).
 */
async function cleanTransactionalData() {
    await prisma.attendance.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.activitySession.deleteMany({});
    console.log('[ok] Cleared attendances, payments, sessions');
}

async function main() {
    console.log(`Seeding with anchor "today" = ${now.toString()}`);
    console.log(`Past-session range: ${PAST_FROM.toDateString()} → ${PAST_TO.toDateString()}`);

    await cleanTransactionalData();
    await seedSettings();
    const idBySlug = await seedActivities();
    const ownerId = await seedStaff();
    const idByEmail = await seedMembers();
    // Kept out of `idByEmail` on purpose — nothing downstream may give an
    // Applicant attendance, payments, or a seat.
    await seedApplicants(idBySlug);

    await seedMemberships(idByEmail, idBySlug, ownerId);
    await seedUnselectedModeMember(idByEmail, idBySlug);
    await seedHistoryExtras(idByEmail, idBySlug);

    await seedUpcomingSessions(idBySlug, idByEmail, ownerId);
    await seedPastSessions(idBySlug, idByEmail);

    await seedFreeMaybeSession(idBySlug, idByEmail);
    await seedHoldLab(idBySlug, idByEmail, ownerId);
    await seedFullSession(idBySlug, idByEmail);
    await seedUnderbookedSession(idBySlug, idByEmail);
    await seedCancelledSession(idBySlug, idByEmail);
    await seedTodaySessions(idBySlug, idByEmail);

    console.log('Done. Seed complete.');
    console.log(`Log in as ${LOGIN_EMAIL} — you appear as "Adi Pratama (you)".`);
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

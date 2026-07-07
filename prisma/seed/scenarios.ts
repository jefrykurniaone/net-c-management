/** Feature/edge-case scenario sessions: holds, full, under-booked, today, etc. */
import { AttendanceStatus, PaymentStatus } from '@prisma/client';
import { now, addMinutes } from './dates';
import { LOGIN_EMAIL, ROSTERS, slugEmail } from './config';
import { SCENARIO_SPECS, SessionSpec } from './specs';
import { Attendee, going, seedAttendances } from './attend';
import { createSession } from './sessions';
import { createSessionPayment } from './memberships';

const HOLD_LIVE_MINUTES = 60; // live hold expires 1h from the anchor
const HOLD_EXPIRED_MINUTES = -30; // expired hold lapsed 30min before the anchor

function activityIdFor(spec: SessionSpec, idBySlug: Map<string, string>): string {
    const activityId = idBySlug.get(spec.slug);
    if (!activityId) throw new Error(`Missing activity ${spec.slug}`);
    return activityId;
}

async function seedScenarioSession(
    spec: SessionSpec,
    attendees: Attendee[],
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
    note: string,
): Promise<string> {
    const session = await createSession(spec, activityIdFor(spec, idBySlug));
    await seedAttendances(session.id, attendees, idByEmail);
    console.log(`[ok] ${note} (/sessions/${session.id})`);
    return session.id;
}

/** fee = 0 → Maybe button; Adi MAYBE, 2 GOING, 1 MAYBE, Rizki no row (NONE). */
export async function seedFreeMaybeSession(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const attendees: Attendee[] = [
        { email: LOGIN_EMAIL, status: AttendanceStatus.MAYBE },
        going(slugEmail('Sari Rahma')),
        going(slugEmail('Bima Wicaksono')),
        { email: slugEmail('Dewi Lestari'), status: AttendanceStatus.MAYBE },
    ];
    await seedScenarioSession(
        SCENARIO_SPECS.freeMaybe, attendees, idBySlug, idByEmail,
        'Free session: Adi+Dewi MAYBE, 2 going, Rizki none',
    );
}

/**
 * Reservation-hold lab on one paid Badminton session (all four PER_SESSION):
 *   Yoga  — CONFIRMED session payment, permanent seat
 *   Intan — PENDING session payment (proof uploaded), seat kept, admin queue
 *   Reza  — live hold (expires 1h out), no payment → outstanding bill + deadline
 *   Galih — expired hold → released by the lazy sweep on the next capacity read
 */
export async function seedHoldLab(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
    ownerId: string,
) {
    const spec = SCENARIO_SPECS.holdLab;
    const attendees: Attendee[] = [
        going(slugEmail('Yoga Saputra')),
        going(slugEmail('Intan Permata')),
        { ...going(slugEmail('Reza Fauzi')), holdExpiresAt: addMinutes(now, HOLD_LIVE_MINUTES) },
        { ...going(slugEmail('Galih Ramadhan')), holdExpiresAt: addMinutes(now, HOLD_EXPIRED_MINUTES) },
    ];
    const sessionId = await seedScenarioSession(
        spec, attendees, idBySlug, idByEmail,
        'Hold Lab: confirmed + pending payments, live + expired holds',
    );
    const activityId = activityIdFor(spec, idBySlug);
    const paid = [
        { name: 'Yoga Saputra', status: PaymentStatus.CONFIRMED },
        { name: 'Intan Permata', status: PaymentStatus.PENDING },
    ];
    for (const p of paid) {
        const userId = idByEmail.get(slugEmail(p.name));
        if (!userId) throw new Error(`Missing seeded user for ${p.name}`);
        await createSessionPayment({
            userId, activityId, sessionId,
            sessionDate: spec.date, amount: spec.fee, ownerId, status: p.status,
        });
    }
}

/** Every seat taken by paid monthly members → Adi sees the "Full" state. */
export async function seedFullSession(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const spec = SCENARIO_SPECS.full;
    const names = ['Sari Rahma', 'Bima Wicaksono', 'Rizki Hidayat', 'Putri Anggraini', 'Fajar Nugroho', 'Maya Sari'];
    const attendees = names.slice(0, spec.maxPlayers).map((n) => going(slugEmail(n)));
    await seedScenarioSession(
        spec, attendees, idBySlug, idByEmail,
        `Full session: ${spec.maxPlayers}/${spec.maxPlayers} seats taken, Adi not in`,
    );
}

/** 2 going < Futsal minMembers (4) → admin under-booked remind flow. */
export async function seedUnderbookedSession(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const attendees = [going(slugEmail('Sari Rahma')), going(slugEmail('Bima Wicaksono'))];
    await seedScenarioSession(
        SCENARIO_SPECS.underbooked, attendees, idBySlug, idByEmail,
        'Under-booked futsal: 2 going < minMembers 4 (remind test)',
    );
}

/** CANCELLED session that had attendees → tests cancelled rendering. */
export async function seedCancelledSession(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const attendees = [going(slugEmail('Sari Rahma')), going(slugEmail('Bima Wicaksono'))];
    await seedScenarioSession(
        SCENARIO_SPECS.cancelled, attendees, idBySlug, idByEmail,
        'Cancelled session with 2 registered members',
    );
}

/**
 * Two anchor-day sessions: an ONGOING basket pickup, and a SCHEDULED tennis
 * session with dayReminderSentAt = null — the day-reminder cron's target.
 */
export async function seedTodaySessions(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const withAdi = (names: string[]) => [going(LOGIN_EMAIL), ...names.map((n) => going(slugEmail(n)))];
    await seedScenarioSession(
        SCENARIO_SPECS.ongoing, withAdi(ROSTERS.basket), idBySlug, idByEmail,
        'ONGOING basket session today',
    );
    await seedScenarioSession(
        SCENARIO_SPECS.todayReminder, withAdi(ROSTERS.tennis), idBySlug, idByEmail,
        'Today tennis session (day-reminder cron target)',
    );
}

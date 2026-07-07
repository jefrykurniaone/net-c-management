/** Upcoming (dashboard) sessions + past COMPLETED sessions with attendance. */
import { AttendanceStatus, PaymentStatus, SessionStatus } from '@prisma/client';
import { prisma } from './client';
import { pastSessionDates } from './dates';
import {
    LOGIN_EMAIL,
    GOING_NAMES,
    MAYBE_NAME,
    DRILLS_NAMES,
    ROSTERS,
    PER_SESSION_EMAILS,
    PAST_TOTAL,
    PAST_PRESENT,
    PAST_SLUGS,
    PAST_TITLES,
    PAST_PRESENT_OTHERS,
    PAST_ABSENT_INDEX,
    configBySlug,
    slugEmail,
} from './config';
import { UPCOMING_SPECS, SessionSpec } from './specs';
import { Attendee, going, seedAttendances } from './attend';
import { createSessionPayment } from './memberships';

/** Ordered attendee rosters per upcoming-session key. */
function buildRosters(): Map<string, Attendee[]> {
    const [sari, bima, ...rest] = GOING_NAMES;
    const rally: Attendee[] = [
        going(LOGIN_EMAIL),
        going(slugEmail(sari)),
        going(slugEmail(bima)),
        { email: slugEmail(MAYBE_NAME), status: AttendanceStatus.MAYBE },
        ...rest.map((n) => going(slugEmail(n))),
    ];
    const withAdi = (names: string[]) => [
        going(LOGIN_EMAIL),
        ...names.map((n) => going(slugEmail(n))),
    ];
    return new Map([
        ['rally', rally],
        ['drills', DRILLS_NAMES.map((n) => going(slugEmail(n)))],
        ['futsal', withAdi(ROSTERS.futsal)],
        ['basket', withAdi(ROSTERS.basket)],
        ['tennis', withAdi(ROSTERS.tennis)],
    ]);
}

export async function createSession(spec: SessionSpec, activityId: string) {
    return prisma.activitySession.create({
        data: {
            title: spec.title,
            date: spec.date,
            startTime: spec.startTime,
            endTime: spec.endTime,
            location: spec.location,
            maxPlayers: spec.maxPlayers,
            fee: spec.fee,
            status: spec.status ?? SessionStatus.SCHEDULED,
            activityId,
        },
    });
}

/**
 * PER_SESSION Badminton members hold seats via SESSION payments, never dues —
 * give every per-session REGISTERED attendee a CONFIRMED session payment so
 * the seat-lock-follows-money rule stays intact on the dashboard sessions.
 */
async function fundPerSessionSeats(
    spec: SessionSpec,
    sessionId: string,
    activityId: string,
    attendees: Attendee[],
    idByEmail: Map<string, string>,
    ownerId: string,
) {
    if (spec.slug !== 'badminton' || spec.fee === 0) return;
    for (const a of attendees) {
        if (a.status !== AttendanceStatus.REGISTERED) continue;
        if (!PER_SESSION_EMAILS.has(a.email)) continue;
        const userId = idByEmail.get(a.email);
        if (!userId) throw new Error(`Missing seeded user for ${a.email}`);
        await createSessionPayment({
            userId,
            activityId,
            sessionId,
            sessionDate: spec.date,
            amount: spec.fee,
            ownerId,
            status: PaymentStatus.CONFIRMED,
        });
    }
}

export async function seedUpcomingSessions(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
    ownerId: string,
) {
    const rosters = buildRosters();
    for (const spec of UPCOMING_SPECS) {
        const activityId = idBySlug.get(spec.slug);
        if (!activityId) throw new Error(`Missing activity ${spec.slug}`);
        const session = await createSession(spec, activityId);
        const attendees = rosters.get(spec.key) ?? [];
        await seedAttendances(session.id, attendees, idByEmail);
        await fundPerSessionSeats(spec, session.id, activityId, attendees, idByEmail, ownerId);
        const seats = attendees.filter((a) => a.status === AttendanceStatus.REGISTERED).length;
        console.log(
            `[ok] Session "${spec.title}" ${spec.date.toDateString()} ` +
                `— ${seats}/${spec.maxPlayers} going (/sessions/${session.id})`,
        );
    }
}

/**
 * Seed COMPLETED sessions spread over [PAST_FROM, PAST_TO] with Adi PRESENT in
 * PAST_PRESENT of PAST_TOTAL (~92% tile), two roster members PRESENT and one
 * ABSENT per session so admin attendance views show both outcomes.
 */
export async function seedPastSessions(
    idBySlug: Map<string, string>,
    idByEmail: Map<string, string>,
) {
    const dates = pastSessionDates(PAST_TOTAL);
    for (let i = 0; i < PAST_TOTAL; i++) {
        const cfg = configBySlug(PAST_SLUGS[i % PAST_SLUGS.length]);
        const activityId = idBySlug.get(cfg.slug);
        if (!activityId) throw new Error(`Missing activity ${cfg.slug}`);
        const session = await createSession(
            {
                key: `past-${i}`,
                slug: cfg.slug,
                title: PAST_TITLES[i % PAST_TITLES.length],
                date: dates[i],
                startTime: cfg.recurringStartTime,
                endTime: cfg.recurringEndTime,
                location: cfg.defaultLocation,
                maxPlayers: cfg.maxPlayers,
                fee: cfg.sessionFee,
                status: SessionStatus.COMPLETED,
            },
            activityId,
        );
        const roster = ROSTERS[cfg.slug];
        const attendees: Attendee[] = roster
            .slice(0, PAST_PRESENT_OTHERS)
            .map((n) => ({ email: slugEmail(n), status: AttendanceStatus.PRESENT }));
        const absentee = roster[PAST_ABSENT_INDEX];
        if (absentee) {
            attendees.push({ email: slugEmail(absentee), status: AttendanceStatus.ABSENT });
        }
        if (i < PAST_PRESENT) {
            attendees.unshift({ email: LOGIN_EMAIL, status: AttendanceStatus.PRESENT });
        }
        await seedAttendances(session.id, attendees, idByEmail);
    }
    console.log(
        `[ok] Past sessions: ${PAST_TOTAL} in range ` +
            `(Adi PRESENT in ${PAST_PRESENT} → ~${Math.round((PAST_PRESENT / PAST_TOTAL) * 100)}%, +1 ABSENT each)`,
    );
}

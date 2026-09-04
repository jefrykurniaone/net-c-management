import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { sendSessionReminder } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { NextResponse } from 'next/server';
import {
    shouldStampDayReminder,
    type DayReminderOutcome,
} from '@/lib/day-reminder-stamp';
import type { Locale } from '@/lib/i18n/dictionaries';

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ReminderCandidate {
    user: { name: string | null; email: string | null };
}

interface ReminderSessionInfo {
    id: string;
    title: string;
    date: Date;
    startTime: string;
    location: string;
    registered: number;
    max: number;
}

/** Emails one Session's non-RSVP'd active members, tallying what each recipient did. */
async function sendReminders(
    candidates: ReminderCandidate[],
    sessionInfo: ReminderSessionInfo,
    communityName: string,
    locale: Locale,
): Promise<DayReminderOutcome> {
    let sent = 0;
    let failed = 0;
    let unaddressable = 0;

    for (const { user } of candidates) {
        if (!user.email) {
            unaddressable++;
            continue;
        }
        try {
            await sendSessionReminder({
                to: user.email,
                name: user.name ?? user.email,
                sessionId: sessionInfo.id,
                sessionTitle: sessionInfo.title,
                sessionDate: sessionInfo.date,
                startTime: sessionInfo.startTime,
                location: sessionInfo.location,
                registered: sessionInfo.registered,
                max: sessionInfo.max,
                communityName,
                locale,
            });
            sent++;
        } catch (err) {
            console.error(`[remind] failed to send to ${user.email}:`, err);
            failed++;
        }
    }

    return { sent, failed, unaddressable };
}

// POST /api/sessions/[id]/remind — admin only
// Sends email reminders to active activity members who haven't RSVP'd.
// Enforces a 24-hour cooldown per session to prevent spam.
export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return NextResponse.json(
            {
                error:
                    'Email service is not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).',
            },
            { status: 503 },
        );
    }

    const { id: sessionId } = await params;
    const [locale, settings] = await Promise.all([getLocale(), getSettings()]);

    const activitySession = await prisma.activitySession.findUnique({
        where: { id: sessionId },
        select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            location: true,
            maxPlayers: true,
            activityId: true,
            lastReminderAt: true,
            _count: {
                select: {
                    attendances: {
                        where: { status: { in: ['REGISTERED', 'PRESENT'] } },
                    },
                },
            },
        },
    });

    if (!activitySession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 24-hour cooldown guard
    if (activitySession.lastReminderAt) {
        const elapsed = Date.now() - activitySession.lastReminderAt.getTime();
        if (elapsed < REMINDER_COOLDOWN_MS) {
            const remainingMs = REMINDER_COOLDOWN_MS - elapsed;
            const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
            return NextResponse.json(
                { error: 'cooldown', remainingHours },
                { status: 429 },
            );
        }
    }

    const alreadyRegistered = await prisma.attendance.findMany({
        where: { sessionId },
        select: { userId: true },
    });
    const registeredIds = new Set(alreadyRegistered.map((a) => a.userId));

    const activeMembers = await prisma.membership.findMany({
        where: {
            activityId: activitySession.activityId,
            isActive: true,
            userId: { notIn: [...registeredIds] },
        },
        select: {
            user: {
                select: { id: true, name: true, email: true },
            },
        },
    });

    const outcome = await sendReminders(
        activeMembers,
        {
            id: activitySession.id,
            title: activitySession.title,
            date: new Date(activitySession.date),
            startTime: activitySession.startTime,
            location: activitySession.location,
            registered: activitySession._count.attendances,
            max: activitySession.maxPlayers,
        },
        settings.communityName,
        locale,
    );

    // Reuses the rule #245 settled for the day-reminder cron
    // (`shouldStampDayReminder`, src/lib/day-reminder-stamp.ts): stamp only
    // when at least one send actually succeeded. A batch that reaches nobody
    // — every member unaddressable, or every send throwing — must not arm the
    // cooldown; there was no delivery for it to guard against a repeat of.
    const reachedAnyone = shouldStampDayReminder(outcome);
    if (reachedAnyone) {
        await prisma.activitySession.update({
            where: { id: sessionId },
            data: { lastReminderAt: new Date() },
        });
    }

    return NextResponse.json({
        sent: outcome.sent,
        skipped: outcome.failed + outcome.unaddressable,
        reachedAnyone,
    });
}

import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { sendSessionReminder } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { NextResponse } from 'next/server';

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

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

    let sent = 0;
    let skipped = 0;

    for (const { user } of activeMembers) {
        if (!user.email) {
            skipped++;
            continue;
        }
        try {
            await sendSessionReminder({
                to: user.email,
                name: user.name ?? user.email,
                sessionId: activitySession.id,
                sessionTitle: activitySession.title,
                sessionDate: new Date(activitySession.date),
                startTime: activitySession.startTime,
                location: activitySession.location,
                registered: activitySession._count.attendances,
                max: activitySession.maxPlayers,
                communityName: settings.communityName,
                locale,
            });
            sent++;
        } catch (err) {
            console.error(`[remind] failed to send to ${user.email}:`, err);
            skipped++;
        }
    }

    // Update lastReminderAt after successful send
    await prisma.activitySession.update({
        where: { id: sessionId },
        data: { lastReminderAt: new Date() },
    });

    return NextResponse.json({ sent, skipped });
}


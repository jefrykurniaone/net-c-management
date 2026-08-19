import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { isEmailConfigured, sendDayReminder } from '@/lib/email';
import { DEFAULT_LOCALE } from '@/lib/i18n/dictionaries';
import { AttendanceStatus, SessionStatus } from '@prisma/client';
import { wibDayStart } from '@/lib/wib';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface TodaySession {
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    attendances: { user: { name: string | null; email: string | null } }[];
}

/** Today's SCHEDULED sessions (WIB calendar day) not yet reminded. */
async function findTodaySessions(now: Date): Promise<TodaySession[]> {
    // Session dates are stored as UTC midnight of the calendar day, so "today"
    // is the WIB day — the shared clock the generate-sessions cron and the
    // public landing read both use (`src/lib/wib.ts`).
    const dayStart = wibDayStart(now);
    const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);

    return prisma.activitySession.findMany({
        where: {
            date: { gte: dayStart, lt: dayEnd },
            status: SessionStatus.SCHEDULED,
            dayReminderSentAt: null,
        },
        select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            endTime: true,
            location: true,
            attendances: {
                where: { status: AttendanceStatus.REGISTERED },
                select: { user: { select: { name: true, email: true } } },
            },
        },
    });
}

/**
 * GET /api/cron/day-reminders
 *
 * Called by Vercel Cron every day at 22:00 UTC (05:00 WIB). Emails every
 * REGISTERED member of today's sessions a "see you today" attendance reminder.
 * `dayReminderSentAt` guards against double sends. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isEmailConfigured()) {
        return NextResponse.json(
            { error: 'Email service is not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).' },
            { status: 503 },
        );
    }

    const [sessions, settings] = await Promise.all([
        findTodaySessions(new Date()),
        getSettings(),
    ]);

    let sent = 0;
    let skipped = 0;
    for (const session of sessions) {
        for (const { user } of session.attendances) {
            if (!user.email) {
                skipped++;
                continue;
            }
            try {
                await sendDayReminder({
                    to: user.email,
                    name: user.name ?? user.email,
                    sessionId: session.id,
                    sessionTitle: session.title,
                    sessionDate: new Date(session.date),
                    startTime: session.startTime,
                    endTime: session.endTime,
                    location: session.location,
                    communityName: settings.communityName,
                    // Cron has no request cookie to read a locale from.
                    locale: DEFAULT_LOCALE,
                });
                sent++;
            } catch (err) {
                console.error(`[day-reminders] failed to send to ${user.email}:`, err);
                skipped++;
            }
        }
        await prisma.activitySession.update({
            where: { id: session.id },
            data: { dayReminderSentAt: new Date() },
        });
    }

    return NextResponse.json({ sessions: sessions.length, sent, skipped });
}

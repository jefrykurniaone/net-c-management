import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        activitySession: { findUnique: vi.fn(), update: vi.fn() },
        attendance: { findMany: vi.fn() },
        membership: { findMany: vi.fn() },
    },
}));

vi.mock('@/lib/email', () => ({
    sendSessionReminder: vi.fn(),
}));

vi.mock('@/lib/settings', () => ({
    getSettings: vi.fn().mockResolvedValue({ communityName: 'XClub Community' }),
}));

vi.mock('@/lib/i18n/locale', () => ({
    getLocale: vi.fn().mockResolvedValue('en'),
}));

import { POST } from '../route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSessionReminder } from '@/lib/email';

/**
 * `lastReminderAt` arms the admin-triggered 24-hour cooldown. #294 makes that
 * stamp reuse the rule #245 settled for the day-reminder cron
 * (`shouldStampDayReminder`): stamp only when at least one send succeeded, so
 * a batch that reaches nobody does not block the admin from retrying once the
 * underlying cause — no addresses, or a mail outage — clears.
 */

const ADMIN_SESSION = {
    user: { id: 'admin-1', role: 'ADMIN', isActive: true, isAdmitted: true },
};

const BASE_SESSION_ROW = {
    id: 'session-1',
    title: 'Friday Futsal',
    date: new Date('2026-09-04T00:00:00.000Z'),
    startTime: '19:00',
    location: 'Court A',
    maxPlayers: 20,
    activityId: 'activity-1',
    lastReminderAt: null as Date | null,
    _count: { attendances: 3 },
};

function member(id: string, email: string | null) {
    return { user: { id, name: `Member ${id}`, email } };
}

function mockRequestEnv() {
    process.env.GMAIL_USER = 'bot@example.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
}

function makeRequest(): Request {
    return new Request('http://localhost:3000/api/sessions/session-1/remind', {
        method: 'POST',
    });
}

async function callRoute() {
    return POST(makeRequest(), { params: Promise.resolve({ id: 'session-1' }) });
}

describe('POST /api/sessions/[id]/remind', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
        vi.mocked(prisma.attendance.findMany).mockResolvedValue([]);
        mockRequestEnv();
    });

    afterEach(() => {
        delete process.env.GMAIL_USER;
        delete process.env.GMAIL_APP_PASSWORD;
    });

    it('does not stamp lastReminderAt when there are no recipients to notify', async () => {
        vi.mocked(prisma.activitySession.findUnique).mockResolvedValue(
            BASE_SESSION_ROW as never,
        );
        vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

        const res = await callRoute();
        const body = await res.json();

        expect(body).toEqual({ sent: 0, skipped: 0, reachedAnyone: false });
        expect(prisma.activitySession.update).not.toHaveBeenCalled();
    });

    it('does not stamp lastReminderAt when every send throws', async () => {
        vi.mocked(prisma.activitySession.findUnique).mockResolvedValue(
            BASE_SESSION_ROW as never,
        );
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
            member('u1', 'u1@example.com'),
            member('u2', 'u2@example.com'),
        ] as never);
        vi.mocked(sendSessionReminder).mockRejectedValue(new Error('smtp down'));

        const res = await callRoute();
        const body = await res.json();

        expect(body).toEqual({ sent: 0, skipped: 2, reachedAnyone: false });
        expect(prisma.activitySession.update).not.toHaveBeenCalled();
    });

    it('does not stamp lastReminderAt when every member is unaddressable', async () => {
        vi.mocked(prisma.activitySession.findUnique).mockResolvedValue(
            BASE_SESSION_ROW as never,
        );
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
            member('u1', null),
            member('u2', null),
        ] as never);

        const res = await callRoute();
        const body = await res.json();

        expect(body).toEqual({ sent: 0, skipped: 2, reachedAnyone: false });
        expect(sendSessionReminder).not.toHaveBeenCalled();
        expect(prisma.activitySession.update).not.toHaveBeenCalled();
    });

    it('stamps lastReminderAt when at least one send succeeds', async () => {
        vi.mocked(prisma.activitySession.findUnique).mockResolvedValue(
            BASE_SESSION_ROW as never,
        );
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
            member('u1', 'u1@example.com'),
            member('u2', null),
        ] as never);
        vi.mocked(sendSessionReminder).mockResolvedValue(undefined);

        const res = await callRoute();
        const body = await res.json();

        expect(body).toEqual({ sent: 1, skipped: 1, reachedAnyone: true });
        expect(prisma.activitySession.update).toHaveBeenCalledWith({
            where: { id: 'session-1' },
            data: { lastReminderAt: expect.any(Date) },
        });
    });

    it('stamps a partial failure, because the members who got it must not get it twice', async () => {
        vi.mocked(prisma.activitySession.findUnique).mockResolvedValue(
            BASE_SESSION_ROW as never,
        );
        vi.mocked(prisma.membership.findMany).mockResolvedValue([
            member('u1', 'u1@example.com'),
            member('u2', 'u2@example.com'),
        ] as never);
        vi.mocked(sendSessionReminder)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('smtp down'));

        const res = await callRoute();
        const body = await res.json();

        expect(body).toEqual({ sent: 1, skipped: 1, reachedAnyone: true });
        expect(prisma.activitySession.update).toHaveBeenCalledOnce();
    });
});

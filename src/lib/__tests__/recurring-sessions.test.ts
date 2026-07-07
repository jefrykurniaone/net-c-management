import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureRecurringSessions } from '../recurring-sessions';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activity: { findMany: vi.fn() },
    activitySession: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock('@/lib/payments', () => ({
  syncMonthlyAttendances: vi.fn().mockResolvedValue(undefined),
}));

const MONDAY = 1;

const mockActivity = {
  id: 'act-1',
  name: 'Badminton',
  recurringDay: MONDAY,
  recurringStartTime: '08:00',
  recurringEndTime: '10:00',
  defaultLocation: 'GOR Menteng',
  maxPlayers: 20,
  sessionFee: 50000,
};

type SessionCreateArg = { data: { date: Date; activityId: string }[] };

describe('ensureRecurringSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.activity.findMany).mockResolvedValue(
      [mockActivity] as Awaited<ReturnType<typeof prisma.activity.findMany>>,
    );
    vi.mocked(prisma.activitySession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.activitySession.createMany).mockResolvedValue({ count: 0 });
  });

  it('generates only sessions on the correct recurring weekday', async () => {
    const now = new Date(Date.UTC(2026, 7, 1)); // 2026-08-01 (August)
    await ensureRecurringSessions(now);

    expect(prisma.activitySession.createMany).toHaveBeenCalledOnce();
    const { data } = vi.mocked(prisma.activitySession.createMany).mock
      .calls[0][0] as SessionCreateArg;
    expect(data.length).toBeGreaterThan(0);
    for (const session of data) {
      expect(session.date.getUTCDay()).toBe(MONDAY);
      expect(session.date.getUTCMonth()).toBe(7); // August
    }
  });

  it('generates August sessions when called with WIB-adjusted last-day-of-July time', async () => {
    // July 31 at 17:00 UTC + 7h offset = Aug 1 00:00 UTC (WIB midnight on Aug 1)
    const julLastDayUtc = new Date(Date.UTC(2026, 6, 31, 17, 0, 0));
    const wibNow = new Date(julLastDayUtc.getTime() + 7 * 3600_000);

    expect(wibNow.getUTCMonth()).toBe(7); // confirms offset lands in August
    await ensureRecurringSessions(wibNow);

    const { data } = vi.mocked(prisma.activitySession.createMany).mock
      .calls[0][0] as SessionCreateArg;
    for (const session of data) {
      expect(session.date.getUTCMonth()).toBe(7); // August, not July
    }
  });

  it('is idempotent — skips sessions that already exist', async () => {
    const now = new Date(Date.UTC(2026, 7, 1)); // Aug 1
    // Simulate all August Mondays already in the database
    const existingSessions = [3, 10, 17, 24, 31].map((d) => ({
      activityId: 'act-1',
      date: new Date(Date.UTC(2026, 7, d)),
    }));
    vi.mocked(prisma.activitySession.findMany).mockResolvedValue(
      existingSessions as Awaited<ReturnType<typeof prisma.activitySession.findMany>>,
    );

    await ensureRecurringSessions(now);

    expect(prisma.activitySession.createMany).not.toHaveBeenCalled();
  });

  it('does not generate sessions for dates before today', async () => {
    // Visit on Aug 15 — only Aug 17, 24, 31 should be generated
    const now = new Date(Date.UTC(2026, 7, 15));
    await ensureRecurringSessions(now);

    const { data } = vi.mocked(prisma.activitySession.createMany).mock
      .calls[0][0] as SessionCreateArg;
    for (const session of data) {
      expect(session.date.getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it('does nothing when there are no qualifying activities', async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    const now = new Date(Date.UTC(2026, 7, 1));

    await ensureRecurringSessions(now);

    expect(prisma.activitySession.findMany).not.toHaveBeenCalled();
    expect(prisma.activitySession.createMany).not.toHaveBeenCalled();
  });
});

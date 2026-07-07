import { NextResponse } from 'next/server';
import { ensureRecurringSessions } from '@/lib/recurring-sessions';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * GET /api/cron/generate-sessions
 *
 * Called by Vercel Cron on schedule "0 17 28,29,30,31 * *" (17:00 UTC = 00:00 WIB).
 * Uses a WIB (+7h) offset so the function always sees the 1st of the new month when
 * running on the last day of the previous month at midnight WIB.
 *
 * Protected by CRON_SECRET (auto-injected by Vercel in production).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const wibNow = new Date(Date.now() + WIB_OFFSET_MS);
  await ensureRecurringSessions(wibNow);

  return NextResponse.json({ ok: true });
}

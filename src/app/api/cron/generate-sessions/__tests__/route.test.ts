import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';

vi.mock('@/lib/recurring-sessions', () => ({
  ensureRecurringSessions: vi.fn().mockResolvedValue(undefined),
}));

import { ensureRecurringSessions } from '@/lib/recurring-sessions';

const CRON_SECRET = 'test-cron-secret-xyz';

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new Request('http://localhost:3000/api/cron/generate-sessions', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/cron/generate-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', CRON_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when Authorization header has wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 200 and { ok: true } with correct Authorization', async () => {
    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('calls ensureRecurringSessions once with correct auth', async () => {
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(ensureRecurringSessions).toHaveBeenCalledOnce();
  });

  it('passes a WIB-offset date (+7h) to ensureRecurringSessions', async () => {
    const before = Date.now();
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const after = Date.now();

    const calledWith = vi.mocked(ensureRecurringSessions).mock.calls[0][0] as Date;
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

    expect(calledWith).toBeInstanceOf(Date);
    expect(calledWith.getTime()).toBeGreaterThanOrEqual(before + WIB_OFFSET_MS - 200);
    expect(calledWith.getTime()).toBeLessThanOrEqual(after + WIB_OFFSET_MS + 200);
  });

  it('does not call ensureRecurringSessions when unauthorized', async () => {
    await GET(makeRequest('Bearer bad-secret'));
    expect(ensureRecurringSessions).not.toHaveBeenCalled();
  });
});

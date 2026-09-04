import { NextResponse } from 'next/server';
import type { AttendanceStatus } from '@prisma/client';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import {
    ADMIN_SETTABLE_STATUSES,
    parseBulkAttendance,
    rowsNeedingWrite,
    type BulkAttendanceRow,
} from '@/lib/attendance-admin';

/**
 * POST /api/sessions/[id]/attendance/bulk — the whole attendance list for one
 * Session, saved as one write. Body: `{ rows: [{ userId, status }] }`, carrying
 * **only** the rows the Admin changed; the same Admin check and the same allowed
 * set as the single-row route apply, so `MAYBE` is refused here exactly as it is
 * there. The whole payload is validated before anything is written, rows already
 * matching what is stored are dropped, and nothing derives a status (ADR 0012).
 * The single-row route stays where it is, for one-off corrections.
 */

/** What a refused payload reports. The register shows its own sentence. */
const INVALID_PAYLOAD = 'Invalid payload';

/** Every stored status on this Session that holds or held a Seat, by member. */
async function loadSeatedStatuses(
    sessionId: string,
): Promise<Map<string, AttendanceStatus>> {
    const rows = await prisma.attendance.findMany({
        where: { sessionId, status: { in: ADMIN_SETTABLE_STATUSES } },
        select: { userId: true, status: true },
    });
    return new Map(rows.map((row) => [row.userId, row.status]));
}

/** One transaction, one update per changed row. All of it, or none of it. */
async function writeRows(
    sessionId: string,
    rows: readonly BulkAttendanceRow[],
): Promise<void> {
    await prisma.$transaction(
        rows.map((row) =>
            prisma.attendance.update({
                where: { userId_sessionId: { userId: row.userId, sessionId } },
                data: { status: row.status },
            }),
        ),
    );
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: sessionId } = await params;
    const exists = await prisma.activitySession.findUnique({
        where: { id: sessionId },
        select: { id: true },
    });
    if (exists === null) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const stored = await loadSeatedStatuses(sessionId);
    const parsed = parseBulkAttendance(body, new Set(stored.keys()));
    if (!parsed.ok) {
        return NextResponse.json(
            { error: INVALID_PAYLOAD, reason: parsed.error },
            { status: 400 },
        );
    }

    const writes = rowsNeedingWrite(parsed.rows, stored);
    if (writes.length > 0) {
        await writeRows(sessionId, writes);
    }
    return NextResponse.json({ updated: writes.length });
}

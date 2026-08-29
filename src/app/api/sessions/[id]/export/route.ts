import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { visibleContactCells } from '@/lib/owner-visibility';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import type { Prisma, Role } from '@prisma/client';

const ATTENDANCE_INCLUDE = {
    user: { select: { name: true, email: true, phone: true, role: true } },
} as const;

type AttendanceRecord = Prisma.AttendanceGetPayload<{
    include: typeof ATTENDANCE_INCLUDE;
}>;

const TIMESTAMP_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * One CSV row, in the file's column order.
 *
 * The Owner's email and WhatsApp cells are empty for an Admin exporting the file
 * and carry their stored values for an Owner exporting it — the Owner's row is
 * still written, and its status and timestamp are unchanged
 * (docs/owner-role-immutability.md, rule 2).
 */
function toAttendanceRow(
    attendance: AttendanceRecord,
    index: number,
    viewerRole: Role,
): string[] {
    const { email, phone } = visibleContactCells(attendance.user, viewerRole);
    return [
        String(index + 1),
        attendance.user.name ?? '',
        email,
        phone,
        attendance.status,
        format(new Date(attendance.createdAt), TIMESTAMP_FORMAT),
    ];
}

// GET /api/sessions/[id]/export — export attendance as CSV (admin only)
export async function GET(
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

    const { id: sessionId } = await params;
    const h = getDictionary(await getLocale()).admin.csvHeaders;

    const activitySession = await prisma.activitySession.findUnique({
        where: { id: sessionId },
        include: {
            attendances: {
                include: ATTENDANCE_INCLUDE,
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!activitySession) {
        return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 },
        );
    }

    const rows = [
        [
            h.no,
            h.name,
            h.email,
            h.whatsapp,
            h.status,
            h.registeredAt,
        ],
        ...activitySession.attendances.map((attendance, i) =>
            toAttendanceRow(attendance, i, session.user.role),
        ),
    ];

    const csv = rows
        .map((r) =>
            r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','),
        )
        .join('\n');

    const filename = `absensi-${activitySession.title.replaceAll(/\s+/g, '-')}-${format(new Date(activitySession.date), 'yyyyMMdd')}.csv`;

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}

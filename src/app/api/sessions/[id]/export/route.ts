import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

// GET /api/sessions/[id]/export — export attendance as CSV (admin only)
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: sessionId } = await params;

    const activitySession = await prisma.activitySession.findUnique({
        where: { id: sessionId },
        include: {
            attendances: {
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
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
            'No',
            'Nama',
            'Email',
            'WhatsApp',
            'Status',
            'Waktu Daftar',
        ],
        ...activitySession.attendances.map((a, i) => [
            String(i + 1),
            a.user.name ?? '',
            a.user.email ?? '',
            a.user.phone ?? '',
            a.status,
            format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm'),
        ]),
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

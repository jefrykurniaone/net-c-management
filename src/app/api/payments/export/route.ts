import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';

// GET /api/payments/export?month=&year= — CSV export (admin only)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month')
        ? Number.parseInt(searchParams.get('month')!)
        : undefined;
    const year = searchParams.get('year')
        ? Number.parseInt(searchParams.get('year')!)
        : undefined;
    const activityId = searchParams.get('activityId') ?? undefined;
    const h = getDictionary(await getLocale()).admin.csvHeaders;

    const payments = await prisma.payment.findMany({
        where: {
            ...(month ? { month } : {}),
            ...(year ? { year } : {}),
            ...(activityId ? { activityId } : {}),
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'asc' }],
        include: {
            user: { select: { name: true, email: true, phone: true } },
            activity: { select: { name: true } },
        },
    });

    const rows = [
        [
            h.no,
            h.name,
            h.email,
            h.whatsapp,
            h.activity,
            h.month,
            h.year,
            h.amount,
            h.status,
            h.uploadedAt,
            h.confirmedAt,
        ],
        ...payments.map((p, i) => [
            String(i + 1),
            p.user.name ?? '',
            p.user.email ?? '',
            p.user.phone ?? '',
            p.activity.name,
            String(p.month),
            String(p.year),
            String(p.amount),
            p.status,
            format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm'),
            p.confirmedAt
                ? format(new Date(p.confirmedAt), 'dd/MM/yyyy HH:mm')
                : '',
        ]),
    ];

    const csv = rows
        .map((r) =>
            r.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','),
        )
        .join('\n');
    let label: string;
    if (month && year) {
        label = `${month}-${year}`;
    } else if (year) {
        label = String(year);
    } else {
        label = 'semua';
    }
    const filename = `iuran-${label}.csv`;

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}

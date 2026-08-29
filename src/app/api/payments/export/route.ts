import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { visibleContactCells } from '@/lib/owner-visibility';
import { prisma } from '@/lib/prisma';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import type { Prisma, Role } from '@prisma/client';

const PAYMENT_INCLUDE = {
    user: { select: { name: true, email: true, phone: true, role: true } },
    activity: { select: { name: true } },
} as const;

type PaymentRecord = Prisma.PaymentGetPayload<{
    include: typeof PAYMENT_INCLUDE;
}>;

const TIMESTAMP_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * One CSV row, in the file's column order.
 *
 * The Owner's email and WhatsApp cells are empty for an Admin exporting the file
 * and carry their stored values for an Owner exporting it — the Owner's row is
 * still written, and every other column on it is unchanged
 * (docs/owner-role-immutability.md, rule 2).
 */
function toPaymentRow(
    payment: PaymentRecord,
    index: number,
    viewerRole: Role,
): string[] {
    const { email, phone } = visibleContactCells(payment.user, viewerRole);
    return [
        String(index + 1),
        payment.user.name ?? '',
        email,
        phone,
        payment.activity.name,
        String(payment.month),
        String(payment.year),
        String(payment.amount),
        payment.status,
        format(new Date(payment.createdAt), TIMESTAMP_FORMAT),
        payment.confirmedAt
            ? format(new Date(payment.confirmedAt), TIMESTAMP_FORMAT)
            : '',
    ];
}

// GET /api/payments/export?month=&year= — CSV export (admin only)
export async function GET(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
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
        include: PAYMENT_INCLUDE,
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
        ...payments.map((payment, i) =>
            toPaymentRow(payment, i, session.user.role),
        ),
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

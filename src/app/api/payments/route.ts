import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreatePaymentSchema } from '@/lib/validations/payment';
import { isAdminRole } from '@/lib/utils';
import { NextResponse } from 'next/server';

const MAX_PAYMENT_LIMIT = 100;
const DEFAULT_PAYMENT_LIMIT = 20;

// GET /api/payments — list payments for current user (or all for admin)
export async function GET(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { searchParams } = new URL(req.url);
    const isAdmin = isAdminRole(session.user.role);
    const targetUserId = isAdmin
        ? (searchParams.get('userId') ?? undefined)
        : session.user.id;
    const month = searchParams.get('month')
        ? Number.parseInt(searchParams.get('month')!)
        : undefined;
    const year = searchParams.get('year')
        ? Number.parseInt(searchParams.get('year')!)
        : undefined;
    const status = searchParams.get('status') as
        | 'PENDING'
        | 'CONFIRMED'
        | 'REJECTED'
        | null;
    const activityId = searchParams.get('activityId') ?? undefined;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        MAX_PAYMENT_LIMIT,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_PAYMENT_LIMIT))),
    );
    const skip = (page - 1) * limit;

    const where = {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
        ...(status ? { status } : {}),
        ...(activityId ? { activityId } : {}),
    };

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            skip,
            take: limit,
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
                activity: { select: { id: true, name: true } },
            },
        }),
        prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, limit });
}

// POST /api/payments — create payment record (admin only)
export async function POST(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const body = await req.json();
    const parsed = buildCreatePaymentSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const payment = await prisma.payment.create({ data: parsed.data });
    return NextResponse.json(payment, { status: 201 });
}

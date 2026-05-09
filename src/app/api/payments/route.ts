import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreatePaymentSchema } from '@/lib/validations/payment';
import { NextResponse } from 'next/server';

// GET /api/payments — list payments for current user (or all for admin)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isAdmin = session.user.role === 'ADMIN';
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
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20')),
    );
    const skip = (page - 1) * limit;

    const where = {
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
        ...(status ? { status } : {}),
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
            },
        }),
        prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, limit });
}

// POST /api/payments — create payment record (admin only)
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
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

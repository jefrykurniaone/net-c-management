import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildConfirmPaymentSchema } from '@/lib/validations/payment';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { PaymentType } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/payments/[id]
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    if (!payment) {
        return NextResponse.json(
            { error: 'Payment not found' },
            { status: 404 },
        );
    }

    // Non-admins can only see their own payments
    if (!isAdminRole(session.user.role) && payment.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(payment);
}

// PATCH /api/payments/[id] — admin confirms or rejects
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const t = getDictionary(await getLocale());
    const parsed = buildConfirmPaymentSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const payment = await prisma.payment.findUnique({
        where: { id },
        select: {
            id: true,
            type: true,
            sessionId: true,
            userId: true,
            status: true,
            ekskulId: true,
            month: true,
            year: true,
        },
    });
    if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (payment.status !== 'PENDING') {
        return NextResponse.json(
            { error: t.admin.paymentAlreadyReviewed },
            { status: 409 },
        );
    }

    // Both confirm and reject record the acting admin + timestamp (AC4/UX-DR12).
    const data = {
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        confirmedBy: session.user.id,
        confirmedAt: new Date(),
    };

    // Rejecting a per-session payment releases the paired seat atomically (AD-6).
    // Only a REGISTERED (not yet PRESENT) attendance is released — a completed
    // session's historical PRESENT record is never retroactively erased.
    if (
        parsed.data.status === 'REJECTED' &&
        payment.type === PaymentType.SESSION &&
        payment.sessionId !== null
    ) {
        const { userId, sessionId } = payment;
        const [updated] = await prisma.$transaction([
            prisma.payment.update({ where: { id }, data }),
            prisma.attendance.deleteMany({
                where: { userId, sessionId, status: 'REGISTERED' },
            }),
        ]);
        return NextResponse.json(updated);
    }

    // Rejecting monthly dues releases every seat that payment was holding this
    // period: the member's not-yet-attended registrations across the Activity's
    // sessions of that month. PRESENT/ABSENT history stays untouched.
    if (parsed.data.status === 'REJECTED' && payment.type === PaymentType.MONTHLY) {
        const monthStart = new Date(Date.UTC(payment.year, payment.month - 1, 1));
        const nextMonthStart = new Date(Date.UTC(payment.year, payment.month, 1));
        const [updated] = await prisma.$transaction([
            prisma.payment.update({ where: { id }, data }),
            prisma.attendance.deleteMany({
                where: {
                    userId: payment.userId,
                    status: 'REGISTERED',
                    session: {
                        ekskulId: payment.ekskulId,
                        date: { gte: monthStart, lt: nextMonthStart },
                    },
                },
            }),
        ]);
        return NextResponse.json(updated);
    }

    const updated = await prisma.payment.update({ where: { id }, data });
    return NextResponse.json(updated);
}

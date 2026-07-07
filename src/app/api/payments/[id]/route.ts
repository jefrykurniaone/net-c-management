import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildConfirmPaymentSchema } from '@/lib/validations/payment';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSettings } from '@/lib/settings';
import {
    formatMonthYear,
    formatShortDate,
    isEmailConfigured,
    sendPaymentStatus,
    type EmailLocale,
} from '@/lib/email';
import { PaymentType } from '@prisma/client';
import { after, NextResponse } from 'next/server';

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
    const locale = await getLocale();
    const t = getDictionary(locale);
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
            activityId: true,
            month: true,
            year: true,
            amount: true,
            user: { select: { name: true, email: true } },
            activity: { select: { name: true } },
            session: { select: { title: true, date: true } },
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
        queuePaymentStatusEmail(payment, data.status, data.notes, locale);
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
                        activityId: payment.activityId,
                        date: { gte: monthStart, lt: nextMonthStart },
                    },
                },
            }),
        ]);
        queuePaymentStatusEmail(payment, data.status, data.notes, locale);
        return NextResponse.json(updated);
    }

    const updated = await prisma.payment.update({ where: { id }, data });
    queuePaymentStatusEmail(payment, data.status, data.notes, locale);
    return NextResponse.json(updated);
}

/** The reviewed payment's fields the member notification needs. */
interface ReviewedPayment {
    type: PaymentType;
    amount: number;
    month: number;
    year: number;
    user: { name: string | null; email: string | null };
    activity: { name: string };
    session: { title: string; date: Date } | null;
}

/**
 * Queue the approve/reject notification to the member after the response.
 * Best-effort: failures are logged, never surfaced to the reviewing admin.
 */
function queuePaymentStatusEmail(
    payment: ReviewedPayment,
    status: 'CONFIRMED' | 'REJECTED',
    notes: string | null,
    locale: EmailLocale,
) {
    if (!isEmailConfigured() || !payment.user.email) return;
    const to = payment.user.email;

    const billedFor =
        payment.type === PaymentType.SESSION && payment.session
            ? `${payment.session.title} — ${formatShortDate(new Date(payment.session.date), locale)}`
            : `${payment.activity.name} — ${formatMonthYear(payment.month, payment.year, locale)}`;

    after(async () => {
        try {
            const settings = await getSettings();
            await sendPaymentStatus({
                to,
                name: payment.user.name ?? to,
                status,
                amount: payment.amount,
                billedFor,
                notes,
                communityName: settings.communityName,
                locale,
            });
        } catch (err) {
            console.error(`[payments] status email to ${to} failed:`, err);
        }
    });
}

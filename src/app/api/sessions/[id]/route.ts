import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildUpdateSessionSchema } from '@/lib/validations/session';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { NextResponse } from 'next/server';

// GET /api/sessions/[id]
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { id } = await params;

    const activitySession = await prisma.activitySession.findUnique({
        where: { id },
        include: {
            activity: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                    bankName: true,
                    bankAccountNumber: true,
                    bankAccountHolder: true,
                },
            },
            _count: { select: { attendances: true } },
            attendances: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
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

    return NextResponse.json(activitySession);
}

// PATCH /api/sessions/[id] — admin only
export async function PATCH(
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

    const locale = await getLocale();
    const t = getDictionary(locale);

    const { id } = await params;

    // Check if the session has any attendances (fee becomes immutable once members register)
    const existing = await prisma.activitySession.findUnique({
        where: { id },
        select: { _count: { select: { attendances: true } } },
    });
    if (!existing) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = buildUpdateSessionSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { date, fee, ...rest } = parsed.data;
    const hasAttendances = existing._count.attendances > 0;

    const updated = await prisma.activitySession.update({
        where: { id },
        data: {
            ...rest,
            ...(date ? { date: new Date(date) } : {}),
            // Fee is immutable once members have registered
            ...(!hasAttendances && fee !== undefined ? { fee } : {}),
        },
    });

    // The correctness case: a cached `/` cannot re-filter, so a cancel or a
    // reschedule has to expire the page that still advertises the old date.
    invalidatePublicLanding();
    return NextResponse.json(updated);
}

// DELETE /api/sessions/[id] — admin only
export async function DELETE(
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

    const { id } = await params;

    await prisma.activitySession.delete({ where: { id } });

    invalidatePublicLanding();
    return NextResponse.json({ success: true });
}

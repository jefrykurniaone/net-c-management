import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildUpdateActivitySchema } from '@/lib/validations/activity';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/activities/[id] — single activity (all authenticated users)
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { id } = await params;
    const activity = await prisma.activity.findUnique({
        where: { id },
        include: { _count: { select: { memberships: true } } },
    });

    if (!activity) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(activity);
}

// PATCH /api/activities/[id] — update activity (admin only)
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
    const body = await req.json();
    const parsed = buildUpdateActivitySchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    try {
        const activity = await prisma.activity.update({
            where: { id },
            data: parsed.data,
        });
        // Name, icon, colour, weekly slot, fees and `isActive` all publish.
        invalidatePublicLanding();
        return NextResponse.json(activity);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                return NextResponse.json(
                    { error: t.validation.activitySlugTaken },
                    { status: 409 },
                );
            }
            if (err.code === 'P2025') {
                return NextResponse.json(
                    { error: 'Not found' },
                    { status: 404 },
                );
            }
        }
        throw err;
    }
}

// DELETE /api/activities/[id] — admin only.
// Blocks (409) if the activity has sessions or payments; admins should
// deactivate (PATCH isActive=false) instead to preserve historical data.
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

    const locale = await getLocale();
    const t = getDictionary(locale);

    const { id } = await params;
    const [sessionCount, paymentCount] = await Promise.all([
        prisma.activitySession.count({ where: { activityId: id } }),
        prisma.payment.count({ where: { activityId: id } }),
    ]);

    if (sessionCount > 0 || paymentCount > 0) {
        return NextResponse.json(
            { error: t.admin.activityDeleteHasDataError },
            { status: 409 },
        );
    }

    try {
        await prisma.activity.delete({ where: { id } });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2025'
        ) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        throw err;
    }

    // A deleted Activity leaves the board.
    invalidatePublicLanding();
    return NextResponse.json({ success: true });
}

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildUpdateEkskulSchema } from '@/lib/validations/ekskul';
import { isAdminRole } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/ekskul/[id] — single ekskul (all authenticated users)
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ekskul = await prisma.ekskul.findUnique({
        where: { id },
        include: { _count: { select: { memberships: true } } },
    });

    if (!ekskul) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(ekskul);
}

// PATCH /api/ekskul/[id] — update ekskul (admin only)
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

    const locale = await getLocale();
    const t = getDictionary(locale);

    const { id } = await params;
    const body = await req.json();
    const parsed = buildUpdateEkskulSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    try {
        const ekskul = await prisma.ekskul.update({
            where: { id },
            data: parsed.data,
        });
        return NextResponse.json(ekskul);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                return NextResponse.json(
                    { error: t.validation.ekskulSlugTaken },
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

// DELETE /api/ekskul/[id] — admin only.
// Blocks (409) if the ekskul has sessions or payments; admins should
// deactivate (PATCH isActive=false) instead to preserve historical data.
export async function DELETE(
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

    const locale = await getLocale();
    const t = getDictionary(locale);

    const { id } = await params;
    const [sessionCount, paymentCount] = await Promise.all([
        prisma.activitySession.count({ where: { ekskulId: id } }),
        prisma.payment.count({ where: { ekskulId: id } }),
    ]);

    if (sessionCount > 0 || paymentCount > 0) {
        return NextResponse.json(
            { error: t.admin.ekskulDeleteHasDataError },
            { status: 409 },
        );
    }

    try {
        await prisma.ekskul.delete({ where: { id } });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2025'
        ) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        throw err;
    }

    return NextResponse.json({ success: true });
}

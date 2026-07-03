import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreateActivitySchema } from '@/lib/validations/activity';
import { getUserActivityIds } from '@/lib/activity';
import { isAdminRole } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/activities — list activity (all authenticated users).
// Returns active activity by default; admins may pass ?includeInactive=true.
// Pass ?mine=true to limit results to activity the current user belongs to.
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const includeInactive =
        searchParams.get('includeInactive') === 'true' &&
        isAdminRole(session.user.role);
    const mineOnly = searchParams.get('mine') === 'true';

    const where: Prisma.ActivityWhereInput = includeInactive
        ? {}
        : { isActive: true };
    if (mineOnly) {
        const myIds = await getUserActivityIds(session.user.id);
        where.id = { in: myIds };
    }

    const activities = await prisma.activity.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { memberships: true } } },
    });

    return NextResponse.json({ activities });
}

// POST /api/activities — create activity (admin only)
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const body = await req.json();
    const parsed = buildCreateActivitySchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    try {
        const activity = await prisma.activity.create({ data: parsed.data });
        return NextResponse.json(activity, { status: 201 });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
        ) {
            return NextResponse.json(
                { error: t.validation.activitySlugTaken },
                { status: 409 },
            );
        }
        throw err;
    }
}

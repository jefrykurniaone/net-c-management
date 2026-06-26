import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreateEkskulSchema } from '@/lib/validations/ekskul';
import { getUserEkskulIds } from '@/lib/ekskul';
import { isAdminRole } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/ekskul — list ekskul (all authenticated users).
// Returns active ekskul by default; admins may pass ?includeInactive=true.
// Pass ?mine=true to limit results to ekskul the current user belongs to.
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

    const where: Prisma.EkskulWhereInput = includeInactive
        ? {}
        : { isActive: true };
    if (mineOnly) {
        const myIds = await getUserEkskulIds(session.user.id);
        where.id = { in: myIds };
    }

    const ekskuls = await prisma.ekskul.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { memberships: true } } },
    });

    return NextResponse.json({ ekskuls });
}

// POST /api/ekskul — create ekskul (admin only)
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
    const parsed = buildCreateEkskulSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    try {
        const ekskul = await prisma.ekskul.create({ data: parsed.data });
        return NextResponse.json(ekskul, { status: 201 });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
        ) {
            return NextResponse.json(
                { error: t.validation.ekskulSlugTaken },
                { status: 409 },
            );
        }
        throw err;
    }
}

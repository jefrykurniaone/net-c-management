import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreateSessionSchema } from '@/lib/validations/session';
import { SessionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/sessions — list sessions (all authenticated users)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get('upcoming') === 'true';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        50,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20')),
    );
    const skip = (page - 1) * limit;

    const where = upcoming
        ? {
              date: { gte: new Date() },
              status: { in: [SessionStatus.SCHEDULED, SessionStatus.ONGOING] },
          }
        : {};

    const [sessions, total] = await Promise.all([
        prisma.badmintonSession.findMany({
            where,
            orderBy: { date: upcoming ? 'asc' : 'desc' },
            skip,
            take: limit,
            include: {
                _count: { select: { attendances: true } },
                attendances: {
                    where: { userId: session.user.id },
                    select: { id: true, status: true },
                },
            },
        }),
        prisma.badmintonSession.count({ where }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
}

// POST /api/sessions — create session (admin only)
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
    const parsed = buildCreateSessionSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { date, ...rest } = parsed.data;
    const newSession = await prisma.badmintonSession.create({
        data: {
            ...rest,
            date: new Date(date),
        },
    });

    return NextResponse.json(newSession, { status: 201 });
}

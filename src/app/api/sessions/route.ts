import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreateSessionSchema } from '@/lib/validations/session';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { Prisma, SessionStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

const MAX_SESSION_LIMIT = 50;
const DEFAULT_SESSION_LIMIT = 20;

// GET /api/sessions — list sessions (all authenticated users)
export async function GET(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { searchParams } = new URL(req.url);
    const upcoming = searchParams.get('upcoming') === 'true';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
        MAX_SESSION_LIMIT,
        Math.max(1, Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_SESSION_LIMIT))),
    );
    const skip = (page - 1) * limit;
    const activityIdParam = searchParams.get('activityId') ?? undefined;
    const isAdmin = isAdminRole(session.user.role);

    const where: Prisma.ActivitySessionWhereInput = upcoming
        ? {
              date: { gte: new Date() },
              status: { in: [SessionStatus.SCHEDULED, SessionStatus.ONGOING] },
          }
        : {};

    // Members see sessions of every ACTIVE activity (join happens at the session
    // level now); admins additionally see sessions of inactive activity.
    if (!isAdmin) {
        where.activity = { isActive: true };
    }
    if (activityIdParam) {
        where.activityId = activityIdParam;
    }

    const [sessions, total] = await Promise.all([
        prisma.activitySession.findMany({
            where,
            orderBy: { date: upcoming ? 'asc' : 'desc' },
            skip,
            take: limit,
            include: {
                _count: { select: { attendances: true } },
                activity: { select: { id: true, name: true, color: true } },
                attendances: {
                    where: { userId: session.user.id },
                    select: { id: true, status: true },
                },
            },
        }),
        prisma.activitySession.count({ where }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
}

// POST /api/sessions — create session (admin only)
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
    const parsed = buildCreateSessionSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { date, ...rest } = parsed.data;
    const newSession = await prisma.activitySession.create({
        data: {
            ...rest,
            date: new Date(date),
        },
    });

    // A new session may be an Activity's next date on `/`.
    invalidatePublicLanding();
    return NextResponse.json(newSession, { status: 201 });
}

import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildCreateActivitySchema } from '@/lib/validations/activity';
import { getUserActivityIds } from '@/lib/activity';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

/**
 * What someone who has not been let in may read of an Activity.
 *
 * The full row carries `bankName`, `bankAccountNumber` and `bankAccountHolder`.
 * Handing every signed-in account the full row is what made advertising `/`
 * dangerous in the first place — it published the community's bank details to
 * anyone with a Google account — so the exposure is closed at the projection,
 * not only at the door. These are the same fields the public route already
 * prints, and they are what `/onboarding`'s activity picker needs.
 */
const APPLICANT_ACTIVITY_SELECT = {
    id: true,
    name: true,
    slug: true,
    color: true,
    icon: true,
    isActive: true,
} as const;

// GET /api/activities — list activity (all authenticated users).
// Returns active activity by default; admins may pass ?includeInactive=true.
// Pass ?mine=true to limit results to activity the current user belongs to.
// An Applicant gets the narrow projection above and nothing else: this route
// stays outside the admission gate because onboarding runs *before* the Admin
// has a decision to make.
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAdmittedSession(session)) {
        const activities = await prisma.activity.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: APPLICANT_ACTIVITY_SELECT,
        });
        return NextResponse.json({ activities });
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
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
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
        // A new active Activity is published on `/`.
        invalidatePublicLanding();
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

import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
    buildCreateActivitySchema,
    type CreateActivityFormData,
} from '@/lib/validations/activity';
import { getUserActivityIds } from '@/lib/activity';
import { BEGINNING_OF_TIME } from '@/lib/billing-period';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { Prisma, type Activity } from '@prisma/client';
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

/**
 * Create the Activity and its beginning-of-time Dues Rate as one write.
 *
 * An Activity that existed for even an instant without a rate row is an
 * Activity whose Billing Periods resolve to no amount, so the two rows are one
 * transaction rather than two statements. The rate is `duesAmount` as posted —
 * the figure the form submitted — and `setById` records the Admin who created
 * it, which the migration's own seeded rows cannot say because nobody set
 * those. `duesAmount` is destructured out before `tx.activity.create`: the
 * generated client rejects an unknown field, and there is no `Activity` column
 * left for it to land on.
 *
 * A `P2002` out of here still means the slug: `(activityId, effectiveFrom)` is
 * written exactly once, for an Activity id that did not exist a moment ago.
 */
function createActivityWithDuesRate(
    data: CreateActivityFormData,
    setById: string,
): Promise<Activity> {
    const { duesAmount, ...activityData } = data;
    return prisma.$transaction(async (tx) => {
        const created = await tx.activity.create({ data: activityData });
        await tx.duesRate.create({
            data: {
                activityId: created.id,
                amount: duesAmount,
                effectiveFrom: BEGINNING_OF_TIME,
                setById,
            },
        });
        return created;
    });
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
        const activity = await createActivityWithDuesRate(parsed.data, session.user.id);
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

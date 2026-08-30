import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { buildUpdateActivitySchema } from '@/lib/validations/activity';
import {
    duesRateRefusalMessage,
    duesRateRefusalStatus,
    updateActivityWithDuesRate,
    type DuesRateRefusalReason,
} from '@/lib/dues-rate-writes';
import { queueDuesChangeEmail } from '@/lib/dues-change-mail';
import { duesChangeEventOf } from '@/lib/dues-notice';
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

/**
 * A Dues Rate refusal, said the way `session-lock.ts`'s refusals are: the
 * translated sentence the form shows beneath the field, and the stable code
 * beside it. 409 when the Period is settled, 400 when it is out of range.
 */
function duesRateRefused(reason: DuesRateRefusalReason, t: Dictionary) {
    return NextResponse.json(
        { error: duesRateRefusalMessage(reason, t), code: reason },
        { status: duesRateRefusalStatus(reason) },
    );
}

/** The two Prisma failures this write has an answer for; anything else rethrows. */
function activityWriteError(err: unknown, t: Dictionary) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
        return null;
    }
    if (err.code === 'P2002') {
        return NextResponse.json(
            { error: t.validation.activitySlugTaken },
            { status: 409 },
        );
    }
    if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return null;
}

/**
 * PATCH /api/activities/[id] — update activity (admin only).
 *
 * The Dues figure arrives as `duesRate: { amount, effectiveFrom }` rather than
 * as `monthlyFee`: a Dues Rate is a history against a Billing Period, so a save
 * names the month the new amount starts from. The Activity's fields and that
 * rate row are written under one Activity row lock in
 * `src/lib/dues-rate-writes.ts`, so two Admins saving at once cannot both queue
 * a change, and a refused rate leaves no half-renamed Activity behind.
 */
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

    const t = getDictionary(await getLocale());
    const { id } = await params;
    const parsed = buildUpdateActivitySchema(t).safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { duesRate, ...data } = parsed.data;
    try {
        const outcome = await updateActivityWithDuesRate({
            activityId: id,
            data,
            duesRate: duesRate ?? null,
            setById: session.user.id,
        });
        if (outcome.kind === 'refused') {
            return duesRateRefused(outcome.reason, t);
        }
        // Name, weekly slot, fees and `isActive` all publish.
        invalidatePublicLanding();
        // A queued, replaced or withdrawn Dues change is money the members on
        // Dues will be asked for, so they hear it from the write that made it.
        // Classified from the outcome the write reported — never from a second
        // read of the rate rows — and sent after this response.
        queueDuesChangeEmail(id, duesChangeEventOf(outcome.duesRateChange));
        return NextResponse.json(outcome.activity);
    } catch (err) {
        const answer = activityWriteError(err, t);
        if (answer !== null) {
            return answer;
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

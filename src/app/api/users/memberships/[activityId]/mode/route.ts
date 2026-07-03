import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertMembership } from '@/lib/activity';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildUpdatePaymentModeSchema } from '@/lib/validations/membership';
import {
    currentPeriod,
    nextPeriod,
    toPeriodKey,
    graduateStanding,
} from '@/lib/payment-mode';
import { PaymentMode, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

/** Whether the Activity offers the requested mode (FR-9). */
function offersMode(
    activity: { allowsMonthly: boolean; allowsPerSession: boolean },
    mode: PaymentMode,
): boolean {
    return mode === PaymentMode.MONTHLY
        ? activity.allowsMonthly
        : activity.allowsPerSession;
}

/**
 * The Membership fields to write for a switch (AD-7), against the
 * already-graduated standing mode (see `graduateStanding`). A first-ever
 * selection (no standing mode) applies THIS period — nothing is owed yet.
 * Re-picking the standing mode cancels any queued switch, persisting the
 * graduation. A genuine change is queued for the NEXT period, leaving the
 * (graduated) standing mode — and thus the current period — untouched.
 */
function resolveSwitch(
    standing: { paymentMode: PaymentMode | null; effectiveFrom: number },
    mode: PaymentMode,
    now: Date,
): Prisma.MembershipUpdateInput {
    if (standing.paymentMode === null) {
        const cur = currentPeriod(now);
        return {
            paymentMode: mode,
            effectiveFrom: toPeriodKey(cur.month, cur.year),
            pendingMode: null,
            pendingEffectiveFrom: null,
        };
    }
    if (mode === standing.paymentMode) {
        return {
            paymentMode: standing.paymentMode,
            effectiveFrom: standing.effectiveFrom,
            pendingMode: null,
            pendingEffectiveFrom: null,
        };
    }
    const next = nextPeriod(now);
    return {
        paymentMode: standing.paymentMode,
        effectiveFrom: standing.effectiveFrom,
        pendingMode: mode,
        pendingEffectiveFrom: toPeriodKey(next.month, next.year),
    };
}

const MEMBERSHIP_MODE_SELECT = {
    paymentMode: true,
    effectiveFrom: true,
    pendingMode: true,
    pendingEffectiveFrom: true,
} as const;

// PATCH /api/users/memberships/[activityId]/mode — a member sets or changes their
// payment mode for an Activity (Story 3.3, FR-10). Auth-gated, activity-scoped;
// the effective period is derived server-side (AD-2, AD-7).
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ activityId: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const t = getDictionary(await getLocale());
    const { activityId } = await params;
    const userId = session.user.id;

    if (!(await assertMembership(userId, activityId))) {
        return NextResponse.json({ error: t.activity.notMember }, { status: 403 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: t.validation.paymentModeRequired },
            { status: 400 },
        );
    }

    const parsed = buildUpdatePaymentModeSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.validation.paymentModeRequired, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const activity = await prisma.activity.findUnique({
        where: { id: activityId, isActive: true },
        select: { allowsMonthly: true, allowsPerSession: true },
    });
    if (!activity) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!offersMode(activity, parsed.data.mode)) {
        return NextResponse.json(
            { error: t.validation.paymentModeNotOffered },
            { status: 400 },
        );
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_activityId: { userId, activityId }, isActive: true },
        select: MEMBERSHIP_MODE_SELECT,
    });
    if (!membership) {
        return NextResponse.json({ error: t.activity.notMember }, { status: 403 });
    }

    const now = new Date();
    const standing = graduateStanding(membership, currentPeriod(now));

    try {
        const updated = await prisma.membership.update({
            // Extended-where-unique doubles as an optimistic-concurrency guard:
            // if another request already changed any of these fields since we
            // read them, this update matches nothing and throws P2025 instead
            // of silently clobbering that write.
            where: {
                userId_activityId: { userId, activityId },
                isActive: true,
                paymentMode: membership.paymentMode,
                pendingMode: membership.pendingMode,
                pendingEffectiveFrom: membership.pendingEffectiveFrom,
            },
            data: resolveSwitch(standing, parsed.data.mode, now),
            select: MEMBERSHIP_MODE_SELECT,
        });
        return NextResponse.json(updated, { status: 200 });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2025'
        ) {
            return NextResponse.json({ error: t.common.error }, { status: 409 });
        }
        throw err;
    }
}

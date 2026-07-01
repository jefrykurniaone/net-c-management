import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assertMembership } from '@/lib/ekskul';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildUpdatePaymentModeSchema } from '@/lib/validations/membership';
import { currentPeriod, nextPeriod, toPeriodKey } from '@/lib/payment-mode';
import { PaymentMode, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

/** Whether the Activity offers the requested mode (FR-9). */
function offersMode(
    ekskul: { allowsMonthly: boolean; allowsPerSession: boolean },
    mode: PaymentMode,
): boolean {
    return mode === PaymentMode.MONTHLY
        ? ekskul.allowsMonthly
        : ekskul.allowsPerSession;
}

/**
 * The Membership fields to write for a switch (AD-7). A first-ever selection
 * (no standing mode) applies THIS period — nothing is owed yet. Re-picking the
 * standing mode cancels any queued switch. A genuine change is queued for the
 * NEXT period, leaving the standing mode and thus the current period untouched.
 */
function resolveSwitch(
    standing: PaymentMode | null,
    mode: PaymentMode,
    now: Date,
): Prisma.MembershipUpdateInput {
    if (standing === null) {
        const cur = currentPeriod(now);
        return {
            paymentMode: mode,
            effectiveFrom: toPeriodKey(cur.month, cur.year),
            pendingMode: null,
            pendingEffectiveFrom: null,
        };
    }
    if (mode === standing) {
        return { pendingMode: null, pendingEffectiveFrom: null };
    }
    const next = nextPeriod(now);
    return { pendingMode: mode, pendingEffectiveFrom: toPeriodKey(next.month, next.year) };
}

const MEMBERSHIP_MODE_SELECT = {
    paymentMode: true,
    effectiveFrom: true,
    pendingMode: true,
    pendingEffectiveFrom: true,
} as const;

// PATCH /api/users/memberships/[ekskulId]/mode — a member sets or changes their
// payment mode for an Activity (Story 3.3, FR-10). Auth-gated, ekskul-scoped;
// the effective period is derived server-side (AD-2, AD-7).
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ ekskulId: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const t = getDictionary(await getLocale());
    const { ekskulId } = await params;
    const userId = session.user.id;

    if (!(await assertMembership(userId, ekskulId))) {
        return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
    }

    const parsed = buildUpdatePaymentModeSchema(t).safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.validation.paymentModeRequired, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const ekskul = await prisma.ekskul.findUnique({
        where: { id: ekskulId },
        select: { allowsMonthly: true, allowsPerSession: true },
    });
    if (!ekskul) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!offersMode(ekskul, parsed.data.mode)) {
        return NextResponse.json(
            { error: t.validation.paymentModeNotOffered },
            { status: 400 },
        );
    }

    const membership = await prisma.membership.findUnique({
        where: { userId_ekskulId: { userId, ekskulId } },
        select: { paymentMode: true },
    });
    if (!membership) {
        return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
    }

    const updated = await prisma.membership.update({
        where: { userId_ekskulId: { userId, ekskulId } },
        data: resolveSwitch(membership.paymentMode, parsed.data.mode, new Date()),
        select: MEMBERSHIP_MODE_SELECT,
    });

    return NextResponse.json(updated, { status: 200 });
}

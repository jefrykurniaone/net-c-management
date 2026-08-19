import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildOnboardingSchema } from '@/lib/validations/user';
import { NextResponse } from 'next/server';

// PATCH /api/users/onboarding — name, phone and Activity picks, once.
//
// The one write outside the admission gate, and necessarily so: profile first,
// admission second. Signing in makes you an Applicant, and an Admin judges a
// person with a phone number — an email address alone is not a decision. The
// Membership rows this creates are inert while the door is shut; they exist
// before admission so the Admin can see what the Applicant asked to join.
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const body = await req.json();
    const parsed = buildOnboardingSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    const { name, phone, activityIds } = parsed.data;
    const userId = session.user.id;

    // Onboarding runs once. If the profile is already complete, refuse: a second
    // submit (the form loads blank) would clobber the saved name/phone.
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { isProfileComplete: true },
    });
    if (existing?.isProfileComplete) {
        return NextResponse.json(
            { error: t.common.error },
            { status: 409 },
        );
    }

    // Only allow joining activity that are active.
    const validActivities = await prisma.activity.findMany({
        where: { id: { in: activityIds }, isActive: true },
        select: { id: true },
    });
    if (validActivities.length === 0) {
        return NextResponse.json(
            { error: t.validation.activityMembershipRequired },
            { status: 400 },
        );
    }

    const updated = await prisma.$transaction(async (tx) => {
        await tx.membership.createMany({
            data: validActivities.map((e) => ({ userId, activityId: e.id })),
            skipDuplicates: true,
        });
        return tx.user.update({
            where: { id: userId },
            data: {
                name,
                phone,
                isProfileComplete: true,
            },
            select: {
                id: true,
                name: true,
                phone: true,
                isProfileComplete: true,
            },
        });
    });

    return NextResponse.json(updated);
}

import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { deleteHeroImage, uploadHeroImage } from '@/lib/supabase';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { validateHeroImageFile } from '@/lib/hero-image-file';
import { NextResponse } from 'next/server';

const HERO_IMAGE_KEY = 'heroImageUrl';

/** The admin gate both handlers share (#155) — an Applicant or a Member may
 *  not touch the public page's hero photograph. */
async function requireAdmin(): Promise<NextResponse | null> {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

// POST /api/settings/hero-image — upload a new public-page hero photograph
// (admin only). Mirrors /api/settings/logo's shape: same gate, JPEG/PNG/WebP
// and a 5MB cap (the mime/size seam is `src/lib/hero-image-file.ts`), same
// cache invalidation.
export async function POST(req: Request) {
    const denied = await requireAdmin();
    if (denied) {
        return denied;
    }

    const t = getDictionary(await getLocale());
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json(
            { error: t.validation.fileRequired },
            { status: 400 },
        );
    }
    const refusal = validateHeroImageFile(file, t);
    if (refusal) {
        return NextResponse.json({ error: refusal }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const heroImageUrl = await uploadHeroImage(buffer, file.type);

    await prisma.settings.upsert({
        where: { key: HERO_IMAGE_KEY },
        create: { key: HERO_IMAGE_KEY, value: heroImageUrl },
        update: { value: heroImageUrl },
    });

    // The photograph is published in the public hero.
    invalidatePublicLanding();
    return NextResponse.json({ heroImageUrl });
}

// DELETE /api/settings/hero-image — remove the hero photograph and return
// the public hero to the pattern (admin only).
export async function DELETE() {
    const denied = await requireAdmin();
    if (denied) {
        return denied;
    }

    await deleteHeroImage();
    await prisma.settings.upsert({
        where: { key: HERO_IMAGE_KEY },
        create: { key: HERO_IMAGE_KEY, value: '' },
        update: { value: '' },
    });

    invalidatePublicLanding();
    return NextResponse.json({ heroImageUrl: '' });
}

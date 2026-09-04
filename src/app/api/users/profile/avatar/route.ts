import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { uploadAvatar } from '@/lib/supabase';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { NextResponse } from 'next/server';

const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json(
            { error: t.validation.fileRequired },
            { status: 400 },
        );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: t.validation.fileTypeInvalid },
            { status: 400 },
        );
    }
    if (file.size > MAX_AVATAR_BYTES) {
        return NextResponse.json(
            { error: t.validation.fileSizeAvatar },
            { status: 400 },
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // The member's own id is the only area this may write to or clear from;
    // `uploadAvatar` names the object under it and collects the rest.
    const imageUrl = await uploadAvatar(buffer, session.user.id, file.type);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
    });

    return NextResponse.json({ image: imageUrl });
}

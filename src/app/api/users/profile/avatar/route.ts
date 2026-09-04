import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { uploadAvatar } from '@/lib/supabase';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

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

    const ext = file.type.split('/')[1];
    // A new object name per upload: `randomUUID()` never reuses a path, so a
    // re-upload never overwrites the previous image. Nothing here deletes the
    // old object either, so a member's earlier avatars stay in the `avatars`
    // bucket.
    const storagePath = `${session.user.id}/avatar-${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadAvatar(buffer, storagePath, file.type);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
    });

    return NextResponse.json({ image: imageUrl });
}

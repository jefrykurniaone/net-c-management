import { auth } from '@/lib/auth';
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
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// POST /api/users/profile/avatar — upload avatar image, update user.image
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: t.validation.fileSizeAvatar },
            { status: 400 },
        );
    }

    const ext = file.type.split('/')[1];
    // Use a fixed path per user so re-uploads overwrite the old file (upsert)
    const storagePath = `${session.user.id}/avatar-${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadAvatar(buffer, storagePath, file.type);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
    });

    return NextResponse.json({ image: imageUrl });
}

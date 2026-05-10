import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadLogo } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// POST /api/settings/logo — upload a new community logo (admin only)
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json(
            { error: 'File is required' },
            { status: 400 },
        );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
            { error: 'Unsupported file format. Use JPG, PNG, or WebP.' },
            { status: 400 },
        );
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: 'Maximum file size is 2MB.' },
            { status: 400 },
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadLogo(buffer, file.type);

    await prisma.settings.upsert({
        where: { key: 'logoUrl' },
        create: { key: 'logoUrl', value: logoUrl },
        update: { value: logoUrl },
    });

    return NextResponse.json({ logoUrl });
}

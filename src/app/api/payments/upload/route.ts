import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadPaymentProof } from '@/lib/supabase';
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
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_PAYMENT_YEAR = 2020;

// POST /api/payments/upload — upload proof image + create/update payment record
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locale = await getLocale();
    const t = getDictionary(locale);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const month = Number.parseInt(formData.get('month') as string);
    const year = Number.parseInt(formData.get('year') as string);
    const amount = Number.parseInt(formData.get('amount') as string);

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
            { error: t.validation.fileSizeProof },
            { status: 400 },
        );
    }
    if (!month || month < 1 || month > 12 || !year || year < MIN_PAYMENT_YEAR) {
        return NextResponse.json(
            { error: t.validation.monthYearInvalid },
            { status: 400 },
        );
    }
    if (!amount || amount < 1) {
        return NextResponse.json(
            { error: t.validation.amountInvalid },
            { status: 400 },
        );
    }

    const ext = file.type.split('/')[1];
    const storagePath = `${session.user.id}/${year}-${String(month).padStart(2, '0')}-${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, path } = await uploadPaymentProof(
        buffer,
        storagePath,
        file.type,
    );

    // Upsert payment record — one record per user per month/year
    const payment = await prisma.payment.upsert({
        where: {
            userId_month_year: {
                userId: session.user.id,
                month,
                year,
            },
        },
        create: {
            userId: session.user.id,
            amount,
            month,
            year,
            status: 'PENDING',
            proofUrl: url,
            proofPath: path,
        },
        update: {
            amount,
            status: 'PENDING',
            proofUrl: url,
            proofPath: path,
            confirmedBy: null,
            confirmedAt: null,
        },
    });

    return NextResponse.json(payment, { status: 201 });
}

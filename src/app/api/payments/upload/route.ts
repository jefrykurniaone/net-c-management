import { auth } from '@/lib/auth';
import { uploadPaymentProof } from '@/lib/supabase';
import {
    upsertMonthlyPayment,
    resolveMonthlyOwed,
    resolveSessionCharge,
    registerAndPaySession,
    SessionFullError,
    type SessionCharge,
} from '@/lib/payments';
import { assertMembership } from '@/lib/ekskul';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
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
const MAX_FUTURE_YEARS = 1;
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const SESSION_FULL_STATUS = 409;

interface UploadCtx {
    userId: string;
    formData: FormData;
    t: Dictionary;
}

// POST /api/payments/upload — upload a proof image and create/update a Payment.
// A `sessionId` in the form switches to the per-session pre-pay-on-register flow
// (SESSION Payment + REGISTERED Attendance, atomic); otherwise it is the monthly
// flow. Both compute the amount server-side (AD-2) and gate on the member's
// effective payment mode (AD-7).
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const t = getDictionary(await getLocale());
    const formData = await req.formData();
    const sessionId = (formData.get('sessionId') as string | null) ?? '';
    const ctx: UploadCtx = { userId: session.user.id, formData, t };

    return sessionId
        ? handleSessionUpload(ctx, sessionId)
        : handleMonthlyUpload(ctx);
}

/** Shared proof-file validation; returns an error response or null when valid. */
function validateProofFile(file: File | null, t: Dictionary): NextResponse | null {
    if (!file) {
        return NextResponse.json({ error: t.validation.fileRequired }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: t.validation.fileTypeInvalid }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: t.validation.fileSizeProof }, { status: 400 });
    }
    return null;
}

// ─── Monthly flow (Story 3.4 — unchanged behavior) ───────────────────────────
async function handleMonthlyUpload({ userId, formData, t }: UploadCtx) {
    const file = formData.get('file') as File | null;
    const ekskulId = (formData.get('ekskulId') as string | null) ?? '';
    const month = Number.parseInt(formData.get('month') as string);
    const year = Number.parseInt(formData.get('year') as string);

    if (!ekskulId) {
        return NextResponse.json({ error: t.validation.ekskulRequired }, { status: 400 });
    }
    if (!(await assertMembership(userId, ekskulId))) {
        return NextResponse.json({ error: t.ekskul.notMember }, { status: 403 });
    }
    const maxYear = new Date().getFullYear() + MAX_FUTURE_YEARS;
    if (!month || month < MIN_MONTH || month > MAX_MONTH || !year || year < MIN_PAYMENT_YEAR || year > maxYear) {
        return NextResponse.json({ error: t.validation.monthYearInvalid }, { status: 400 });
    }

    // Resolve the owed amount + mode gate BEFORE any storage write, so a rejected
    // request never leaves an orphaned proof object. The client amount is ignored.
    const owed = await resolveMonthlyOwed({ userId, ekskulId, month, year });
    if (!owed.ok) {
        const error = owed.reason === 'noFee' ? t.payments.noMonthlyFee : t.payments.notMonthlyMode;
        return NextResponse.json({ error }, { status: owed.reason === 'noFee' ? 400 : 403 });
    }

    const fileError = validateProofFile(file, t);
    if (fileError) return fileError;

    const { url, path } = await storeProof(file!, userId, year, month);
    const payment = await upsertMonthlyPayment({
        userId,
        ekskulId,
        amount: owed.amount,
        month,
        year,
        proofUrl: url,
        proofPath: path,
    });
    return NextResponse.json(payment, { status: 201 });
}

// ─── Per-session flow (Story 3.5 — pre-pay-on-register, atomic) ───────────────
async function handleSessionUpload({ userId, formData, t }: UploadCtx, sessionId: string) {
    const file = formData.get('file') as File | null;

    // Gate BEFORE storage: wrong mode / no fee / closed session never orphan an
    // uploaded object (AD-14). Amount is the Session's fee, server-sourced (AD-2).
    const charge = await resolveSessionCharge({ userId, sessionId });
    if (!charge.ok) return sessionChargeError(charge.reason, t);

    const fileError = validateProofFile(file, t);
    if (fileError) return fileError;

    const { month, year, session, amount } = charge;
    const { url, path } = await storeProof(file!, userId, year, month);

    try {
        const payment = await registerAndPaySession({
            userId,
            session,
            amount,
            month,
            year,
            proofUrl: url,
            proofPath: path,
        });
        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        // Only the in-transaction capacity race can reject after the upload — the
        // orphaned object is accepted pre-launch (AD-14/NFR-3).
        if (error instanceof SessionFullError) {
            return NextResponse.json({ error: t.sessions.sessionFull }, { status: SESSION_FULL_STATUS });
        }
        throw error;
    }
}

/** Map a per-session gate rejection to its route status + message. */
function sessionChargeError(reason: Extract<SessionCharge, { ok: false }>['reason'], t: Dictionary) {
    const map = {
        notFound: { status: 404, error: t.sessions.notFound },
        notMember: { status: 403, error: t.ekskul.notMember },
        notRegisterable: { status: 400, error: t.sessions.notRegisterable },
        notPerSession: { status: 403, error: t.payments.notPerSessionMode },
        noFee: { status: 400, error: t.payments.noSessionFee },
    } as const;
    const { status, error } = map[reason];
    return NextResponse.json({ error }, { status });
}

/** Upload the proof buffer to the payment-proofs bucket under a period path. */
async function storeProof(file: File, userId: string, year: number, month: number) {
    const ext = file.type.split('/')[1];
    const storagePath = `${userId}/${year}-${String(month).padStart(2, '0')}-${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    return uploadPaymentProof(buffer, storagePath, file.type);
}

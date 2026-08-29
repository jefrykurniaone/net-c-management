import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { releaseExpiredHolds } from '@/lib/holds';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import {
    LIVE_PAYMENT_STATUSES,
    resolveSessionRefusal,
    SEAT_HOLDING_STATUSES,
    toSessionLockFacts,
    type SessionLockFacts,
    type SessionPatch,
    type SessionRefusal,
    type StoredSession,
} from '@/lib/session-lock';
import { buildUpdateSessionSchema } from '@/lib/validations/session';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

// GET /api/sessions/[id]
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }

    const { id } = await params;

    const activitySession = await prisma.activitySession.findUnique({
        where: { id },
        include: {
            activity: {
                select: {
                    id: true,
                    name: true,
                    bankName: true,
                    bankAccountNumber: true,
                    bankAccountHolder: true,
                },
            },
            _count: { select: { attendances: true } },
            attendances: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!activitySession) {
        return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 },
        );
    }

    return NextResponse.json(activitySession);
}

/** HTTP for "the request is well-formed, and this Session refuses it". */
const REFUSED_STATUS = 409;

/**
 * The stored row the locking rules read, and the two counts they turn on. The
 * counts are taken **after** the hold sweep, so a lapsed hold neither locks a
 * fee nor floors capacity.
 */
const LOCK_SELECT = {
    title: true,
    date: true,
    startTime: true,
    endTime: true,
    location: true,
    maxPlayers: true,
    fee: true,
    notes: true,
    status: true,
    _count: {
        select: {
            attendances: { where: { status: { in: SEAT_HOLDING_STATUSES } } },
            payments: { where: { status: { in: LIVE_PAYMENT_STATUSES } } },
        },
    },
} satisfies Prisma.ActivitySessionSelect;

/** The refusal in the caller's own language, naming the reason and the fix. */
function refusalMessage(t: Dictionary, refusal: SessionRefusal): string {
    switch (refusal.reason) {
        case 'SESSION_CLOSED':
            return t.admin.refusedSessionClosed;
        case 'FEE_LOCKED':
            return t.admin.refusedFeeLocked;
        case 'CAPACITY_BELOW_HELD':
            return t.admin.refusedCapacityBelowHeld.replaceAll(
                '{n}',
                String(refusal.heldSeats),
            );
    }
}

function writeSession(id: string, patch: SessionPatch) {
    const { date, ...rest } = patch;
    return prisma.activitySession.update({
        where: { id },
        data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
}

/**
 * A body that is not JSON is a malformed request, not a server fault: `null`
 * falls through to zod, which refuses it with the same 400 every other bad
 * payload gets rather than throwing a 500 past the branch that exists to say so.
 */
async function readJsonBody(req: Request): Promise<unknown> {
    try {
        return await req.json();
    } catch {
        return null;
    }
}

/** The stored row and the body, or the response that says why neither is here. */
type PatchInput = Readonly<{
    stored: StoredSession;
    facts: SessionLockFacts;
    patch: SessionPatch;
}>;

/**
 * Everything the locking rules are decided against. The hold sweep runs before
 * the counts are taken, never after, so an expired hold is not still holding a
 * Seat when the fee and capacity rules read one.
 */
async function readPatchInput(
    req: Request,
    id: string,
    t: Dictionary,
): Promise<PatchInput | NextResponse> {
    await releaseExpiredHolds();
    const existing = await prisma.activitySession.findUnique({
        where: { id },
        select: LOCK_SELECT,
    });
    if (!existing) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const body = await readJsonBody(req);
    const parsed = buildUpdateSessionSchema(t).safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }
    const { _count, ...stored } = existing;
    return {
        stored,
        patch: parsed.data,
        facts: toSessionLockFacts(_count, stored.status),
    };
}

// PATCH /api/sessions/[id] — admin only
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const t = getDictionary(await getLocale());
    const { id } = await params;

    const input = await readPatchInput(req, id, t);
    if (input instanceof NextResponse) {
        return input;
    }

    // The locks are the stored row's business, never zod's: what they turn on is
    // the money behind this Session and where it stands, not the body's shape.
    const refusal = resolveSessionRefusal(input.stored, input.patch, input.facts);
    if (refusal) {
        return NextResponse.json(
            { error: refusalMessage(t, refusal), reason: refusal.reason },
            { status: REFUSED_STATUS },
        );
    }

    const updated = await writeSession(id, input.patch);

    // The correctness case: a cached `/` cannot re-filter, so a cancel or a
    // reschedule has to expire the page that still advertises the old date.
    invalidatePublicLanding();
    return NextResponse.json(updated);
}

// DELETE /api/sessions/[id] — admin only
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.activitySession.delete({ where: { id } });

    invalidatePublicLanding();
    return NextResponse.json({ success: true });
}

import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { prisma } from '@/lib/prisma';
import { releaseExpiredHolds } from '@/lib/holds';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import type { SessionRefusal } from '@/lib/session-lock';
import {
    updateSessionLocked,
    type SessionWriteRefusal,
} from '@/lib/session-writes';
import { buildUpdateSessionSchema } from '@/lib/validations/session';
import { invalidatePublicLanding } from '@/lib/public-landing';
import { isAdminRole } from '@/lib/utils';
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

/** The 404 or the 409 a locked write came back with, and nothing else. */
function notWrittenResponse(
    t: Dictionary,
    outcome: SessionWriteRefusal,
    toMessage: (t: Dictionary, refusal: SessionRefusal) => string,
): NextResponse {
    if (outcome.kind === 'missing') {
        return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 },
        );
    }
    return NextResponse.json(
        {
            error: toMessage(t, outcome.refusal),
            reason: outcome.refusal.reason,
        },
        { status: REFUSED_STATUS },
    );
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

    const parsed = buildUpdateSessionSchema(t).safeParse(await readJsonBody(req));
    if (!parsed.success) {
        return NextResponse.json(
            { error: t.common.error, details: parsed.error.issues },
            { status: 400 },
        );
    }

    // The sweep runs before the lock, never inside it: releasing a lapsed hold
    // is its own write with emails queued behind it, and the counts the locking
    // rules read are taken after it. The locks themselves are the stored row's
    // business, never zod's — what they turn on is the money behind this Session
    // and where it stands, not the body's shape.
    await releaseExpiredHolds();
    const outcome = await updateSessionLocked(id, parsed.data);
    if (outcome.kind !== 'updated') {
        return notWrittenResponse(t, outcome, refusalMessage);
    }

    // The correctness case: a cached `/` cannot re-filter, so a cancel or a
    // reschedule has to expire the page that still advertises the old date.
    invalidatePublicLanding();
    return NextResponse.json(outcome.session);
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

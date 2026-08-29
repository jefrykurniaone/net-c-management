import { auth } from '@/lib/auth';
import { admissionDenied, isAdmittedSession } from '@/lib/admission';
import { getLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionaries';
import {
    duesRateRefusalMessage,
    duesRateRefusalStatus,
    withdrawQueuedDuesRate,
} from '@/lib/dues-rate-writes';
import { isAdminRole } from '@/lib/utils';
import { NextResponse } from 'next/server';

const DECIMAL_RADIX = 10;

/**
 * A whole run of digits and nothing else. `Number.parseInt` stops at the first
 * character it cannot read, so `202610xyz` would otherwise parse to `202610` and
 * the 400 below would never fire on a request that plainly means nothing.
 */
const PERIOD_KEY_PATTERN = /^\d+$/;

/**
 * DELETE /api/activities/[id]/dues-rate?effectiveFrom=YYYYMM — withdraw the
 * queued Dues change (admin and owner only).
 *
 * Withdrawing is its own route rather than a flag on the Activity update for
 * one reason that shows up in the form: the Withdraw tile sits beneath the Dues
 * field, in the middle of a dialog whose other fields may be half-edited.
 * Folding it into `PATCH /api/activities/[id]` would make pressing it save every
 * one of those edits too, or send a body carefully stripped of them — a rule
 * about money decided by which keys a form remembered to omit.
 *
 * The caller names the Period it means, so a change whose month arrived while
 * the page was open is answered with the freeze rather than having some other
 * row deleted in its place. Every arrived Period is refused here — the
 * beginning-of-time row included — for an Admin and for the Owner alike:
 * immutability is a property of the Period, never of who is asking.
 */
export async function DELETE(
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
    const raw = new URL(req.url).searchParams.get('effectiveFrom');
    if (raw === null || !PERIOD_KEY_PATTERN.test(raw)) {
        return NextResponse.json({ error: t.common.error }, { status: 400 });
    }

    const outcome = await withdrawQueuedDuesRate({
        activityId: id,
        effectiveFrom: Number.parseInt(raw, DECIMAL_RADIX),
    });
    if (outcome.kind === 'missing') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (outcome.kind === 'refused') {
        return NextResponse.json(
            {
                error: duesRateRefusalMessage(outcome.reason, t),
                code: outcome.reason,
            },
            { status: duesRateRefusalStatus(outcome.reason) },
        );
    }
    return NextResponse.json({ success: true });
}

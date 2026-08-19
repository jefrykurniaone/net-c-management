import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/locale';
import { isEmailConfigured, sendAdmission } from '@/lib/email';
import {
    admissionDenied,
    isAdmittedSession,
    WAITING_APPLICANT_WHERE,
} from '@/lib/admission';
import { isAdminRole } from '@/lib/utils';
import { after, NextResponse } from 'next/server';

/**
 * The Admin's act on an Applicant: **admit** or **decline**.
 *
 * Admitting sets `User.admittedAt` and emails the Applicant — the only thing
 * that brings back someone who closed the tab. Declining sets `isActive = false`
 * and leaves `admittedAt` null, which drops them out of the queue
 * (`admittedAt IS NULL AND isActive`) and turns their waiting page into a
 * closed door. Nothing is deleted: the record of who asked survives, and the
 * same Google account signing in again would only reappear as the same declined
 * row, so deletion was never a gate.
 *
 * Not folded into `PATCH /api/users`, which owns role and `isActive` for
 * *members*: decline shares that route's write but must not touch `admittedAt`,
 * and admit is a different act with an email behind it.
 */

type AdmissionAction = 'admit' | 'decline';

const CONFLICT = 409;

function isAdmissionAction(value: unknown): value is AdmissionAction {
    return value === 'admit' || value === 'decline';
}

/**
 * Best-effort, post-response, and never thrown — the same contract every other
 * send in this app has. The locale is the Admin's cookie: there is no per-user
 * locale column, so this is the same approximation the reserve and reminder
 * mails already make.
 */
function queueAdmissionEmail(
    applicant: Readonly<{ email: string | null; name: string | null }>,
): void {
    if (!isEmailConfigured() || !applicant.email) return;
    const to = applicant.email;
    const name = applicant.name ?? to;

    after(async () => {
        try {
            const [settings, locale] = await Promise.all([
                getSettings(),
                getLocale(),
            ]);
            await sendAdmission({
                to,
                name,
                communityName: settings.communityName,
                locale,
            });
        } catch (err) {
            console.error('[Admissions] admission email:', err);
        }
    });
}

// POST /api/users/admissions — admit or decline one Applicant (admin only)
export async function POST(req: Request) {
    const session = await auth();
    if (!isAdmittedSession(session)) {
        return admissionDenied(session);
    }
    if (!isAdminRole(session.user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await req.json()) as { id?: string; action?: string };
    if (!body.id || !isAdmissionAction(body.action)) {
        return NextResponse.json(
            { error: 'User id and action (admit|decline) required' },
            { status: 400 },
        );
    }

    // Only a waiting Applicant can be admitted or declined. This is what stops
    // "Decline" on a stale queue from revoking a member who was admitted by
    // another Admin in the meantime — `isActive = false` reads the same in the
    // column but means something else entirely on an admitted row.
    const applicant = await prisma.user.findFirst({
        where: { id: body.id, ...WAITING_APPLICANT_WHERE },
        select: { id: true, name: true, email: true },
    });
    if (!applicant) {
        return NextResponse.json(
            { error: 'Not waiting for a decision' },
            { status: CONFLICT },
        );
    }

    const updated = await prisma.user.update({
        where: { id: applicant.id },
        data:
            body.action === 'admit'
                ? { admittedAt: new Date() }
                : { isActive: false },
        select: { id: true, name: true, admittedAt: true, isActive: true },
    });

    if (body.action === 'admit') {
        queueAdmissionEmail(applicant);
    }

    return NextResponse.json(updated);
}

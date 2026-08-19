import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import type { Session } from 'next-auth';

/**
 * The admission gate. Joining this community is approval-gated: signing in with
 * Google makes you an **Applicant**, and an Admin **admits** or **declines** you.
 *
 * Two columns carry two different facts and are never collapsed into one:
 *
 * - `User.admittedAt` — null means *never admitted*. Set means an Admin let this
 *   person in, and records when.
 * - `User.isActive` — an Admin revoked this person.
 *
 * Their four combinations are the four states below, which is what lets the
 * roster tell three people waiting at the door from two who were thrown out.
 *
 * This module is deliberately free of database and `server-only` imports: it is
 * the one seam every enforcement layer reads (middleware, layout guards, API
 * handlers), and it is unit-tested.
 */

/** What the two columns mean together. */
export type AdmissionState =
    /** In. `admittedAt` set, not revoked. */
    | 'admitted'
    /** An Applicant waiting for a decision — the admission queue. */
    | 'waiting'
    /** An Admin reviewed this Applicant and did not admit them. */
    | 'declined'
    /** Was in, then revoked. Not an Applicant: they never go back in the queue. */
    | 'revoked';

/**
 * The admission queue: never admitted, not declined. Shared by the queue
 * surface and the admin nav badge so the two can never disagree.
 */
export const WAITING_APPLICANT_WHERE = {
    admittedAt: null,
    isActive: true,
} satisfies Prisma.UserWhereInput;

/** The four states, resolved from the two columns. */
export function resolveAdmissionState(
    user: Readonly<{ admittedAt: Date | null; isActive: boolean }>,
): AdmissionState {
    if (user.admittedAt === null) {
        return user.isActive ? 'waiting' : 'declined';
    }
    return user.isActive ? 'admitted' : 'revoked';
}

/**
 * Whether this session may reach anything past the door. Both columns are read:
 * an Applicant has not been let in yet, and a revoked member has been thrown
 * out — neither gets community data, and until this gate existed both did.
 *
 * A type predicate so callers narrow `session` and keep using `session.user.id`.
 */
export function isAdmittedSession(
    session: Session | null | undefined,
): session is Session {
    if (!session?.user?.id) return false;
    return session.user.isActive && session.user.isAdmitted;
}

/**
 * The API boundary's refusal — the third enforcement layer, and the one the
 * money is behind. Middleware covers page routes only (`proxy.ts` lists five
 * path prefixes; API routes fall outside that check), so without this an
 * Applicant redirected away from `/sessions` could still POST to
 * `/api/sessions/[id]/reserve`.
 *
 * 401 when there is nobody signed in, 403 when there is and they are not in:
 * the client cannot fix the second by signing in again.
 */
export function admissionDenied(
    session: Session | null | undefined,
): NextResponse {
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Not admitted' }, { status: 403 });
}

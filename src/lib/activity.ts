import 'server-only';
import { prisma } from './prisma';
import { Prisma, PaymentStatus, PaymentType, type Activity } from '@prisma/client';

/**
 * Server-only helpers for activity scoping. Used by member-facing queries and
 * route handlers to limit data to the activity a user belongs to.
 */

/**
 * Active activity ids the user is an active member of.
 * Returns an empty array if the user has no memberships.
 */
export async function getUserActivityIds(userId: string): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
        where: { userId, isActive: true, activity: { isActive: true } },
        select: { activityId: true },
    });
    return memberships.map((m) => m.activityId);
}

/**
 * All active activity, ordered by name. Used to populate filters and selects.
 */
export async function getActivities(): Promise<Activity[]> {
    return prisma.activity.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
}

/**
 * Join-on-register: activate (or create) the user's membership in an active
 * activity. Registering for a session implies joining its Activity, so the
 * session-register paths call this instead of rejecting non-members.
 * Returns false when the activity does not exist or is inactive.
 */
export async function ensureMembership(
    userId: string,
    activityId: string,
): Promise<boolean> {
    const activity = await prisma.activity.findFirst({
        where: { id: activityId, isActive: true },
        select: { id: true },
    });
    if (!activity) return false;

    const existing = await prisma.membership.findUnique({
        where: { userId_activityId: { userId, activityId } },
        select: { isActive: true },
    });
    if (existing?.isActive) return true;

    if (!existing) {
        try {
            await prisma.membership.create({
                data: { userId, activityId, isActive: true },
            });
            return true;
        } catch (err) {
            // Concurrent join won the race — the row exists now; fall through
            // to the reactivation write below.
            if (
                !(err instanceof Prisma.PrismaClientKnownRequestError) ||
                err.code !== 'P2002'
            ) {
                throw err;
            }
        }
    }

    // Re-joining after a leave is a fresh start: the previous payment-mode
    // selection (and any queued switch) no longer applies — the member picks a
    // mode again at join time (register free = Monthly, pay page = Per-session).
    await prisma.membership.update({
        where: { userId_activityId: { userId, activityId } },
        data: {
            isActive: true,
            paymentMode: null,
            effectiveFrom: 0,
            pendingMode: null,
            pendingEffectiveFrom: null,
        },
    });
    return true;
}

/**
 * Whether the user is an active member of the given activity.
 */
export async function assertMembership(
    userId: string,
    activityId: string,
): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
        where: { userId_activityId: { userId, activityId } },
        select: { isActive: true },
    });
    return membership?.isActive ?? false;
}

/**
 * Member self-cancel of an activity membership. Deactivates the membership and,
 * in the same transaction, releases every UPCOMING seat the member has not
 * already paid-and-confirmed for that activity — unpaid holds, monthly-funded
 * seats, and PENDING per-session reservations are deleted so their capacity
 * returns to the pool (no ghost seats). A future CONFIRMED per-session seat is
 * kept (the member paid for that specific session and an admin verified it);
 * past attendance and paid MONTHLY dues rows are left untouched (history / no
 * refund). Re-joining later starts fresh — see `ensureMembership`.
 */
export async function leaveActivity(
    userId: string,
    activityId: string,
): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
        await tx.membership.updateMany({
            where: { userId, activityId },
            data: { isActive: false },
        });

        // Seats kept: future sessions with a CONFIRMED per-session payment.
        const confirmed = await tx.payment.findMany({
            where: {
                userId,
                activityId,
                type: PaymentType.SESSION,
                status: PaymentStatus.CONFIRMED,
                session: { date: { gte: today } },
            },
            select: { sessionId: true },
        });
        const kept = new Set(
            confirmed
                .map((p) => p.sessionId)
                .filter((sessionId): sessionId is string => sessionId !== null),
        );

        const seats = await tx.attendance.findMany({
            where: { userId, session: { activityId, date: { gte: today } } },
            select: { sessionId: true },
        });
        const release = seats
            .map((s) => s.sessionId)
            .filter((sessionId) => !kept.has(sessionId));
        if (release.length === 0) return;

        // Drop the unpaid/unconfirmed charge first, then free the seat.
        await tx.payment.deleteMany({
            where: { userId, type: PaymentType.SESSION, sessionId: { in: release } },
        });
        await tx.attendance.deleteMany({
            where: { userId, sessionId: { in: release } },
        });
    });
}

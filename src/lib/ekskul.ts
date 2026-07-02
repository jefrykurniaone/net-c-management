import 'server-only';
import { prisma } from './prisma';
import { Prisma, type Ekskul } from '@prisma/client';

/**
 * Server-only helpers for ekskul scoping. Used by member-facing queries and
 * route handlers to limit data to the ekskul a user belongs to.
 */

/**
 * Active ekskul ids the user is an active member of.
 * Returns an empty array if the user has no memberships.
 */
export async function getUserEkskulIds(userId: string): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
        where: { userId, isActive: true, ekskul: { isActive: true } },
        select: { ekskulId: true },
    });
    return memberships.map((m) => m.ekskulId);
}

/**
 * All active ekskul, ordered by name. Used to populate filters and selects.
 */
export async function getEkskuls(): Promise<Ekskul[]> {
    return prisma.ekskul.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
}

/**
 * Join-on-register: activate (or create) the user's membership in an active
 * ekskul. Registering for a session implies joining its Activity, so the
 * session-register paths call this instead of rejecting non-members.
 * Returns false when the ekskul does not exist or is inactive.
 */
export async function ensureMembership(
    userId: string,
    ekskulId: string,
): Promise<boolean> {
    const ekskul = await prisma.ekskul.findFirst({
        where: { id: ekskulId, isActive: true },
        select: { id: true },
    });
    if (!ekskul) return false;

    const existing = await prisma.membership.findUnique({
        where: { userId_ekskulId: { userId, ekskulId } },
        select: { isActive: true },
    });
    if (existing?.isActive) return true;

    if (!existing) {
        try {
            await prisma.membership.create({
                data: { userId, ekskulId, isActive: true },
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
        where: { userId_ekskulId: { userId, ekskulId } },
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
 * Whether the user is an active member of the given ekskul.
 */
export async function assertMembership(
    userId: string,
    ekskulId: string,
): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
        where: { userId_ekskulId: { userId, ekskulId } },
        select: { isActive: true },
    });
    return membership?.isActive ?? false;
}

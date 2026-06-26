import 'server-only';
import { prisma } from './prisma';
import type { Ekskul } from '@prisma/client';

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

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Role } from '@prisma/client';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Whether a role has admin-level access. ADMIN and OWNER share the same
 * privileges everywhere except Manage Members, where OWNER accounts are
 * immutable (see docs/owner-role-immutability.md).
 */
export function isAdminRole(role: Role | string | null | undefined): boolean {
    return role === 'ADMIN' || role === 'OWNER';
}

/**
 * Derive a short abbreviation (≤ 2 chars) from a community name.
 * e.g. "PB Net-C" → "PB", "Badminton Club" → "BC"
 */
export function communityAbbr(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return words
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

export function sessionStatusVariant(
    status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'ONGOING') return 'default';
    if (status === 'CANCELLED') return 'destructive';
    if (status === 'COMPLETED') return 'outline';
    return 'secondary';
}

export function paymentStatusVariant(
    status: string,
): 'default' | 'secondary' | 'destructive' {
    if (status === 'CONFIRMED') return 'default';
    if (status === 'REJECTED') return 'destructive';
    return 'secondary';
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
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

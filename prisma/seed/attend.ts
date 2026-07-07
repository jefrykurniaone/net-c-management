/** Shared attendance helpers: deterministic ordering + row creation. */
import { AttendanceStatus } from '@prisma/client';
import { prisma } from './client';

export interface Attendee {
    email: string;
    status: AttendanceStatus;
    /** Set for unpaid reservation holds; null/undefined = permanent seat. */
    holdExpiresAt?: Date | null;
}

/** Deterministic, increasing createdAt so player-list order is stable. */
const ORDER_BASE = new Date('2020-01-01T00:00:00Z').getTime();
let attendanceSeq = 0;
function nextCreatedAt(): Date {
    return new Date(ORDER_BASE + attendanceSeq++ * 1000);
}

export function going(email: string): Attendee {
    return { email, status: AttendanceStatus.REGISTERED };
}

export async function seedAttendances(
    sessionId: string,
    attendees: Attendee[],
    idByEmail: Map<string, string>,
) {
    for (const a of attendees) {
        const userId = idByEmail.get(a.email);
        if (!userId) throw new Error(`Missing seeded user for ${a.email}`);
        await prisma.attendance.create({
            data: {
                userId,
                sessionId,
                status: a.status,
                holdExpiresAt: a.holdExpiresAt ?? null,
                createdAt: nextCreatedAt(),
            },
        });
    }
}

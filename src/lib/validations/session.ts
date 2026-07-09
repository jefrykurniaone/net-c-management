import { z } from 'zod';
import { SessionStatus } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const sessionStatusValues = Object.values(SessionStatus) as [
    SessionStatus,
    ...SessionStatus[],
];

export function buildCreateSessionSchema(t: Dictionary) {
    return z
        .object({
            activityId: z.string().min(1, t.validation.activityRequired),
            title: z
                .string()
                .min(3, t.validation.sessionTitleMin)
                .max(200, t.validation.sessionTitleMax),
            date: z.string().min(1, t.validation.sessionDateRequired),
            startTime: z
                .string()
                .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, t.validation.sessionTimeFormat),
            endTime: z
                .string()
                .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, t.validation.sessionTimeFormat),
            location: z
                .string()
                .min(3, t.validation.sessionLocationMin)
                .max(200, t.validation.sessionLocationMax),
            maxPlayers: z
                .number({ error: t.validation.maxPlayersRequired })
                .int()
                .min(2, t.validation.sessionMaxPlayersMin)
                .max(100, t.validation.sessionMaxPlayersMax),
            fee: z
                .number({ error: t.validation.feeRequired })
                .int()
                .min(0, t.validation.sessionFeeMin),
            notes: z.string().max(1000).optional(),
        })
        // HH:MM 24h strings sort lexicographically, so a plain string compare
        // orders the times. Reject a zero-length or inverted slot.
        .refine((d) => d.endTime > d.startTime, {
            message: t.validation.sessionEndAfterStart,
            path: ['endTime'],
        });
}

export type CreateSessionFormData = z.infer<ReturnType<typeof buildCreateSessionSchema>>;

export function buildUpdateSessionSchema(t: Dictionary) {
    return z.object({
        title: z
            .string()
            .min(3, t.validation.sessionTitleMin)
            .max(200, t.validation.sessionTitleMax)
            .optional(),
        date: z.string().min(1, t.validation.sessionDateRequired).optional(),
        startTime: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, t.validation.sessionTimeFormat)
            .optional(),
        endTime: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, t.validation.sessionTimeFormat)
            .optional(),
        location: z
            .string()
            .min(3, t.validation.sessionLocationMin)
            .max(200, t.validation.sessionLocationMax)
            .optional(),
        maxPlayers: z
            .number({ error: t.validation.maxPlayersRequired })
            .int()
            .min(2, t.validation.sessionMaxPlayersMin)
            .max(100, t.validation.sessionMaxPlayersMax)
            .optional(),
        fee: z
            .number({ error: t.validation.feeRequired })
            .int()
            .min(0, t.validation.sessionFeeMin)
            .optional(),
        notes: z.string().max(1000).optional(),
        status: z.enum(sessionStatusValues).optional(),
    })
        // Only enforce ordering when the edit actually sends both times; a
        // partial update that omits one leaves the stored value untouched.
        .refine(
            (d) =>
                d.startTime === undefined ||
                d.endTime === undefined ||
                d.endTime > d.startTime,
            {
                message: t.validation.sessionEndAfterStart,
                path: ['endTime'],
            },
        );
}

export type UpdateSessionFormData = z.infer<ReturnType<typeof buildUpdateSessionSchema>>;

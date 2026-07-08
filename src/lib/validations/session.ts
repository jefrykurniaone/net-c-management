import { z } from 'zod';
import { SessionStatus } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const sessionStatusValues = Object.values(SessionStatus) as [
    SessionStatus,
    ...SessionStatus[],
];

export function buildCreateSessionSchema(t: Dictionary) {
    return z.object({
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
    });
}

export type UpdateSessionFormData = z.infer<ReturnType<typeof buildUpdateSessionSchema>>;

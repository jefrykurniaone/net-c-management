import { z } from 'zod';
import { PlayPosition, PlayerLevel } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const playPositionValues = Object.values(PlayPosition) as [
    PlayPosition,
    ...PlayPosition[],
];
const playerLevelValues = Object.values(PlayerLevel) as [
    PlayerLevel,
    ...PlayerLevel[],
];

export function buildOnboardingSchema(t: Dictionary) {
    return z.object({
        name: z
            .string()
            .min(2, t.validation.nameMin)
            .max(100, t.validation.nameMax),
        phone: z
            .string()
            .min(9, t.validation.phoneMin)
            .max(15, t.validation.phoneMax)
            .regex(/^[0-9+]+$/, t.validation.phoneFormat),
        playPosition: z.enum(playPositionValues, {
            message: t.validation.playPositionRequired,
        }),
        playerLevel: z.enum(playerLevelValues, {
            message: t.validation.playerLevelRequired,
        }),
    });
}

export type OnboardingFormData = z.infer<ReturnType<typeof buildOnboardingSchema>>;

export function buildUpdateProfileSchema(t: Dictionary) {
    return buildOnboardingSchema(t).partial().extend({
        name: z
            .string()
            .min(2, t.validation.nameMin)
            .max(100, t.validation.nameMax)
            .optional(),
    });
}

export type UpdateProfileFormData = z.infer<ReturnType<typeof buildUpdateProfileSchema>>;

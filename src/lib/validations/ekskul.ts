import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function buildCreateEkskulSchema(t: Dictionary) {
    return z.object({
        name: z
            .string()
            .min(2, t.validation.ekskulNameMin)
            .max(100, t.validation.ekskulNameMax),
        slug: z
            .string()
            .min(1, t.validation.ekskulSlugRequired)
            .max(50)
            .regex(SLUG_REGEX, t.validation.ekskulSlugFormat),
        color: z.string().regex(HEX_COLOR_REGEX, t.validation.ekskulColorFormat),
        description: z.string().max(1000).optional(),
        defaultFee: z.number().int().min(0, t.validation.sessionFeeMin),
        defaultLocation: z.string().max(200).optional(),
        maxPlayers: z
            .number()
            .int()
            .min(2, t.validation.sessionMaxPlayersMin)
            .max(100, t.validation.sessionMaxPlayersMax),
        adminWhatsapp: z.string().max(20).optional(),
    });
}

export type CreateEkskulFormData = z.infer<
    ReturnType<typeof buildCreateEkskulSchema>
>;

export function buildUpdateEkskulSchema(t: Dictionary) {
    return buildCreateEkskulSchema(t).partial().extend({
        isActive: z.boolean().optional(),
    });
}

export type UpdateEkskulFormData = z.infer<
    ReturnType<typeof buildUpdateEkskulSchema>
>;

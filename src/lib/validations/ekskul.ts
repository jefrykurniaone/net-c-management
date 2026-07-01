import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Base object shape for an Activity (Ekskul). Kept as a plain object schema so
 * the create builder can add a cross-field refine while the update builder can
 * still `.partial()` it (a refined schema is a ZodEffects and has no `.partial`).
 */
function ekskulObjectSchema(t: Dictionary) {
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
        // Explicit-required money fields — a blank submit is a validation error,
        // never a silent 0 (UX-DR14, FR-8). `min(0)` still allows a deliberate 0.
        monthlyFee: z
            .number({ error: t.validation.feeRequired })
            .int()
            .min(0, t.validation.sessionFeeMin),
        sessionFee: z
            .number({ error: t.validation.feeRequired })
            .int()
            .min(0, t.validation.sessionFeeMin),
        allowsMonthly: z.boolean(),
        allowsPerSession: z.boolean(),
        defaultLocation: z.string().max(200).optional(),
        maxPlayers: z
            .number()
            .int()
            .min(2, t.validation.sessionMaxPlayersMin)
            .max(100, t.validation.sessionMaxPlayersMax),
        adminWhatsapp: z.string().max(20).optional(),
    });
}

/**
 * At least one payment mode must be enabled (FR-9, AD-8). Fails only when BOTH
 * flags are explicitly `false`, so a partial update that omits the mode keys
 * (e.g. toggling only `isActive`) still passes.
 */
function bothModesDisabled(data: {
    allowsMonthly?: boolean;
    allowsPerSession?: boolean;
}): boolean {
    return data.allowsMonthly === false && data.allowsPerSession === false;
}

export function buildCreateEkskulSchema(t: Dictionary) {
    return ekskulObjectSchema(t).refine((d) => !bothModesDisabled(d), {
        error: t.validation.paymentModeAtLeastOne,
        path: ['paymentModes'],
    });
}

export type CreateEkskulFormData = z.infer<
    ReturnType<typeof buildCreateEkskulSchema>
>;

export function buildUpdateEkskulSchema(t: Dictionary) {
    return ekskulObjectSchema(t)
        .partial()
        .extend({ isActive: z.boolean().optional() })
        .refine((d) => !bothModesDisabled(d), {
            error: t.validation.paymentModeAtLeastOne,
            path: ['paymentModes'],
        });
}

export type UpdateEkskulFormData = z.infer<
    ReturnType<typeof buildUpdateEkskulSchema>
>;

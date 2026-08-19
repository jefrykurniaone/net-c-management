import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LAST_WEEKDAY = 6;
const MAX_MIN_MEMBERS = 100;

/**
 * Base object shape for an Activity (Activity). Kept as a plain object schema so
 * the create builder can add a cross-field refine while the update builder can
 * still `.partial()` it (a refined schema is a ZodEffects and has no `.partial`).
 */
function activityObjectSchema(t: Dictionary) {
    return z.object({
        name: z
            .string()
            .min(2, t.validation.activityNameMin)
            .max(100, t.validation.activityNameMax),
        slug: z
            .string()
            .min(1, t.validation.activitySlugRequired)
            .max(50)
            .regex(SLUG_REGEX, t.validation.activitySlugFormat),
        // Optional: the livery is the Activity's initial on a tile, so no
        // surface supplies a colour any more and a create simply omits it —
        // the column's own default covers the rows still carrying one. The
        // field and this rule go when the column is dropped.
        color: z
            .string()
            .regex(HEX_COLOR_REGEX, t.validation.activityColorFormat)
            .optional(),
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
        // Cost-sharing minimum: paying members needed per session; 0 = none.
        minMembers: z
            .number({ error: t.validation.minMembersRequired })
            .int()
            .min(0, t.validation.minMembersMin)
            .max(MAX_MIN_MEMBERS, t.validation.minMembersMax),
        // Weekly auto-generated sessions: 0 (Sunday) – 6 (Saturday), null = off.
        recurringDay: z
            .number()
            .int()
            .min(0)
            .max(LAST_WEEKDAY)
            .nullable()
            .optional(),
        recurringStartTime: z
            .string()
            .regex(TIME_REGEX, t.validation.sessionTimeFormat)
            .optional(),
        recurringEndTime: z
            .string()
            .regex(TIME_REGEX, t.validation.sessionTimeFormat)
            .optional(),
        defaultLocation: z.string().max(200).optional(),
        maxPlayers: z
            .number({ error: t.validation.maxPlayersRequired })
            .int()
            .min(2, t.validation.sessionMaxPlayersMin)
            .max(100, t.validation.sessionMaxPlayersMax),
        adminWhatsapp: z.string().max(20).optional(),
        // Bank account shown to members on the payment-upload pages. All
        // optional — an activity without one simply shows no transfer info.
        bankName: z.string().max(50).optional(),
        bankAccountNumber: z
            .string()
            .max(30)
            .regex(/^\d*$/, t.validation.bankAccountNumberFormat)
            .optional(),
        bankAccountHolder: z.string().max(100).optional(),
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

export function buildCreateActivitySchema(t: Dictionary) {
    return activityObjectSchema(t).refine((d) => !bothModesDisabled(d), {
        error: t.validation.paymentModeAtLeastOne,
        path: ['paymentModes'],
    });
}

export type CreateActivityFormData = z.infer<
    ReturnType<typeof buildCreateActivitySchema>
>;

export function buildUpdateActivitySchema(t: Dictionary) {
    return activityObjectSchema(t)
        .partial()
        .extend({ isActive: z.boolean().optional() })
        .refine((d) => !bothModesDisabled(d), {
            error: t.validation.paymentModeAtLeastOne,
            path: ['paymentModes'],
        });
}

export type UpdateActivityFormData = z.infer<
    ReturnType<typeof buildUpdateActivitySchema>
>;

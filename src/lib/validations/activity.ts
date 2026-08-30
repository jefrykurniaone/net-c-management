import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

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
        // No `color`: the livery is the Activity's initial on a tile, and the
        // column is gone. A stale client still posting one has it stripped
        // here rather than rejected, so a cached bundle keeps working.
        description: z.string().max(1000).optional(),
        // Explicit-required money fields — a blank submit is a validation error,
        // never a silent 0 (UX-DR14, FR-8). `min(0)` still allows a deliberate 0.
        // The initial Dues Rate: the create path writes this as the Activity's
        // beginning-of-time DuesRate row, never a column on Activity.
        duesAmount: z
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

/**
 * The Dues change an Activity update may carry: an amount, and the Billing
 * Period it starts from.
 *
 * `effectiveFrom` is a YYYYMM Period key and is checked only for being a whole
 * number here. Which Periods are *allowed* — next Period through twelve ahead,
 * and never one that has arrived — is a rule about the clock, so it lives in
 * `src/lib/dues-rate.ts` with the resolver and is enforced at the route, where
 * a refusal can name which of the two rules it broke.
 */
function duesRateObjectSchema(t: Dictionary) {
    return z.object({
        amount: z
            .number({ error: t.validation.feeRequired })
            .int()
            .min(0, t.validation.sessionFeeMin),
        effectiveFrom: z.number({ error: t.validation.feeRequired }).int(),
    });
}

/**
 * Updating an Activity no longer writes `duesAmount`: the Dues figure is a
 * `DuesRate` row against a Billing Period, so the field is omitted here rather
 * than rejected. A cached bundle still posting one has it stripped, the way a
 * stale `color` is — the create path still writes `duesAmount` as the
 * Activity's beginning-of-time rate.
 */
export function buildUpdateActivitySchema(t: Dictionary) {
    return activityObjectSchema(t)
        .omit({ duesAmount: true })
        .partial()
        .extend({
            isActive: z.boolean().optional(),
            duesRate: duesRateObjectSchema(t).optional(),
        })
        .refine((d) => !bothModesDisabled(d), {
            error: t.validation.paymentModeAtLeastOne,
            path: ['paymentModes'],
        });
}

export type UpdateActivityFormData = z.infer<
    ReturnType<typeof buildUpdateActivitySchema>
>;

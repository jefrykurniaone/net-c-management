import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Phones are WhatsApp contacts (wa.me links need the international form), so
 * store them as 628…: strip the +, convert a leading 0 to the 62 country code.
 * Runs in the shared schema, so the client form and the API normalize alike.
 */
function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

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
            .regex(/^[0-9+]+$/, t.validation.phoneFormat)
            .transform(normalizePhone),
        // At least one ekskul must be chosen to complete the profile.
        ekskulIds: z
            .array(z.string().min(1))
            .min(1, t.validation.ekskulMembershipRequired),
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
        ekskulIds: z.array(z.string().min(1)).optional(),
    });
}

export type UpdateProfileFormData = z.infer<ReturnType<typeof buildUpdateProfileSchema>>;

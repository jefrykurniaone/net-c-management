import { z } from 'zod';
import { PaymentMode } from '@prisma/client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Body schema for a member changing their payment mode on a Membership
 * (Story 3.3, FR-10). Only the chosen `mode` is accepted from the client — the
 * effective billing period is derived server-side (AD-2), never trusted from
 * the request, so a member cannot backdate a switch to rewrite what they owe.
 */
export function buildUpdatePaymentModeSchema(t: Dictionary) {
    return z.object({
        mode: z.enum(PaymentMode, { error: t.validation.paymentModeRequired }),
    });
}

export type UpdatePaymentModeFormData = z.infer<
    ReturnType<typeof buildUpdatePaymentModeSchema>
>;

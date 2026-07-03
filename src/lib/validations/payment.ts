import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function buildCreatePaymentSchema(t: Dictionary) {
    return z.object({
        userId: z.string().min(1, t.validation.userIdRequired),
        activityId: z.string().min(1, t.validation.activityRequired),
        amount: z.number().int().min(1, t.validation.paymentAmountMin),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2020).max(2100),
        notes: z.string().max(500).optional(),
    });
}

export type CreatePaymentFormData = z.infer<ReturnType<typeof buildCreatePaymentSchema>>;

export const uploadProofSchema = z.object({
    paymentId: z.string().min(1),
});

export type UploadProofFormData = z.infer<typeof uploadProofSchema>;

// A rejection must carry a reason (UX-DR12); confirmation keeps notes optional.
export function buildConfirmPaymentSchema(t: Dictionary) {
    return z
        .object({
            status: z.enum(['CONFIRMED', 'REJECTED']),
            notes: z.string().max(500).optional(),
        })
        .refine(
            (data) =>
                data.status !== 'REJECTED' || (data.notes?.trim().length ?? 0) > 0,
            { path: ['notes'], message: t.validation.rejectReasonRequired },
        );
}

export type ConfirmPaymentFormData = z.infer<
    ReturnType<typeof buildConfirmPaymentSchema>
>;

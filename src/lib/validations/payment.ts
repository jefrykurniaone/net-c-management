import { z } from 'zod';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function buildCreatePaymentSchema(t: Dictionary) {
    return z.object({
        userId: z.string().min(1, t.validation.userIdRequired),
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

export const confirmPaymentSchema = z.object({
    status: z.enum(['CONFIRMED', 'REJECTED']),
    notes: z.string().max(500).optional(),
});

export type ConfirmPaymentFormData = z.infer<typeof confirmPaymentSchema>;

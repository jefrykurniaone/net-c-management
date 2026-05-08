import { z } from "zod";

export const createPaymentSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  amount: z.number().int().min(1, "Jumlah pembayaran harus lebih dari 0"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  notes: z.string().max(500).optional(),
});

export type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;

export const uploadProofSchema = z.object({
  paymentId: z.string().min(1, "Payment ID wajib diisi"),
});

export type UploadProofFormData = z.infer<typeof uploadProofSchema>;

export const confirmPaymentSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED"]),
  notes: z.string().max(500).optional(),
});

export type ConfirmPaymentFormData = z.infer<typeof confirmPaymentSchema>;

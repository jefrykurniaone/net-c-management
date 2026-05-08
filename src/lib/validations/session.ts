import { z } from "zod";

export const createSessionSchema = z.object({
  title: z
    .string()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format waktu tidak valid (HH:MM)"),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format waktu tidak valid (HH:MM)"),
  location: z
    .string()
    .min(3, "Lokasi minimal 3 karakter")
    .max(200, "Lokasi maksimal 200 karakter"),
  maxPlayers: z
    .number()
    .int()
    .min(2, "Minimal 2 pemain")
    .max(100, "Maksimal 100 pemain"),
  fee: z
    .number()
    .int()
    .min(0, "Biaya tidak boleh negatif"),
  notes: z.string().max(1000).optional(),
});

export type CreateSessionFormData = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = createSessionSchema.partial().extend({
  status: z.enum(["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
});

export type UpdateSessionFormData = z.infer<typeof updateSessionSchema>;

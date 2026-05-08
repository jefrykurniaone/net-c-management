import { z } from "zod";
import { PlayPosition, PlayerLevel } from "@prisma/client";

export const onboardingSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  phone: z
    .string()
    .min(9, "Nomor WhatsApp tidak valid")
    .max(15, "Nomor WhatsApp tidak valid")
    .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh berisi angka"),
  playPosition: z.nativeEnum(PlayPosition, {
    errorMap: () => ({ message: "Pilih posisi bermain" }),
  }),
  playerLevel: z.nativeEnum(PlayerLevel, {
    errorMap: () => ({ message: "Pilih level bermain" }),
  }),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

export const updateProfileSchema = onboardingSchema.partial().extend({
  name: z.string().min(2).max(100).optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

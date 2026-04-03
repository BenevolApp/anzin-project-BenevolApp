import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "benevole", "beneficiaire"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const profileSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  role: userRoleSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable(),
  managedByAdminId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Profile = z.infer<typeof profileSchema>;

export const profileSensitiveSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  dateOfBirth: z.string().date().nullable(),
  isRsaRecipient: z.boolean(),
});
export type ProfileSensitive = z.infer<typeof profileSensitiveSchema>;

import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).trim().optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

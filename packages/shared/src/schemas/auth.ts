import { z } from 'zod';

export const registerSchema = z.object({
  displayName: z.string().min(2).max(100).trim(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').optional(),
});

export const deviceTokenSchema = z.object({
  fcmToken: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type DeviceTokenInput = z.infer<typeof deviceTokenSchema>;

import { z } from 'zod';
import { DEVICE_PLATFORMS } from '../constants.js';

export const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1).max(500),
  platform: z.enum(DEVICE_PLATFORMS),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

import { z } from 'zod';
import { geoPointSchema } from './common.js';

export const updateAvailabilitySchema = z.object({
  communityId: z.string().uuid(),
  isAvailable: z.boolean(),
  location: geoPointSchema.optional(),
});

export const locationUpdateSchema = z.object({
  communityId: z.string().uuid(),
  location: geoPointSchema,
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;

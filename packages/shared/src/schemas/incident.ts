import { z } from 'zod';
import { geoPointSchema } from './common.js';
import { INCIDENT_CATEGORIES } from '../constants.js';

export const createIncidentSchema = z.object({
  communityId: z.string().uuid(),
  category: z.enum(INCIDENT_CATEGORIES),
  location: geoPointSchema,
  description: z.string().max(500).optional(),
  isDrill: z.boolean().default(false),
});

export const respondToIncidentSchema = z.object({
  action: z.enum(['accept', 'decline', 'arrived', 'cancel']),
  location: geoPointSchema.optional(),
});

export const resolveIncidentSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type RespondToIncidentInput = z.infer<typeof respondToIncidentSchema>;
export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;

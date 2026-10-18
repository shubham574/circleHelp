import { z } from 'zod';
import { geoPointSchema } from './common.js';

export const createCommunitySchema = z.object({
  name: z.string().min(2).max(150).trim(),
  description: z.string().max(1000).optional(),
  location: geoPointSchema,
  radiusM: z.number().int().min(100).max(100000).default(5000),
});

export const joinCommunitySchema = z.object({
  inviteCode: z.string().min(4).max(32).trim(),
});

export const updateMemberSchema = z.object({
  status: z.enum(['approved', 'banned']).optional(),
  role: z.enum(['admin', 'coordinator', 'member']).optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type JoinCommunityInput = z.infer<typeof joinCommunitySchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

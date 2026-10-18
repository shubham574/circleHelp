import { z } from 'zod';
import { REPORT_REASONS } from '../constants.js';

export const createReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  incidentId: z.string().uuid().optional(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().min(10).max(1000).trim(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  adminNotes: z.string().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

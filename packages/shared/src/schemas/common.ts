import { z } from 'zod';

export const geoPointSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid();

export type GeoPointInput = z.infer<typeof geoPointSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;

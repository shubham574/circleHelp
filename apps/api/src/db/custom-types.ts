import { customType } from 'drizzle-orm/pg-core';
import type { GeoPoint } from '@nearhelp/shared';

/**
 * Format a GeoPoint { lng, lat } to PostGIS EWKT string: SRID=4326;POINT(lng lat)
 */
export function pointToDriver(value: GeoPoint): string {
  return `SRID=4326;POINT(${value.lng} ${value.lat})`;
}

/**
 * Parse a PostGIS Point EWKT/WKT string into a GeoPoint object { lng, lat }
 */
export function pointFromDriver(value: string): GeoPoint {
  const match = value.match(/POINT\(([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\)/i);
  if (match && match[1] && match[2]) {
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  }
  throw new Error(`Failed to parse PostGIS Point string: "${value}"`);
}

/**
 * Custom Drizzle type mapping PostGIS `geography(Point, 4326)` to TypeScript `{ lng: number, lat: number }`.
 */
export const geographyPoint = customType<{
  data: GeoPoint;
  driverData: string;
}>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value: GeoPoint): string {
    return pointToDriver(value);
  },
  fromDriver(value: string): GeoPoint {
    return pointFromDriver(value);
  },
});

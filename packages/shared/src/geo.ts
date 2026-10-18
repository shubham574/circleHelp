export interface GeoPoint {
  lng: number;
  lat: number;
}

/**
 * Calculate the haversine distance between two geographic points.
 * @returns Distance in meters
 */
export function haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(p1.lat);
  const φ2 = toRad(p2.lat);
  const Δφ = toRad(p2.lat - p1.lat);
  const Δλ = toRad(p2.lng - p1.lng);

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Estimate ETA based on straight-line distance.
 * @param distanceMeters Distance in meters
 * @param speedKmh Assumed speed in km/h (default: 30)
 * @returns Estimated time in minutes (rounded up)
 */
export function estimateETA(distanceMeters: number, speedKmh = 30): number {
  if (distanceMeters <= 0) return 0;
  const speedMpm = (speedKmh * 1000) / 60; // meters per minute
  return Math.ceil(distanceMeters / speedMpm);
}

/**
 * Validate that coordinates are within valid bounds.
 */
export function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    point.lng >= -180 &&
    point.lng <= 180 &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    Number.isFinite(point.lng) &&
    Number.isFinite(point.lat)
  );
}

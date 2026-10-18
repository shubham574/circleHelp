import { describe, it, expect } from 'vitest';
import { haversineDistance, estimateETA, isValidGeoPoint } from '../geo.js';

describe('Geo calculations', () => {
  // Test points: New Delhi India Gate to Connaught Place (~3.5 km)
  const indiaGate = { lat: 28.6129, lng: 77.2295 };
  const connaughtPlace = { lat: 28.6315, lng: 77.2167 };

  it('calculates accurate haversine distance between two coordinates', () => {
    const dist = haversineDistance(indiaGate, connaughtPlace);
    // Distance should be approximately 2400-2600 meters
    expect(dist).toBeGreaterThan(2300);
    expect(dist).toBeLessThan(2700);
  });

  it('calculates zero distance for identical coordinates', () => {
    const dist = haversineDistance(indiaGate, indiaGate);
    expect(dist).toBe(0);
  });

  it('estimates realistic ETA in minutes based on distance and speed', () => {
    // 2500m at 30km/h (500m/min) = 5 mins
    const eta = estimateETA(2500, 30);
    expect(eta).toBe(5);

    // 1000m at 30km/h = 2 mins (ceil of 2.0)
    expect(estimateETA(1000, 30)).toBe(2);

    // 0m should give 0 min
    expect(estimateETA(0, 30)).toBe(0);
  });

  it('validates coordinate boundaries correctly', () => {
    expect(isValidGeoPoint({ lat: 28.6, lng: 77.2 })).toBe(true);
    expect(isValidGeoPoint({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidGeoPoint({ lat: -91, lng: 0 })).toBe(false);
    expect(isValidGeoPoint({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidGeoPoint({ lat: 0, lng: -181 })).toBe(false);
    expect(isValidGeoPoint({ lat: NaN, lng: 0 })).toBe(false);
  });
});

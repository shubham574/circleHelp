import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';
import { runStaleAvailabilityPurgeJob } from '../jobs/purge-stale-availability.js';

describe('Availability & Background Location Heartbeats', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects POST /availability when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/availability',
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        isAvailable: true,
        location: { lat: 28.6139, lng: 77.2090 },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /availability with out-of-bounds latitude (>90)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/availability',
      headers: {
        authorization: 'Bearer mock_token_test_helper_01',
      },
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        isAvailable: true,
        location: { lat: 95.0, lng: 77.2090 }, // Invalid lat
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /availability/location when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/availability/location',
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        location: { lat: 28.6139, lng: 77.2090 },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /availability/location with invalid coordinates', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/availability/location',
      headers: {
        authorization: 'Bearer mock_token_test_helper_01',
      },
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        location: { lat: 28.6139, lng: 195.0 }, // Invalid lng > 180
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects GET /availability/:communityId when unauthenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/availability/123e4567-e89b-12d3-a456-426614174000',
    });

    expect(response.statusCode).toBe(401);
  });

  it('runs stale availability purge job safely', async () => {
    // In test environment, handles DB connection safely
    const count = await runStaleAvailabilityPurgeJob();
    expect(typeof count).toBe('number');
  });
});

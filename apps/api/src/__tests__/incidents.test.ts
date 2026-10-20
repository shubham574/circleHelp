import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';

describe('Incidents & SOS Flow (Milestone 6, 7 & 9)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects POST /incidents when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents',
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        category: 'medical',
        location: { lat: 28.6139, lng: 77.2090 },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /incidents with invalid category', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents',
      headers: {
        authorization: 'Bearer mock_token_test_user_01',
      },
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        category: 'alien_invasion', // Invalid category
        location: { lat: 28.6139, lng: 77.2090 },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /incidents with invalid coordinates (out of range)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents',
      headers: {
        authorization: 'Bearer mock_token_test_user_01',
      },
      payload: {
        communityId: '123e4567-e89b-12d3-a456-426614174000',
        category: 'medical',
        location: { lat: 195.0, lng: 77.2090 }, // Latitude > 90
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /incidents/:id/respond when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents/123e4567-e89b-12d3-a456-426614174000/respond',
      payload: {
        action: 'accept',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /incidents/:id/respond with invalid action', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents/123e4567-e89b-12d3-a456-426614174000/respond',
      headers: {
        authorization: 'Bearer mock_token_test_user_01',
      },
      payload: {
        action: 'flying_over', // Invalid action
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /incidents/:id/location when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents/123e4567-e89b-12d3-a456-426614174000/location',
      payload: {
        location: { lat: 28.6139, lng: 77.2090 },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /incidents/:id/cancel when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents/123e4567-e89b-12d3-a456-426614174000/cancel',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /incidents/:id/resolve when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/incidents/123e4567-e89b-12d3-a456-426614174000/resolve',
    });

    expect(response.statusCode).toBe(401);
  });
});

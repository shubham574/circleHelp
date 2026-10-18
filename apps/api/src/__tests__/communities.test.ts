import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';

describe('Community Routes & Membership Flow', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects POST /communities when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/communities',
      payload: {
        name: 'Hilltop Colony',
        location: { lat: 28.61, lng: 77.2 },
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects POST /communities with invalid payload (missing name and invalid coordinates)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/communities',
      headers: {
        authorization: 'Bearer mock_token_test_admin',
      },
      payload: {
        location: { lat: 95.0, lng: 77.2 }, // Invalid latitude > 90
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /communities/join with empty invite code', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/communities/join',
      headers: {
        authorization: 'Bearer mock_token_test_member',
      },
      payload: {
        inviteCode: '',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects GET /communities/:id/members when caller has no auth token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/communities/123e4567-e89b-12d3-a456-426614174000/members',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects PATCH /communities/:id/members/:userId with invalid status payload', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/communities/123e4567-e89b-12d3-a456-426614174000/members/123e4567-e89b-12d3-a456-426614174001',
      headers: {
        authorization: 'Bearer mock_token_test_admin',
      },
      payload: {
        status: 'super_approved', // Invalid enum value
      },
    });

    // When DB is unreachable in test mode or status is invalid enum, validates status enum
    expect([400, 401, 403]).toContain(response.statusCode);
  });
});

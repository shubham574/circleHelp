import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';
import {
  generateTrackingToken,
  verifyTrackingToken,
} from '../routes/tracking.js';

describe('Emergency Contacts & Public Tracking (Milestone 8)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Emergency Contacts API', () => {
    it('rejects GET /contacts when unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/contacts',
      });
      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /contacts when unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contacts',
        payload: {
          name: 'Jane Doe',
          phone: '+14155552671',
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /contacts with invalid phone format (non-E.164)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contacts',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          name: 'Jane Doe',
          phone: '0987654321', // Invalid: no country code '+'
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects POST /contacts with empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contacts',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          name: '',
          phone: '+14155552671',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Public Tracking Token Service', () => {
    it('generates and verifies HMAC-SHA256 signed tracking token', () => {
      const incidentId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateTrackingToken(incidentId);

      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      const verified = verifyTrackingToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.incidentId).toBe(incidentId);
      expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('rejects tampered tracking token', () => {
      const incidentId = '123e4567-e89b-12d3-a456-426614174000';
      const token = generateTrackingToken(incidentId);
      // Tamper signature by changing the last character
      const lastChar = token.slice(-1);
      const replacedChar = lastChar === 'x' ? 'y' : 'x';
      const tampered = token.slice(0, -1) + replacedChar;

      const verified = verifyTrackingToken(tampered);
      expect(verified).toBeNull();
    });

    it('rejects malformed tracking token format', () => {
      expect(verifyTrackingToken('not-a-token')).toBeNull();
      expect(verifyTrackingToken('')).toBeNull();
    });

    it('returns 403 for GET /tracking/:token with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tracking/invalid.token.here',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_TRACKING_TOKEN');
    });
  });
});

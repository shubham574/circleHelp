import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';
import { runPrivacyRetentionJob } from '../jobs/purge-privacy-retention.js';

describe('Reports, Strikes, Metrics & Privacy Retention (Milestones 9, 13 & 14)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Reports API', () => {
    it('rejects POST /reports when unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        payload: {
          reportedUserId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'harassment',
          description: 'User exhibited unsafe behavior during response',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /reports with invalid reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          reportedUserId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'invalid_reason_string',
          description: 'This is a description with more than ten characters',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects POST /reports with too short description (<10 chars)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/reports',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          reportedUserId: '123e4567-e89b-12d3-a456-426614174000',
          reason: 'harassment',
          description: 'too short', // < 10 chars
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Strikes API', () => {
    it('rejects POST /strikes/:userId when unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/strikes/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          reason: 'Violated safety protocols',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /strikes/:userId with empty reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/strikes/123e4567-e89b-12d3-a456-426614174000',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          reason: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Metrics API', () => {
    it('returns system metrics for GET /metrics without auth requirement', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('incidents');
      expect(body.data).toHaveProperty('responsePerformance');
      expect(body.data).toHaveProperty('communities');
      expect(typeof body.data.incidents.total).toBe('number');
    });

    it('rejects POST /metrics/feedback/:id when unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/metrics/feedback/123e4567-e89b-12d3-a456-426614174000',
        payload: {
          rating: 5,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('rejects POST /metrics/feedback/:id with invalid rating (>5)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/metrics/feedback/123e4567-e89b-12d3-a456-426614174000',
        headers: {
          authorization: 'Bearer mock_token_test_user_01',
        },
        payload: {
          rating: 10, // Invalid: max 5
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Privacy Retention Worker (Milestone 14)', () => {
    it('executes privacy retention cleanup safely without errors', async () => {
      const result = await runPrivacyRetentionJob();
      expect(result).toHaveProperty('responderLocationsPurged');
      expect(result).toHaveProperty('oldIncidentLocationsPurged');
      expect(typeof result.responderLocationsPurged).toBe('number');
      expect(typeof result.oldIncidentLocationsPurged).toBe('number');
    });
  });
});

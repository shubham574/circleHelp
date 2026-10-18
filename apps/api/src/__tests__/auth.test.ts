import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import type { FastifyInstance } from 'fastify';
import { verifyFirebaseToken } from '../services/firebase.js';

describe('Firebase Auth Token Verifier', () => {
  it('parses mock development token correctly', async () => {
    const token = 'mock_token_test_user_123';
    const decoded = await verifyFirebaseToken(token);
    expect(decoded.uid).toBe('test_user_123');
    expect(decoded.email).toBe('test_user_123@example.com');
  });

  it('rejects invalid token when no Firebase credentials are configured', async () => {
    await expect(verifyFirebaseToken('invalid_token')).rejects.toThrow();
  });
});

describe('Auth & Profile Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects GET /users/me when Authorization header is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users/me',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects GET /users/me when token format is not Bearer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: {
        authorization: 'Basic mock_token_123',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns USER_NOT_REGISTERED when token is valid but user record does not exist in DB', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: {
        authorization: 'Bearer mock_token_non_existent_user_99999',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('USER_NOT_REGISTERED');
  });

  it('rejects POST /auth/register with invalid phone format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: {
        authorization: 'Bearer mock_token_new_user_1',
      },
      payload: {
        displayName: 'John Doe',
        phone: '1234567890', // Missing + country code
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects POST /devices when unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/devices',
      payload: {
        fcmToken: 'test_token',
        platform: 'android',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

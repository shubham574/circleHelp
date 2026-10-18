import { describe, it, expect } from 'vitest';
import { buildApp } from '../server.js';

describe('Health routes', () => {
  it('GET /health returns ok status and metadata', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('nearhelp-api');
    expect(body.version).toBe('0.1.0');
    expect(body.timestamp).toBeDefined();

    await app.close();
  });

  it('GET /health/ready returns service readiness checks', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.checks.database).toBe('ok');
    expect(body.checks.pgBoss).toBe('ok');

    await app.close();
  });
});

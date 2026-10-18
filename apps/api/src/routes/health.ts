import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nearhelp-api',
      version: '0.1.0',
    });
  });

  app.get('/ready', async (_request, reply) => {
    // TODO: Check DB connectivity, pg-boss status
    return reply.send({
      status: 'ok',
      checks: {
        database: 'ok',
        pgBoss: 'ok',
      },
    });
  });
};

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import pino from 'pino';

export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
  });

  // CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: config.API_HOST,
      port: config.API_PORT,
    });
    logger.info(`🚀 NearHelp API running on ${config.API_HOST}:${config.API_PORT}`);
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { deviceRoutes } from './routes/devices.js';
import { communityRoutes } from './routes/communities.js';
import { initFirebase } from './services/firebase.js';
import pino from 'pino';

// Standalone logger for non-request logs, migrations, and scripts
export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export async function buildApp() {
  // Initialize Firebase Admin (mock-capable in non-prod)
  initFirebase();

  const app = Fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.LOG_LEVEL,
            transport:
              config.NODE_ENV === 'development'
                ? { target: 'pino-pretty', options: { colorize: true } }
                : undefined,
          },
  });

  // CORS
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(deviceRoutes, { prefix: '/devices' });
  await app.register(communityRoutes, { prefix: '/communities' });

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

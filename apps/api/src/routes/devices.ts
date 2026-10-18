import type { FastifyPluginAsync } from 'fastify';
import { registerDeviceSchema } from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { devices } from '../db/schema.js';

export const deviceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /devices
   * Register or update user device FCM push token
   */
  app.post('/', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = registerDeviceSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid device registration data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { fcmToken, platform } = parseResult.data;

    const [device] = await db
      .insert(devices)
      .values({
        userId: currentUser.id,
        fcmToken,
        platform,
      })
      .onConflictDoUpdate({
        target: devices.fcmToken,
        set: {
          userId: currentUser.id,
          platform,
          updatedAt: new Date(),
        },
      })
      .returning();

    return reply.status(200).send({
      success: true,
      data: {
        device,
      },
    });
  });
};

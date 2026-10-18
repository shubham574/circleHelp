import type { FastifyPluginAsync } from 'fastify';
import { updateAvailabilitySchema, locationUpdateSchema } from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { availability, communityMembers } from '../db/schema.js';
import { updateUserLocation } from '../db/geo.js';
import { eq, and } from 'drizzle-orm';

export const availabilityRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /availability
   * Toggle availability ON or OFF.
   * Privacy Rule 3: When toggling OFF, location coordinates are immediately set to NULL.
   */
  app.post('/', async (request, reply) => {
    // 1. Validate request body with Zod
    const parseResult = updateAvailabilitySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid availability update data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const currentUser = request.user!;
    const { communityId, isAvailable, location } = parseResult.data;

    // 2. Enforce membership check: User must be an approved community member
    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!membership || membership.status !== 'approved') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'MEMBERSHIP_NOT_APPROVED',
          message: 'You must be an approved community member to toggle availability',
        },
      });
    }

    // 3. Atomically upsert availability and location (or set location to NULL if offline)
    await updateUserLocation({
      userId: currentUser.id,
      communityId,
      isAvailable,
      location: isAvailable ? location : null,
    });

    return reply.send({
      success: true,
      data: {
        communityId,
        isAvailable,
        location: isAvailable && location ? location : null,
        updatedAt: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /availability/:communityId
   * Retrieve the caller's current availability status for a community
   */
  app.get('/:communityId', async (request, reply) => {
    const { communityId } = request.params as { communityId: string };
    const currentUser = request.user!;

    const [status] = await db
      .select({
        isAvailable: availability.isAvailable,
        location: availability.location,
        updatedAt: availability.updatedAt,
      })
      .from(availability)
      .where(
        and(
          eq(availability.communityId, communityId),
          eq(availability.userId, currentUser.id)
        )
      )
      .limit(1);

    return reply.send({
      success: true,
      data: {
        communityId,
        isAvailable: status?.isAvailable || false,
        location: status?.isAvailable ? status?.location : null,
        updatedAt: status?.updatedAt || null,
      },
    });
  });

  /**
   * POST /availability/location
   * Periodic background location heartbeat from mobile foreground service.
   * Distance filter: ~100m. Only updates if the user is currently available.
   */
  app.post('/location', async (request, reply) => {
    const parseResult = locationUpdateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid location heartbeat payload',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const currentUser = request.user!;
    const { communityId, location } = parseResult.data;

    // Check if user is currently marked available
    const [currentStatus] = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.communityId, communityId),
          eq(availability.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!currentStatus || !currentStatus.isAvailable) {
      return reply.send({
        success: true,
        message: 'Heartbeat ignored: user is currently marked unavailable',
      });
    }

    await updateUserLocation({
      userId: currentUser.id,
      communityId,
      isAvailable: true,
      location,
    });

    return reply.send({
      success: true,
      data: {
        location,
        updatedAt: new Date().toISOString(),
      },
    });
  });
};

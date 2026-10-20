import type { FastifyPluginAsync } from 'fastify';
import {
  createIncidentSchema,
  respondToIncidentSchema,
  resolveIncidentSchema,
  estimateETA,
  haversineDistance,
  geoPointSchema,
} from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import {
  incidents,
  incidentResponders,
  incidentEvents,
  communityMembers,
  users,
} from '../db/schema.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import {
  findNearbyResponders,
  updateResponderLocation,
  purgeClosedIncidentResponderLocations,
} from '../db/geo.js';
import { sendMulticastNotification } from '../services/notifications.js';
import { emitToCommunity, emitToIncident } from '../socket/index.js';
import { config } from '../config.js';
import { z } from 'zod';

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /incidents
   * Trigger SOS Emergency and fan out notifications to nearby responders.
   */
  app.post('/', async (request, reply) => {
    const currentUser = request.user!;

    // 1. Validate request body
    const parseResult = createIncidentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid incident payload',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { communityId, category, location, description, isDrill } = parseResult.data;

    // 2. Validate membership: User must be an approved member
    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, currentUser.id),
          eq(communityMembers.status, 'approved')
        )
      )
      .limit(1);

    if (!membership) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be an approved member of this community to trigger SOS',
        },
      });
    }

    // 3. Enforce SOS Rate Limit (e.g. max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(incidents)
      .where(
        and(
          eq(incidents.reporterId, currentUser.id),
          sql`${incidents.createdAt} >= ${oneHourAgo}`
        )
      );

    if (recentCount && recentCount.count >= (config.SOS_RATE_LIMIT_PER_HOUR || 3)) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'You have exceeded the maximum SOS alerts allowed per hour',
        },
      });
    }

    // 4. Create Incident record
    const defaultRadius = config.SOS_DEFAULT_RADIUS_METERS || 1000;
    const [incident] = await db
      .insert(incidents)
      .values({
        communityId,
        reporterId: currentUser.id,
        category,
        status: 'active',
        location: { lng: location.lng, lat: location.lat },
        radiusM: defaultRadius,
        isDrill: isDrill || false,
        description: description || null,
      })
      .returning();

    if (!incident) {
      return reply.status(500).send({
        success: false,
        error: { code: 'CREATION_FAILED', message: 'Failed to create incident' },
      });
    }

    // 5. Create immutable audit event
    await db.insert(incidentEvents).values({
      incidentId: incident.id,
      eventType: 'sos_triggered',
      actorId: currentUser.id,
      metadata: {
        category,
        location,
        isDrill: isDrill || false,
      },
    });

    // 6. Find nearby active responders via PostGIS GiST query
    let nearbyResponders: Awaited<ReturnType<typeof findNearbyResponders>> = [];
    try {
      nearbyResponders = await findNearbyResponders({
        incidentLng: location.lng,
        incidentLat: location.lat,
        communityId,
        radiusMeters: defaultRadius,
        excludeUserId: currentUser.id,
        maxStalenessMinutes: config.LOCATION_STALENESS_MINUTES || 5,
      });
    } catch (err) {
      request.log.error(err, 'Failed to query nearby responders');
    }

    // 7. Insert notified responders into incident_responders
    if (nearbyResponders.length > 0) {
      await db.insert(incidentResponders).values(
        nearbyResponders.map((r) => ({
          incidentId: incident.id,
          userId: r.userId,
          status: 'notified' as const,
        }))
      );

      // Audit event for fan-out
      await db.insert(incidentEvents).values({
        incidentId: incident.id,
        eventType: 'responders_notified',
        actorId: currentUser.id,
        metadata: {
          responderCount: nearbyResponders.length,
          radiusM: defaultRadius,
        },
      });

      // 8. Send High-Priority FCM Push Notifications
      const fcmTokens = nearbyResponders
        .map((r) => r.fcmToken)
        .filter((t): t is string => Boolean(t));

      if (fcmTokens.length > 0) {
        sendMulticastNotification({
          tokens: fcmTokens,
          title: isDrill
            ? '⚠️ DRILL ALERT: NearHelp Community Exercise'
            : `🚨 EMERGENCY: ${category.toUpperCase()} Help Needed!`,
          body: `${currentUser.displayName} triggered an SOS nearby. Tap to respond!`,
          data: {
            incidentId: incident.id,
            communityId,
            category,
            isDrill: String(isDrill),
          },
          priority: 'high',
        }).catch((err) => request.log.error(err, 'Push notification broadcast failed'));
      }
    }

    // 9. Real-time broadcast via Socket.IO
    emitToCommunity(communityId, 'incident:created', {
      incident: {
        ...incident,
        reporterName: currentUser.displayName,
        responderCount: nearbyResponders.length,
        acceptedCount: 0,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        incident,
        notifiedRespondersCount: nearbyResponders.length,
      },
    });
  });

  /**
   * GET /incidents/active
   * Fetch active incidents in user's communities or reported by user.
   */
  app.get('/active', async (request, reply) => {
    const currentUser = request.user!;

    // Find communities the user belongs to
    const userCommunities = await db
      .select({ communityId: communityMembers.communityId })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.userId, currentUser.id),
          eq(communityMembers.status, 'approved')
        )
      );

    const commIds = userCommunities.map((c) => c.communityId);

    if (commIds.length === 0) {
      return reply.send({
        success: true,
        data: { incidents: [] },
      });
    }

    const activeList = await db
      .select({
        id: incidents.id,
        communityId: incidents.communityId,
        reporterId: incidents.reporterId,
        category: incidents.category,
        status: incidents.status,
        location: incidents.location,
        radiusM: incidents.radiusM,
        isDrill: incidents.isDrill,
        description: incidents.description,
        createdAt: incidents.createdAt,
        reporterName: users.displayName,
      })
      .from(incidents)
      .leftJoin(users, eq(users.id, incidents.reporterId))
      .where(
        and(
          eq(incidents.status, 'active'),
          inArray(incidents.communityId, commIds)
        )
      )
      .orderBy(desc(incidents.createdAt));

    return reply.send({
      success: true,
      data: {
        incidents: activeList,
      },
    });
  });

  /**
   * GET /incidents/:id
   * Fetch incident details with responders list.
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [incident] = await db
      .select({
        id: incidents.id,
        communityId: incidents.communityId,
        reporterId: incidents.reporterId,
        category: incidents.category,
        status: incidents.status,
        location: incidents.location,
        radiusM: incidents.radiusM,
        isDrill: incidents.isDrill,
        description: incidents.description,
        createdAt: incidents.createdAt,
        resolvedAt: incidents.resolvedAt,
        cancelledAt: incidents.cancelledAt,
        reporterName: users.displayName,
      })
      .from(incidents)
      .leftJoin(users, eq(users.id, incidents.reporterId))
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident not found',
        },
      });
    }

    // Fetch responders
    const respondersList = await db
      .select({
        userId: incidentResponders.userId,
        status: incidentResponders.status,
        location: incidentResponders.location,
        notifiedAt: incidentResponders.notifiedAt,
        acceptedAt: incidentResponders.acceptedAt,
        arrivedAt: incidentResponders.arrivedAt,
        displayName: users.displayName,
      })
      .from(incidentResponders)
      .innerJoin(users, eq(users.id, incidentResponders.userId))
      .where(eq(incidentResponders.incidentId, id));

    // Calculate distance and ETA for accepted responders
    const formattedResponders = respondersList.map((r) => {
      let distanceMeters: number | null = null;
      let etaMinutes: number | null = null;

      if (r.location && incident.location) {
        distanceMeters = Math.round(
          haversineDistance(
            { lng: r.location.lng, lat: r.location.lat },
            { lng: incident.location.lng, lat: incident.location.lat }
          )
        );
        etaMinutes = estimateETA(distanceMeters);
      }

      return {
        userId: r.userId,
        displayName: r.displayName,
        status: r.status,
        location: r.location,
        distanceMeters,
        etaMinutes,
        acceptedAt: r.acceptedAt,
        arrivedAt: r.arrivedAt,
      };
    });

    return reply.send({
      success: true,
      data: {
        incident,
        responders: formattedResponders,
      },
    });
  });

  /**
   * POST /incidents/:id/respond
   * Accept, decline, mark arrived, or cancel response.
   */
  app.post('/:id/respond', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const parseResult = respondToIncidentSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid response action',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { action, location } = parseResult.data;

    // Check incident status
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
      });
    }

    if (incident.status !== 'active') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INCIDENT_NOT_ACTIVE',
          message: 'Cannot respond to an incident that is no longer active',
        },
      });
    }

    const now = new Date();
    const updateValues: Partial<typeof incidentResponders.$inferInsert> = {
      updatedAt: now,
    };

    if (action === 'accept') {
      updateValues.status = 'accepted';
      updateValues.acceptedAt = now;
      if (location) updateValues.location = location;
    } else if (action === 'arrived') {
      updateValues.status = 'arrived';
      updateValues.arrivedAt = now;
      if (location) updateValues.location = location;
    } else if (action === 'decline') {
      updateValues.status = 'declined';
    } else if (action === 'cancel') {
      updateValues.status = 'cancelled';
      updateValues.location = null;
    }

    // Upsert response
    await db
      .insert(incidentResponders)
      .values({
        incidentId: id,
        userId: currentUser.id,
        status: updateValues.status!,
        acceptedAt: updateValues.acceptedAt,
        arrivedAt: updateValues.arrivedAt,
        location: updateValues.location,
      })
      .onConflictDoUpdate({
        target: [incidentResponders.incidentId, incidentResponders.userId],
        set: updateValues,
      });

    // Audit event
    await db.insert(incidentEvents).values({
      incidentId: id,
      eventType: `responder_${action}`,
      actorId: currentUser.id,
      metadata: { action, location },
    });

    // Real-time notification via Socket.IO
    if (action === 'accept') {
      emitToIncident(id, 'responder:accepted', {
        incidentId: id,
        responder: {
          userId: currentUser.id,
          displayName: currentUser.displayName,
          status: 'accepted',
          location: location || null,
          distanceMeters:
            location && incident.location
              ? Math.round(haversineDistance(location, incident.location))
              : null,
          etaMinutes:
            location && incident.location
              ? estimateETA(Math.round(haversineDistance(location, incident.location)))
              : null,
          acceptedAt: now.toISOString(),
        },
      });
    } else if (action === 'arrived') {
      emitToIncident(id, 'responder:arrived', {
        incidentId: id,
        userId: currentUser.id,
      });
    }

    return reply.send({
      success: true,
      data: {
        action,
        status: updateValues.status,
      },
    });
  });

  /**
   * POST /incidents/:id/location
   * Live GPS update from accepted responder.
   */
  app.post('/:id/location', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const parseResult = z.object({ location: geoPointSchema }).safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid location coordinates' },
      });
    }

    const { location } = parseResult.data;

    // Verify user is an accepted responder
    const [responder] = await db
      .select()
      .from(incidentResponders)
      .where(
        and(
          eq(incidentResponders.incidentId, id),
          eq(incidentResponders.userId, currentUser.id),
          eq(incidentResponders.status, 'accepted')
        )
      )
      .limit(1);

    if (!responder) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only accepted responders can send live location updates',
        },
      });
    }

    await updateResponderLocation({
      incidentId: id,
      userId: currentUser.id,
      location,
    });

    emitToIncident(id, 'responder:location', {
      incidentId: id,
      userId: currentUser.id,
      location,
    });

    return reply.send({ success: true });
  });

  /**
   * POST /incidents/:id/expand-radius
   * Expand search radius to 2000m (e.g. after delay or low responder count).
   */
  app.post('/:id/expand-radius', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident || incident.status !== 'active') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_INCIDENT', message: 'Incident not active or not found' },
      });
    }

    const expandRadius = config.SOS_EXPAND_RADIUS_METERS || 2000;
    if (incident.radiusM >= expandRadius) {
      return reply.send({
        success: true,
        message: 'Radius is already expanded',
        radiusM: incident.radiusM,
      });
    }

    // Update radius
    await db
      .update(incidents)
      .set({ radiusM: expandRadius })
      .where(eq(incidents.id, id));

    // Audit event
    await db.insert(incidentEvents).values({
      incidentId: id,
      eventType: 'radius_expanded',
      actorId: currentUser.id,
      metadata: { previousRadiusM: incident.radiusM, newRadiusM: expandRadius },
    });

    // Query responders in new radius
    if (incident.location) {
      const newlyFound = await findNearbyResponders({
        incidentLng: incident.location.lng,
        incidentLat: incident.location.lat,
        communityId: incident.communityId,
        radiusMeters: expandRadius,
        excludeUserId: incident.reporterId ?? undefined,
      });

      // Insert new ones
      for (const r of newlyFound) {
        await db
          .insert(incidentResponders)
          .values({
            incidentId: id,
            userId: r.userId,
            status: 'notified',
          })
          .onConflictDoNothing();
      }

      // Notify new responders
      const tokens = newlyFound
        .map((r) => r.fcmToken)
        .filter((t): t is string => Boolean(t));

      if (tokens.length > 0) {
        sendMulticastNotification({
          tokens,
          title: `🚨 EMERGENCY (EXPANDED): ${incident.category.toUpperCase()} Help Needed!`,
          body: 'Emergency area expanded to your vicinity. Can you help?',
          data: { incidentId: id, category: incident.category },
          priority: 'high',
        }).catch((err) => request.log.error(err, 'Failed to send expanded radius push'));
      }
    }

    emitToIncident(id, 'incident:radius-expanded', {
      incidentId: id,
      newRadiusM: expandRadius,
    });

    return reply.send({
      success: true,
      data: { newRadiusM: expandRadius },
    });
  });

  /**
   * POST /incidents/:id/cancel
   * Cancel incident (e.g. within 5-sec countdown or false alarm).
   */
  app.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
      });
    }

    if (incident.reporterId !== currentUser.id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the reporter can cancel this SOS' },
      });
    }

    await db
      .update(incidents)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(incidents.id, id));

    // Audit event
    await db.insert(incidentEvents).values({
      incidentId: id,
      eventType: 'incident_cancelled',
      actorId: currentUser.id,
    });

    // Privacy rule: Purge live responder locations immediately
    await purgeClosedIncidentResponderLocations(id);

    emitToIncident(id, 'incident:cancelled', { incidentId: id });
    emitToCommunity(incident.communityId, 'incident:cancelled', { incidentId: id });

    return reply.send({ success: true, message: 'Incident cancelled' });
  });

  /**
   * POST /incidents/:id/resolve
   * Resolve incident (reporter or admin/coordinator).
   */
  app.post('/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const parseResult = resolveIncidentSchema.safeParse(request.body);
    const notes = parseResult.success ? parseResult.data.notes : undefined;

    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found' },
      });
    }

    // Check permission: reporter or community coordinator/admin
    let isAuthorized = incident.reporterId === currentUser.id;
    if (!isAuthorized) {
      const [membership] = await db
        .select()
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, incident.communityId),
            eq(communityMembers.userId, currentUser.id),
            inArray(communityMembers.role, ['admin', 'coordinator'])
          )
        )
        .limit(1);

      if (membership) isAuthorized = true;
    }

    if (!isAuthorized) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the reporter or community admins can resolve an incident',
        },
      });
    }

    await db
      .update(incidents)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(eq(incidents.id, id));

    // Audit event
    await db.insert(incidentEvents).values({
      incidentId: id,
      eventType: 'incident_resolved',
      actorId: currentUser.id,
      metadata: { notes },
    });

    // Privacy Rule: Purge live responder locations immediately upon resolution!
    await purgeClosedIncidentResponderLocations(id);

    emitToIncident(id, 'incident:resolved', { incidentId: id });
    emitToCommunity(incident.communityId, 'incident:resolved', { incidentId: id });

    return reply.send({
      success: true,
      message: 'Incident successfully resolved',
    });
  });
};

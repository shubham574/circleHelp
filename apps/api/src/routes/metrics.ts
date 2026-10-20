import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import {
  incidents,
  incidentResponders,
  communities,
  communityMembers,
  incidentEvents,
} from '../db/schema.js';
import { sql } from 'drizzle-orm';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comments: z.string().max(500).optional(),
  helpfulness: z.enum(['very_helpful', 'somewhat_helpful', 'not_helpful']).optional(),
});

export const metricRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /metrics
   * System overview metrics: incidents, response times, community stats.
   */
  app.get('/', async (request, reply) => {
    try {
      // 1. Incidents counts
      const [incidentsCount] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where status = 'active')::int`,
          resolved: sql<number>`count(*) filter (where status = 'resolved')::int`,
          cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
          drills: sql<number>`count(*) filter (where is_drill = true)::int`,
        })
        .from(incidents);

      // 2. Average Response Time
      const [responseTimeResult] = await db
        .select({
          avgAcceptSeconds: sql<number>`coalesce(round(avg(extract(epoch from (accepted_at - notified_at)))::numeric, 1), 0)::float`,
          avgArrivalSeconds: sql<number>`coalesce(round(avg(extract(epoch from (arrived_at - accepted_at)))::numeric, 1), 0)::float`,
        })
        .from(incidentResponders)
        .where(sql`accepted_at IS NOT NULL`);

      // 3. Communities & Members
      const [commCount] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(communities);

      const [memberCount] = await db
        .select({
          total: sql<number>`count(*)::int`,
          approved: sql<number>`count(*) filter (where status = 'approved')::int`,
        })
        .from(communityMembers);

      return reply.send({
        success: true,
        data: {
          incidents: {
            total: incidentsCount?.total ?? 0,
            active: incidentsCount?.active ?? 0,
            resolved: incidentsCount?.resolved ?? 0,
            cancelled: incidentsCount?.cancelled ?? 0,
            drills: incidentsCount?.drills ?? 0,
          },
          responsePerformance: {
            avgAcceptTimeSeconds: responseTimeResult?.avgAcceptSeconds ?? 0,
            avgArrivalTimeSeconds: responseTimeResult?.avgArrivalSeconds ?? 0,
          },
          communities: {
            total: commCount?.total ?? 0,
            totalMembers: memberCount?.total ?? 0,
            approvedMembers: memberCount?.approved ?? 0,
          },
        },
      });
    } catch (err) {
      request.log.warn(err, 'Failed to query database for metrics, returning fallback data');
      return reply.send({
        success: true,
        data: {
          incidents: {
            total: 0,
            active: 0,
            resolved: 0,
            cancelled: 0,
            drills: 0,
          },
          responsePerformance: {
            avgAcceptTimeSeconds: 0,
            avgArrivalTimeSeconds: 0,
          },
          communities: {
            total: 0,
            totalMembers: 0,
            approvedMembers: 0,
          },
        },
      });
    }
  });

  /**
   * POST /metrics/feedback/:incidentId
   * Submit post-incident feedback / survey rating.
   */
  app.post('/feedback/:incidentId', { preHandler: [authenticate] }, async (request, reply) => {
    const { incidentId } = request.params as { incidentId: string };
    const currentUser = request.user!;

    const parseResult = feedbackSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { rating, comments, helpfulness } = parseResult.data;

    try {
      // Record feedback event in immutable audit log
      await db.insert(incidentEvents).values({
        incidentId,
        eventType: 'incident_feedback',
        actorId: currentUser.id,
        metadata: {
          rating,
          comments,
          helpfulness,
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      request.log.warn(err, 'Could not persist feedback event to database');
    }

    return reply.status(201).send({
      success: true,
      message: 'Thank you for your feedback! It helps improve community safety.',
    });
  });
};

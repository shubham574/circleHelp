import type { FastifyPluginAsync } from 'fastify';
import {
  createReportSchema,
  resolveReportSchema,
} from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { reports, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /reports
   * File a safety or conduct report against another user.
   */
  app.post('/', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = createReportSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid report data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { reportedUserId, incidentId, reason, description } = parseResult.data;

    // Prevent reporting oneself
    if (reportedUserId === currentUser.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_REPORT_SELF',
          message: 'You cannot file a report against yourself',
        },
      });
    }

    const [created] = await db
      .insert(reports)
      .values({
        reporterId: currentUser.id,
        reportedUserId,
        incidentId: incidentId || null,
        reason,
        description,
        status: 'pending',
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: {
        report: created,
      },
    });
  });

  /**
   * GET /reports
   * List reports for administration / review.
   */
  app.get('/', async (_request, reply) => {
    const list = await db
      .select({
        id: reports.id,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        adminNotes: reports.adminNotes,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
        reporterName: users.displayName,
        reporterId: reports.reporterId,
        reportedUserId: reports.reportedUserId,
        incidentId: reports.incidentId,
      })
      .from(reports)
      .leftJoin(users, eq(users.id, reports.reporterId))
      .orderBy(desc(reports.createdAt));

    return reply.send({
      success: true,
      data: {
        reports: list,
      },
    });
  });

  /**
   * PATCH /reports/:id
   * Resolve or dismiss a report.
   */
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const parseResult = resolveReportSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid report resolution payload',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { status, adminNotes } = parseResult.data;

    const [updated] = await db
      .update(reports)
      .set({
        status,
        adminNotes: adminNotes || null,
        resolvedAt: new Date(),
      })
      .where(eq(reports.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        report: updated,
      },
    });
  });
};

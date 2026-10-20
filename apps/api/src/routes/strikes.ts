import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { userStrikes, communityMembers } from '../db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import { DEFAULTS } from '@nearhelp/shared';

const issueStrikeSchema = z.object({
  reason: z.string().min(5).max(500).trim(),
});

export const strikeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /strikes/:userId
   * Issue a strike to a user. If strikes >= AUTO_BAN_STRIKE_THRESHOLD (3),
   * automatically ban user across all communities.
   */
  app.post('/:userId', async (request, reply) => {
    const { userId: targetUserId } = request.params as { userId: string };
    const currentUser = request.user!;

    const parseResult = issueStrikeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reason must be between 5 and 500 characters',
        },
      });
    }

    const { reason } = parseResult.data;

    // Insert new strike
    const [strike] = await db
      .insert(userStrikes)
      .values({
        userId: targetUserId,
        reason,
        issuedBy: currentUser.id,
      })
      .returning();

    // Count total strikes for this user
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userStrikes)
      .where(eq(userStrikes.userId, targetUserId));

    const totalStrikes = countResult?.count ?? 1;
    let autoBanned = false;

    // Check if auto-ban threshold reached (Rule: 3 strikes = auto-ban)
    if (totalStrikes >= DEFAULTS.AUTO_BAN_STRIKE_THRESHOLD) {
      await db
        .update(communityMembers)
        .set({
          status: 'banned',
          updatedAt: new Date(),
        })
        .where(eq(communityMembers.userId, targetUserId));

      autoBanned = true;
    }

    return reply.status(201).send({
      success: true,
      data: {
        strike,
        totalStrikes,
        threshold: DEFAULTS.AUTO_BAN_STRIKE_THRESHOLD,
        autoBanned,
      },
    });
  });

  /**
   * GET /strikes/:userId
   * List strikes for a specific user.
   */
  app.get('/:userId', async (request, reply) => {
    const { userId: targetUserId } = request.params as { userId: string };

    const strikesList = await db
      .select()
      .from(userStrikes)
      .where(eq(userStrikes.userId, targetUserId))
      .orderBy(desc(userStrikes.createdAt));

    return reply.send({
      success: true,
      data: {
        strikes: strikesList,
        totalStrikes: strikesList.length,
      },
    });
  });
};

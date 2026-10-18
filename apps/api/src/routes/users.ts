import type { FastifyPluginAsync } from 'fastify';
import { updateProfileSchema } from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { users, communityMembers, communities } from '../db/schema.js';
import { eq, and, ne } from 'drizzle-orm';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Apply authenticate middleware to all user routes
  app.addHook('preHandler', authenticate);

  /**
   * GET /users/me
   * Retrieve the current user's profile and active communities
   */
  app.get('/me', async (request, reply) => {
    const currentUser = request.user!;

    // Fetch user's communities
    const memberships = await db
      .select({
        communityId: communities.id,
        name: communities.name,
        role: communityMembers.role,
        status: communityMembers.status,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(communities, eq(communities.id, communityMembers.communityId))
      .where(eq(communityMembers.userId, currentUser.id));

    return reply.send({
      success: true,
      data: {
        user: {
          id: currentUser.id,
          displayName: currentUser.displayName,
          phone: currentUser.phone,
          avatarUrl: currentUser.avatarUrl,
          createdAt: currentUser.createdAt,
        },
        communities: memberships,
      },
    });
  });

  /**
   * PATCH /users/me
   * Update current user profile
   */
  app.patch('/me', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid profile update data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { displayName, phone, avatarUrl } = parseResult.data;

    // Check phone uniqueness if updating phone
    if (phone) {
      const [existingPhone] = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), ne(users.id, currentUser.id)))
        .limit(1);

      if (existingPhone) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'PHONE_ALREADY_IN_USE',
            message: 'This phone number is already used by another account',
          },
        });
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, currentUser.id))
      .returning();

    return reply.send({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  });
};

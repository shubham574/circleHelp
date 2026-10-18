import type { FastifyPluginAsync } from 'fastify';
import {
  createCommunitySchema,
  joinCommunitySchema,
  updateMemberSchema,
} from '@nearhelp/shared';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { communities, communityMembers, users } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';

// Uppercase alphanumeric 8-character invite code (easy to read and share)
const generateInviteCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 8);

export const communityRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  /**
   * POST /communities
   * Create a new verified community (e.g., housing society, campus, colony).
   * Creator is automatically assigned as 'admin' with 'approved' status.
   */
  app.post('/', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = createCommunitySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid community data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { name, description, location, radiusM } = parseResult.data;
    const inviteCode = generateInviteCode();

    const [community] = await db
      .insert(communities)
      .values({
        name,
        description: description || null,
        inviteCode,
        location: { lng: location.lng, lat: location.lat },
        radiusM: radiusM || 5000,
        createdBy: currentUser.id,
      })
      .returning();

    if (!community) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'COMMUNITY_CREATION_FAILED',
          message: 'Failed to create community',
        },
      });
    }

    // Add creator as approved admin
    await db.insert(communityMembers).values({
      userId: currentUser.id,
      communityId: community.id,
      role: 'admin',
      status: 'approved',
    });

    return reply.status(201).send({
      success: true,
      data: {
        community,
      },
    });
  });

  /**
   * GET /communities/:id
   * Fetch community details, member count, and current user's membership status.
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    const [community] = await db
      .select()
      .from(communities)
      .where(eq(communities.id, id))
      .limit(1);

    if (!community) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'Community not found',
        },
      });
    }

    // Fetch caller's membership status
    const [membership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    // Count approved members
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.status, 'approved')
        )
      );

    return reply.send({
      success: true,
      data: {
        community: {
          ...community,
          memberCount: countResult?.count || 0,
        },
        membership: membership || null,
      },
    });
  });

  /**
   * POST /communities/join
   * Request to join a community via invite code.
   * Membership defaults to 'pending' and requires admin/coordinator approval.
   */
  app.post('/join', async (request, reply) => {
    const currentUser = request.user!;

    const parseResult = joinCommunitySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid invite code format',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { inviteCode } = parseResult.data;

    // Find community by invite code (case-insensitive)
    const [community] = await db
      .select()
      .from(communities)
      .where(sql`upper(${communities.inviteCode}) = upper(${inviteCode.trim()})`)
      .limit(1);

    if (!community) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'INVALID_INVITE_CODE',
          message: 'No community found with this invite code',
        },
      });
    }

    // Check existing membership
    const [existing] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, community.id),
          eq(communityMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'banned') {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'MEMBER_BANNED',
            message: 'You have been banned from this community',
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          community,
          membership: existing,
          alreadyMember: true,
        },
      });
    }

    // Insert pending membership
    const [newMembership] = await db
      .insert(communityMembers)
      .values({
        userId: currentUser.id,
        communityId: community.id,
        role: 'member',
        status: 'pending',
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: {
        community,
        membership: newMembership,
        alreadyMember: false,
      },
    });
  });

  /**
   * GET /communities/:id/members
   * List community members with statuses and roles.
   * Requires caller to be an approved member, coordinator, or admin.
   */
  app.get('/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUser = request.user!;

    // Check authorization: must be approved member or admin
    const [callerMembership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, id),
          eq(communityMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!callerMembership || callerMembership.status !== 'approved') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be an approved member to view community members',
        },
      });
    }

    const membersList = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: communityMembers.role,
        status: communityMembers.status,
        joinedAt: communityMembers.joinedAt,
      })
      .from(communityMembers)
      .innerJoin(users, eq(users.id, communityMembers.userId))
      .where(eq(communityMembers.communityId, id))
      .orderBy(desc(communityMembers.joinedAt));

    return reply.send({
      success: true,
      data: {
        members: membersList,
        canManage: callerMembership.role === 'admin' || callerMembership.role === 'coordinator',
      },
    });
  });

  /**
   * PATCH /communities/:id/members/:userId
   * Approve, reject, ban, or change roles of members.
   * Requires caller to be an admin or coordinator.
   */
  app.patch('/:id/members/:userId', async (request, reply) => {
    const { id: communityId, userId: targetUserId } = request.params as {
      id: string;
      userId: string;
    };
    const currentUser = request.user!;

    // 1. Validate request body first with Zod
    const parseResult = updateMemberSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid member update data',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    // 2. Check caller role
    const [callerMembership] = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (
      !callerMembership ||
      callerMembership.status !== 'approved' ||
      (callerMembership.role !== 'admin' && callerMembership.role !== 'coordinator')
    ) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only community admins or coordinators can manage memberships',
        },
      });
    }

    const { status, role } = parseResult.data;

    // Coordinators cannot promote users to admin
    if (callerMembership.role === 'coordinator' && role === 'admin') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Coordinators cannot assign the admin role',
        },
      });
    }

    const updateFields: Partial<typeof communityMembers.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (status !== undefined) updateFields.status = status;
    if (role !== undefined) updateFields.role = role;

    const [updated] = await db
      .update(communityMembers)
      .set(updateFields)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.userId, targetUserId)
        )
      )
      .returning();

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found in this community',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        membership: updated,
      },
    });
  });
};

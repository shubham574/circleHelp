import type { FastifyPluginAsync } from 'fastify';
import { registerSchema } from '@nearhelp/shared';
import { authenticateRegistration } from '../middleware/auth.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /auth/register
   * Completes NearHelp registration after Firebase Auth sign-up.
   */
  app.post('/register', { preHandler: [authenticateRegistration] }, async (request, reply) => {
    // 1. Validate request body FIRST (Rule 2: Validate all input with Zod)
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration details',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const firebaseUser = request.firebaseUser!;
    const { displayName, phone } = parseResult.data;

    // 2. Check if user already registered
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUser.uid))
      .limit(1);

    if (existing) {
      return reply.status(200).send({
        success: true,
        data: {
          user: existing,
          isNew: false,
        },
      });
    }

    // 3. Check if phone number is already registered to another user
    if (phone) {
      const [existingPhone] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (existingPhone) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'PHONE_ALREADY_IN_USE',
            message: 'This phone number is already associated with another account',
          },
        });
      }
    }

    const [newUser] = await db
      .insert(users)
      .values({
        firebaseUid: firebaseUser.uid,
        displayName: displayName || firebaseUser.name || 'Anonymous User',
        phone: phone || null,
        avatarUrl: firebaseUser.picture || null,
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: {
        user: newUser,
        isNew: true,
      },
    });
  });
};
